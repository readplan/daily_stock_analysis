import _ from 'lodash';

/**
 * ===================================
 * 技术指标计算工具 (Node.js/TypeScript 版)
 * ===================================
 */

/**
 * 计算简单移动平均线 (SMA)
 */
export const calculateSMA = (data: number[], window: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
      continue;
    }
    const slice = data.slice(i - window + 1, i + 1);
    const sum = slice.reduce((a: number, b: number) => a + b, 0);
    result.push(sum / window);
  }
  return result;
};

/**
 * 计算指数移动平均线 (EMA)
 */
export const calculateEMA = (data: number[], span: number): number[] => {
  if (data.length === 0) return [];
  const result: number[] = [];
  const alpha = 2 / (span + 1);
  let ema = data[0];
  
  result.push(ema);
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * alpha + ema * (1 - alpha);
    result.push(ema);
  }
  return result;
};

/**
 * 计算 MACD
 */
export interface MACDResult {
  dif: number[];
  dea: number[];
  bar: number[];
}

export const calculateMACD = (
  data: number[], 
  fast: number = 12, 
  slow: number = 26, 
  signal: number = 9
): MACDResult => {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  
  const dif = emaFast.map((f, i) => f - emaSlow[i]);
  const dea = calculateEMA(dif, signal);
  const bar = dif.map((d, i) => (d - dea[i]) * 2);
  
  return { dif, dea, bar };
};

/**
 * 计算 RSI
 */
export const calculateRSI = (data: number[], period: number = 14): number[] => {
  if (data.length <= period) return new Array(data.length).fill(NaN);
  
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  let avgGain = _.take(gains, period).reduce((a: number, b: number) => a + b, 0) / period;
  let avgLoss = _.take(losses, period).reduce((a: number, b: number) => a + b, 0) / period;

  for (let i = 0; i < period; i++) rsi.push(NaN);
  
  const firstRSI = 100 - (100 / (1 + avgGain / avgLoss));
  rsi.push(firstRSI);

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
};
