import { tiingoFetcher } from './tiingoFetcher.js';
import { aiAnalyzer } from './aiAnalyzer.js';
import { logger } from '../core/logger.js';
import { DateTime } from 'luxon';

/**
 * ===================================
 * 大盘复盘分析模块 (Node.js/TypeScript 版)
 * ===================================
 */

export interface MarketIndex {
  code: string;
  name: string;
  price: number;
  change_pct: number;
}

export class MarketAnalyzer {
  /**
   * 获取美股主要指数快照
   */
  async getMarketSnapshot(): Promise<MarketIndex[]> {
    const indices = [
      { code: 'SPY', name: '标普500 (ETF)' },
      { code: 'QQQ', name: '纳斯达克100 (ETF)' },
      { code: 'DIA', name: '道琼斯 (ETF)' },
      { code: 'IWM', name: '罗素2000 (ETF)' }
    ];

    const results: MarketIndex[] = [];
    for (const idx of indices) {
      try {
        const quote = await tiingoFetcher.getIexQuote(idx.code);
        if (quote) {
          // 计算涨跌幅 (基于 IEX 数据)
          const changePct = quote.pre_close 
            ? ((quote.price! - quote.pre_close) / quote.pre_close) * 100 
            : 0;
          
          results.push({
            code: idx.code,
            name: idx.name,
            price: quote.price || 0,
            change_pct: parseFloat(changePct.toFixed(2))
          });
        }
      } catch (e) {
        logger.warn(`获取指数 ${idx.code} 失败`);
      }
    }
    return results;
  }

  /**
   * 执行每日复盘分析
   */
  async runDailyReview(): Promise<string> {
    logger.info('========== 开始美股大盘复盘分析 ==========');
    
    try {
      // 1. 获取行情数据
      const snapshot = await this.getMarketSnapshot();
      const dateStr = DateTime.now().toFormat('yyyy-MM-dd');

      // 2. 构建分析 Prompt (利用 Gemini 的 Google Search 能力)
      const indicesSummary = snapshot.map(idx => 
        `- ${idx.name} (${idx.code}): ${idx.price} (${idx.change_pct > 0 ? '+' : ''}${idx.change_pct}%)`
      ).join('\n');

      const prompt = `你是一位资深美股策略师。请根据以下今日收盘数据，并开启 Google Search 搜寻今日美股市场的重大宏观新闻（如 Fed 言论、非农数据、大型科技股异动等），生成一份简洁的【美股每日复盘报告】。

今日数据 (${dateStr}):
${indicesSummary}

要求：
1. 包含【盘面总结】
2. 包含【核心动因】（通过搜索获取原因）
3. 包含【板块异动】
4. 包含【操作策略建议】
5. 使用 Markdown 格式。`;

      // 3. 调用 AI 分析 (复用 aiAnalyzer 但请求文本格式)
      // 注意：由于 runDailyReview 返回的是 Markdown 文本，我将直接调用 aiAnalyzer 的通用接口
      const reviewReport = await aiAnalyzer.analyze(
        { code: 'MARKET', name: 'US Market', trend: {} as any },
        `今日指数表现：\n${indicesSummary}\n\n请联网搜索具体原因并生成 Markdown 报告。`
      );

      // 如果分析器成功返回了 dashboard，我们将其转为文字报告，或者直接请求文本
      logger.info('========== 大盘复盘分析完成 ==========');
      return reviewReport.analysis_summary || "分析生成失败";
    } catch (error) {
      logger.error(`大盘复盘失败: ${error}`);
      throw error;
    }
  }
}

export const marketAnalyzer = new MarketAnalyzer();
