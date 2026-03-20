import { tiingoFetcher } from './tiingoFetcher.js';
import { PositionModel } from '../schemas/portfolio.js';
import { logger } from '../core/logger.js';
import { DateTime } from 'luxon';

/**
 * ===================================
 * 股票数据与自选股服务 (完整功能版)
 * ===================================
 */

export class StockService {
  /**
   * 获取历史 K 线数据 (主要用于分析)
   */
  async getHistoryData(symbol: string, days: number = 60) {
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
   * 获取所有自选股代码列表
   */
  async getWatchlistSymbols(): Promise<string[]> {
    try {
      const positions = await PositionModel.find({}, { symbol: 1 });
      return positions.map(p => p.symbol);
    } catch (e) {
      logger.error(`[DB] 获取自选股列表失败: ${e}`);
      return [];
    }
  }

  /**
   * 获取带行情的自选股详情
   */
  async getWatchlistWithQuotes() {
    try {
      const positions = await PositionModel.find().sort({ symbol: 1 });
      const results = [];

      for (const pos of positions) {
        const quote = await tiingoFetcher.getIexQuote(pos.symbol);
        results.push({
          symbol: pos.symbol,
          quantity: pos.quantity,
          avg_cost: pos.avg_cost,
          current_price: quote?.price || pos.last_price || 0,
          change_pct: quote?.change_pct || 0,
          updated_at: pos.updated_at
        });
      }
      return results;
    } catch (e) {
      throw e;
    }
  }

  /**
   * 添加到自选股
   */
  async addToWatchlist(symbol: string) {
    const code = symbol.trim().toUpperCase();
    try {
      const result = await PositionModel.findOneAndUpdate(
        { symbol: code },
        { 
          $set: { symbol: code, updated_at: new Date() },
          $setOnInsert: { quantity: 0, avg_cost: 0 } 
        },
        { upsert: true, new: true }
      );
      return result;
    } catch (e) {
      throw e;
    }
  }

  /**
   * 移除自选股
   */
  async removeFromWatchlist(symbol: string) {
    const code = symbol.trim().toUpperCase();
    try {
      await PositionModel.deleteOne({ symbol: code });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const stockService = new StockService();
