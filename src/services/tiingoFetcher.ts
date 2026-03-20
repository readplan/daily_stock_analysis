import axios from 'axios';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { HistoricalBar, UnifiedRealtimeQuote, RealtimeSource } from '../schemas/stock.js';

/**
 * ===================================
 * Tiingo 数据抓取器 (Node.js 版)
 * ===================================
 */

export class TiingoFetcher {
  private readonly baseUrl = 'https://api.tiingo.com/tiingo';

  private get headers() {
    const token = config.TIINGO_API_TOKEN || process.env.TIINGO_API_TOKEN;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`
    };
  }

  /**
   * 获取历史价格数据 (End-of-Day)
   */
  async getHistoricalPrices(ticker: string, startDate?: string, endDate?: string): Promise<HistoricalBar[]> {
    logger.info(`[Tiingo] 正在获取历史数据: ${ticker}`);
    try {
      const response = await axios.get(`${this.baseUrl}/daily/${ticker}/prices`, {
        headers: this.headers,
        params: {
          startDate,
          endDate,
          resampleFreq: 'daily'
        }
      });

      const data = response.data || [];
      return data.map((item: any) => ({
        date: item.date.split('T')[0],
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        pct_chg: item.adjClose ? parseFloat(((item.adjClose - (item.adjClose / (1 + (item.close - item.open)/item.open))) / item.adjClose * 100).toFixed(2)) : 0,
        code: ticker
      }));
    } catch (error) {
      logger.error(`[Tiingo] 获取历史数据失败 [${ticker}]: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * 获取最新实时行情 (IEX)
   */
  async getIexQuote(ticker: string): Promise<UnifiedRealtimeQuote | null> {
    logger.info(`[Tiingo] 正在获取 IEX 实时行情: ${ticker}`);
    try {
      const response = await axios.get(`https://api.tiingo.com/iex/${ticker}`, {
        headers: this.headers
      });

      const data = response.data[0];
      if (!data) return null;

      return {
        code: ticker.toUpperCase(),
        name: ticker.toUpperCase(),
        source: RealtimeSource.STOOQ, // 暂时借用或新增一个 TIINGO 枚举
        price: data.last,
        change_pct: null, // IEX 接口不直接提供，需计算
        change_amount: null,
        volume: data.volume,
        amount: null,
        volume_ratio: null,
        turnover_rate: null,
        amplitude: null,
        open_price: data.open,
        high: data.high,
        low: data.low,
        pre_close: data.prevClose,
        pe_ratio: null,
        pb_ratio: null,
        total_mv: null,
        circ_mv: null
      };
    } catch (error) {
      logger.warn(`[Tiingo] 获取 IEX 行情失败 [${ticker}]: ${error}`);
      return null;
    }
  }

  /**
   * 搜索股票/指数
   */
  async search(query: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/utilities/search`, {
        headers: this.headers,
        params: { query }
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }
}

export const tiingoFetcher = new TiingoFetcher();
