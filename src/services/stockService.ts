import { tiingoFetcher } from './tiingoFetcher.js';
import { PositionModel } from '../schemas/portfolio.js';
import { logger } from '../core/logger.js';
import { DateTime } from 'luxon';

/**
 * ===================================
 * 股票数据与自选股服务 (Node.js/TypeScript 版)
 * ===================================
 */

export class StockService {
  /**
   * 获取实时行情 (优先从 Tiingo IEX)
   */
  async getRealtimeQuote(symbol: string) {
    try {
      const quote = await tiingoFetcher.getIexQuote(symbol);
      return quote;
    } catch (e) {
      logger.error(`[Stock] 获取实时行情失败: ${e}`);
      return null;
    }
  }

  /**
   * 获取历史 K 线数据
   */
  async getHistoryData(symbol: string, days: number = 30) {
    try {
      const endDate = DateTime.now().toFormat('yyyy-MM-dd');
      const startDate = DateTime.now().minus({ days }).toFormat('yyyy-MM-dd');
      return await tiingoFetcher.getHistoricalPrices(symbol, startDate, endDate);
    } catch (e) {
      logger.error(`[Stock] 获取历史数据失败: ${e}`);
      return [];
    }
  }

  /**
   * 获取所有自选股及其最新行情
   */
  async getWatchlist() {
    try {
      const positions = await PositionModel.find();
      const results = [];

      for (const pos of positions) {
        const quote = await this.getRealtimeQuote(pos.symbol);
        results.push({
          symbol: pos.symbol,
          quantity: pos.quantity,
          avg_cost: pos.avg_cost,
          current_price: quote?.price || pos.last_price,
          change_pct: quote?.change_pct || 0,
          updated_at: pos.updated_at
        });
      }

      return results;
    } catch (e) {
      logger.error(`[Stock] 获取自选股列表失败: ${e}`);
      throw e;
    }
  }

  /**
   * 添加股票到自选股 (无需交易，仅关注)
   */
  async addToWatchlist(symbol: string) {
    try {
      const existing = await PositionModel.findOne({ symbol: symbol.toUpperCase() });
      if (existing) return existing;

      return await PositionModel.create({
        symbol: symbol.toUpperCase(),
        quantity: 0, // 0表示仅关注
        avg_cost: 0
      });
    } catch (e) {
      logger.error(`[Stock] 添加自选股失败: ${e}`);
      throw e;
    }
  }

  /**
   * 从自选股移除
   */
  async removeFromWatchlist(symbol: string) {
    try {
      await PositionModel.deleteOne({ symbol: symbol.toUpperCase() });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const stockService = new StockService();
