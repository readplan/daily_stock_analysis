import { tiingoFetcher } from './tiingoFetcher.js';
import { fredFetcher } from './fredFetcher.js';
import { searchService } from './searchService.js';
import { stockTrendAnalyzer } from './stockAnalyzer.js';
import { aiAnalyzer, AnalysisResult } from './aiAnalyzer.js';
import { notificationService } from './notificationService.js';
import { stockService } from './stockService.js';
import { AnalysisModel } from '../schemas/analysis.js';
import { logger } from '../core/logger.js';
import { DateTime } from 'luxon';
import { config } from '../core/config.js';

/**
 * ===================================
 * 分析流水线 (自动同步 MongoDB)
 * ===================================
 */

export class AnalysisPipeline {
  /**
   * 处理单只股票分析
   */
  async processSingleStock(code: string): Promise<AnalysisResult> {
    logger.info(`🚀 开始分析股票: ${code}`);

    try {
      const endDate = DateTime.now().toFormat('yyyy-MM-dd');
      const startDate = DateTime.now().minus({ days: 120 }).toFormat('yyyy-MM-dd');
      const bars = await tiingoFetcher.getHistoricalPrices(code, startDate, endDate);

      let intelContext = "";
      try {
        const fedFunds = await fredFetcher.getSeriesObservations('FEDFUNDS', 1);
        if (fedFunds.length > 0) {
          intelContext += `当前联邦基金利率: ${fedFunds[0].value}% (${fedFunds[0].date})\n`;
        }
        const news = await searchService.getStockContext(code);
        intelContext += `\n${news}`;
      } catch (e) {}

      const trendResult = await stockTrendAnalyzer.analyze(bars, code);
      const analysis = await aiAnalyzer.analyze({
        code,
        name: code,
        trend: trendResult
      }, intelContext);

      if (analysis.success) {
        await this.saveToDatabase(analysis);
      }

      return analysis;
    } catch (error) {
      logger.error(`❌ 股票 ${code} 分析失败: ${error}`);
      throw error;
    }
  }

  /**
   * 执行每日自动分析任务
   */
  async runDailyAutomatedTask(): Promise<void> {
    // 1. 优先从 MongoDB 获取自选股
    let symbols = await stockService.getWatchlistSymbols();
    
    // 2. 如果数据库为空，使用环境变量兜底
    if (symbols.length === 0) {
      logger.info('ℹ️ 数据库自选股为空，使用配置中的默认列表');
      symbols = config.STOCK_LIST;
    }

    if (symbols.length === 0) return;

    logger.info(`📋 开始执行定时分析任务: ${symbols.join(', ')}`);
    const results: AnalysisResult[] = [];

    for (const code of symbols) {
      try {
        const res = await this.processSingleStock(code);
        results.push(res);
      } catch (e) {
        logger.warn(`跳过 ${code}`);
      }
    }

    if (results.length > 0) {
      await notificationService.pushDailyReport(results);
    }
  }

  private async saveToDatabase(result: AnalysisResult) {
    const today = DateTime.now().toFormat('yyyy-MM-dd');
    try {
      await AnalysisModel.findOneAndUpdate(
        { code: result.code, date: today },
        { ...result, date: today },
        { upsert: true, new: true }
      );
    } catch (e) {
      logger.error(`[DB] 存储失败: ${e}`);
    }
  }
}

export const analysisPipeline = new AnalysisPipeline();
