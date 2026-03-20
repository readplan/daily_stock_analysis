import { tiingoFetcher } from './tiingoFetcher.js';
import { PositionModel } from '../schemas/portfolio.js';
import { logger } from '../core/logger.js';
import { DateTime } from 'luxon';

/**
 * ===================================
 * 股票数据与自选股服务 (MongoDB 持久化版)
 * ===================================
 */

export class StockService {
  /**
   * 获取所有自选股代码列表 (从 MongoDB)
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
   * 添加股票到 MongoDB 自选股
   */
  async addToWatchlist(symbol: string) {
    const code = symbol.trim().toUpperCase();
    try {
      // 使用 upsert，防止重复
      const result = await PositionModel.findOneAndUpdate(
        { symbol: code },
        { 
          $set: { symbol: code, updated_at: new Date() },
          $setOnInsert: { quantity: 0, avg_cost: 0 } 
        },
        { upsert: true, new: true }
      );
      logger.info(`[DB] 已添加自选股: ${code}`);
      return result;
    } catch (e) {
      logger.error(`[DB] 添加自选股失败: ${e}`);
      throw e;
    }
  }

  /**
   * 从 MongoDB 移除自选股
   */
  async removeFromWatchlist(symbol: string) {
    const code = symbol.trim().toUpperCase();
    try {
      await PositionModel.deleteOne({ symbol: code });
      logger.info(`[DB] 已移除自选股: ${code}`);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export const stockService = new StockService();
