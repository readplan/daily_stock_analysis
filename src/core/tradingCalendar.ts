import { DateTime } from 'luxon';
import { logger } from './logger.js';

/**
 * ===================================
 * 交易日历模块 (Node.js/TypeScript 版)
 * ===================================
 */

export enum Market {
  CN = 'cn',
  HK = 'hk',
  US = 'us'
}

const MARKET_TIMEZONES = {
  [Market.CN]: 'Asia/Shanghai',
  [Market.HK]: 'Asia/Hong_Kong',
  [Market.US]: 'America/New_York'
};

export class TradingCalendar {
  /**
   * 判断指定市场在特定日期是否开市 (简单版：仅判断周末)
   */
  isMarketOpen(market: Market, date: DateTime): boolean {
    const localDate = date.setZone(MARKET_TIMEZONES[market]);
    const weekday = localDate.weekday; // 1 (Mon) - 7 (Sun)
    
    if (weekday === 6 || weekday === 7) {
      return false;
    }
    
    // 后续可添加节假日列表判断
    return true;
  }

  /**
   * 获取今日开市的市场列表
   */
  getOpenMarketsToday(): Market[] {
    const now = DateTime.now();
    const openMarkets: Market[] = [];

    for (const mkt of Object.values(Market)) {
      if (this.isMarketOpen(mkt, now)) {
        openMarkets.push(mkt);
      }
    }

    return openMarkets;
  }

  /**
   * 根据股票代码推断所属市场
   */
  getMarketForStock(code: string): Market | null {
    const c = code.trim().toUpperCase();
    if (/^[A-Z]{1,5}$/.test(c)) return Market.US;
    if (c.endsWith('.HK') || (c.length === 5 && /^\d+$/.test(c))) return Market.HK;
    if (/^\d{6}$/.test(c) || c.endsWith('.SS') || c.endsWith('.SZ')) return Market.CN;
    return null;
  }
}

export const tradingCalendar = new TradingCalendar();
