import axios from 'axios';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

/**
 * ===================================
 * FRED 数据抓取器 (Node.js 版)
 * ===================================
 * 
 * 获取 Federal Reserve Economic Data (FRED) 宏观经济指标。
 */

export interface FredObservation {
  date: string;
  value: number | null;
}

export class FredFetcher {
  private readonly baseUrl = 'https://api.stlouisfed.org/fred';

  /**
   * 获取指定的宏观经济指标历史数据
   * 
   * @param seriesId 指标ID (如: 'UNRATE', 'FEDFUNDS', 'GDP')
   * @param limit 获取记录条数
   */
  async getSeriesObservations(seriesId: string, limit: number = 100): Promise<FredObservation[]> {
    const apiKey = config.FRED_API_KEY || process.env.FRED_API_KEY;
    
    if (!apiKey) {
      throw new Error('未配置 FRED_API_KEY，无法获取宏观数据');
    }

    logger.info(`[FRED] 正在获取指标数据: ${seriesId}`);

    try {
      const response = await axios.get(`${this.baseUrl}/series/observations`, {
        params: {
          series_id: seriesId,
          api_key: apiKey,
          file_type: 'json',
          sort_order: 'desc', // 最新的在前
          limit: limit
        }
      });

      const observations = response.data.observations || [];
      
      return observations.map((obs: any) => ({
        date: obs.date,
        value: obs.value === '.' ? null : parseFloat(obs.value)
      }));
    } catch (error) {
      logger.error(`[FRED] 获取指标 ${seriesId} 失败: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /**
   * 获取常用的宏观指标概览
   */
  async getMacroOverview() {
    const commonIds = {
      'Fed Rate': 'FEDFUNDS',
      'Unemployment': 'UNRATE',
      'CPI': 'CPIAUCSNS',
      '10Y Treasury': 'DGS10'
    };

    const results: Record<string, any> = {};
    
    for (const [name, id] of Object.entries(commonIds)) {
      try {
        const data = await this.getSeriesObservations(id, 1);
        results[name] = data[0] || null;
      } catch (e) {
        results[name] = 'Error';
      }
    }

    return results;
  }
}

export const fredFetcher = new FredFetcher();
