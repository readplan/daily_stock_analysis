import { TradeModel, PositionModel, AccountModel } from '../schemas/portfolio.js';
import { logger } from '../core/logger.js';

/**
 * ===================================
 * 投资组合管理服务 (Node.js/TypeScript 版)
 * ===================================
 */

export class PortfolioService {
  /**
   * 添加交易并自动更新持仓
   */
  async addTrade(data: {
    symbol: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    note?: string;
  }) {
    const { symbol, side, price, quantity } = data;
    logger.info(`[Portfolio] 添加交易: ${side} ${symbol} @ ${price} x ${quantity}`);

    try {
      // 1. 保存交易记录
      const trade = new TradeModel(data);
      await trade.save();

      // 2. 更新持仓 (Simple Moving Average Cost)
      const position = await PositionModel.findOne({ symbol });

      if (side === 'buy') {
        if (position) {
          const totalQty = position.quantity + quantity;
          const newCost = (position.avg_cost * position.quantity + price * quantity) / totalQty;
          position.quantity = totalQty;
          position.avg_cost = newCost;
          position.updated_at = new Date();
          await position.save();
        } else {
          await PositionModel.create({
            symbol,
            avg_cost: price,
            quantity
          });
        }
      } else {
        if (position) {
          position.quantity -= quantity;
          if (position.quantity <= 0) {
            await PositionModel.deleteOne({ symbol });
          } else {
            await position.save();
          }
        }
      }

      return trade;
    } catch (e) {
      logger.error(`[Portfolio] 交易处理失败: ${e}`);
      throw e;
    }
  }

  /**
   * 获取当前所有持仓
   */
  async getPositions() {
    return await PositionModel.find().sort({ symbol: 1 });
  }

  /**
   * 获取持仓的股票代码列表 (用于分析)
   */
  async getPortfolioSymbols(): Promise<string[]> {
    const positions = await this.getPositions();
    return positions.map(p => p.symbol);
  }
}

export const portfolioService = new PortfolioService();
