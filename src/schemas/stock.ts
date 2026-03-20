/**
 * ===================================
 * 股票数据模型 (Node.js/TypeScript 版)
 * ===================================
 */

export enum RealtimeSource {
  AKSHARE = 'akshare',
  TIINGO = 'tiingo',
  FRED = 'fred',
  STOOQ = 'stooq',
  FALLBACK = 'fallback',
}

/**
 * 统一实时行情接口
 */
export interface UnifiedRealtimeQuote {
  code: string;
  name: string;
  source: RealtimeSource;
  price: number | null;
  change_pct: number | null;
  change_amount: number | null;
  volume: number | null;
  amount: number | null;
  volume_ratio: number | null;
  turnover_rate: number | null;
  amplitude: number | null;
  open_price: number | null;
  high: number | null;
  low: number | null;
  pre_close: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  total_mv: number | null;
  circ_mv: number | null;
}

/**
 * 历史K线数据接口
 */
export interface HistoricalBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
  pct_chg?: number;
  code?: string;
}

export const STANDARD_COLUMNS = ['date', 'open', 'high', 'low', 'close', 'volume', 'amount', 'pct_chg'];
