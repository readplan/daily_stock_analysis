import { tiingoFetcher } from './tiingoFetcher.js';
import { fredFetcher } from './fredFetcher.js';
import { searchService } from './searchService.js';
import { stockTrendAnalyzer } from './stockAnalyzer.js';
import { aiAnalyzer, AnalysisResult } from './aiAnalyzer.js';
import { notificationService } from './notificationService.js';
import { AnalysisModel } from '../schemas/analysis.js';
import { logger } from '../core/logger.js';
import { DateTime } from 'luxon';

/**
 * ===================================
 * 分析流水线 (Node.js/TypeScript 版)
 * ===================================
 */

export class AnalysisPipeline {
  /**
   * 处理单只股票分析
   */
  async processSingleStock(code: string): Promise<AnalysisResult> {
    logger.info(`🚀 开始分析股票: ${code}`);

    try {
      // 1. 获取历史数据
      const endDate = DateTime.now().toFormat('yyyy-MM-dd');
      const startDate = DateTime.now().minus({ days: 120 }).toFormat('yyyy-MM-dd');
      const bars = await tiingoFetcher.getHistoricalPrices(code, startDate, endDate);

      // 2. 获取即时新闻与宏观背景
      let intelContext = "";
      
      // 2.1 宏观 (FRED)
      try {
        const fedFunds = await fredFetcher.getSeriesObservations('FEDFUNDS', 1);
        if (fedFunds.length > 0) {
          intelContext += `当前联邦基金利率: ${fedFunds[0].value}% (${fedFunds[0].date})\n`;
        }
      } catch (e) {}

      // 2.2 联网新闻 (Tavily)
      try {
        const news = await searchService.getStockContext(code);
        intelContext += `\n${news}`;
      } catch (e) {
        logger.warn(`获取新闻失败: ${e}`);
      }

      // 3. 技术面趋势分析
      const trendResult = await stockTrendAnalyzer.analyze(bars, code);

      // 4. AI 深度研判
      const analysis = await aiAnalyzer.analyze({
        code,
        name: code,
        trend: trendResult
      }, intelContext);

      // 5. 持久化到 MongoDB
      if (analysis.success) {
        await this.saveToDatabase(analysis);
      }

      logger.info(`✅ 股票 ${code} 分析完成: ${analysis.operation_advice}`);
      return analysis;
    } catch (error) {
      logger.error(`❌ 股票 ${code} 分析失败: ${error}`);
      throw error;
    }
  }

  /**
   * 批量分析自选股并推送报告
   */
  async processBatchAndNotify(codes: string[]): Promise<void> {
    logger.info(`📋 开始批量分析股票: ${codes.join(', ')}`);
    const results: AnalysisResult[] = [];

    for (const code of codes) {
      try {
        const res = await this.processSingleStock(code);
        results.push(res);
      } catch (e) {
        logger.error(`跳过股票 ${code} 由于错误`);
      }
    }

    if (results.length > 0) {
      const report = notificationService.generateDailyReport(results);
      await notificationService.send(report);
    }
  }

  /**
   * 保存到数据库 (Upsert 模式)
   */
  private async saveToDatabase(result: AnalysisResult) {
    const today = DateTime.now().toFormat('yyyy-MM-dd');
    try {
      await AnalysisModel.findOneAndUpdate(
        { code: result.code, date: today },
        { ...result, date: today },
        { upsert: true, new: true }
      );
      logger.debug(`[DB] 成功存储分析记录: ${result.code} (${today})`);
    } catch (e) {
      logger.error(`[DB] 存储失败: ${e}`);
    }
  }
}

export const analysisPipeline = new AnalysisPipeline();
