import _ from 'lodash';
import { HistoricalBar } from '../schemas/stock.js';
import { logger } from '../core/logger.js';
import { config } from '../core/config.js';
import { 
  calculateSMA, 
  calculateMACD, 
  calculateRSI 
} from '../utils/indicators.js';

/**
 * ===================================
 * 趋势交易分析器 (Node.js/TypeScript 版)
 * ===================================
 */

export enum TrendStatus {
  STRONG_BULL = "强势多头",
  BULL = "多头排列",
  WEAK_BULL = "弱势多头",
  CONSOLIDATION = "盘整",
  WEAK_BEAR = "弱势空头",
  BEAR = "空头排列",
  STRONG_BEAR = "强势空头",
}

export enum VolumeStatus {
  HEAVY_VOLUME_UP = "放量上涨",
  HEAVY_VOLUME_DOWN = "放量下跌",
  SHRINK_VOLUME_UP = "缩量上涨",
  SHRINK_VOLUME_DOWN = "缩量回调",
  NORMAL = "量能正常",
}

export enum BuySignal {
  STRONG_BUY = "强烈买入",
  BUY = "买入",
  HOLD = "持有",
  WAIT = "观望",
  SELL = "卖出",
  STRONG_SELL = "强烈卖出",
}

export enum MACDStatus {
  GOLDEN_CROSS_ZERO = "零轴上金叉",
  GOLDEN_CROSS = "金叉",
  BULLISH = "多头",
  CROSSING_UP = "上穿零轴",
  CROSSING_DOWN = "下穿零轴",
  BEARISH = "空头",
  DEATH_CROSS = "死叉",
}

export enum RSIStatus {
  OVERBOUGHT = "超买",
  STRONG_BUY = "强势买入",
  NEUTRAL = "中性",
  WEAK = "弱势",
  OVERSOLD = "超卖",
}

export interface TrendAnalysisResult {
  code: string;
  trendStatus: TrendStatus;
  maAlignment: string;
  trendStrength: number;
  
  // 均线数据
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  currentPrice: number;
  
  // 乖离率
  biasMa5: number;
  biasMa10: number;
  biasMa20: number;
  
  // 量能
  volumeStatus: VolumeStatus;
  volumeRatio5d: number;
  volumeTrend: string;
  
  // 支撑压力
  supportMa5: boolean;
  supportMa10: boolean;
  resistanceLevels: number[];
  supportLevels: number[];

  // 指标
  macdDif: number;
  macdDea: number;
  macdBar: number;
  macdStatus: MACDStatus;
  macdSignal: string;

  rsi6: number;
  rsi12: number;
  rsi24: number;
  rsiStatus: RSIStatus;
  rsiSignal: string;

  // 最终信号
  buySignal: BuySignal;
  signalScore: number;
  signalReasons: string[];
  riskFactors: string[];
}

export class StockTrendAnalyzer {
  private readonly VOLUME_SHRINK_RATIO = 0.7;
  private readonly VOLUME_HEAVY_RATIO = 1.5;
  private readonly MA_SUPPORT_TOLERANCE = 0.02;

  async analyze(bars: HistoricalBar[], code: string): Promise<TrendAnalysisResult> {
    if (!bars || bars.length < 20) {
      throw new Error(`${code} 数据不足，无法进行趋势分析`);
    }

    const sortedBars = _.sortBy(bars, 'date');
    const closes = sortedBars.map(b => b.close);
    const volumes = sortedBars.map(b => b.volume);
    const latest = _.last(sortedBars)!;

    // 1. 计算指标
    const ma5 = calculateSMA(closes, 5);
    const ma10 = calculateSMA(closes, 10);
    const ma20 = calculateSMA(closes, 20);
    const ma60 = calculateSMA(closes, 60);
    const macd = calculateMACD(closes);
    const rsi6 = calculateRSI(closes, 6);
    const rsi12 = calculateRSI(closes, 12);
    const rsi24 = calculateRSI(closes, 24);

    const getLatestValue = (arr: number[]) => _.last(arr) || 0;

    // 初始化结果
    const result: TrendAnalysisResult = {
      code,
      trendStatus: TrendStatus.CONSOLIDATION,
      maAlignment: "",
      trendStrength: 0,
      ma5: getLatestValue(ma5),
      ma10: getLatestValue(ma10),
      ma20: getLatestValue(ma20),
      ma60: getLatestValue(ma60) || getLatestValue(ma20),
      currentPrice: latest.close,
      biasMa5: 0,
      biasMa10: 0,
      biasMa20: 0,
      volumeStatus: VolumeStatus.NORMAL,
      volumeRatio5d: 0,
      volumeTrend: "",
      supportMa5: false,
      supportMa10: false,
      resistanceLevels: [],
      supportLevels: [],
      macdDif: getLatestValue(macd.dif),
      macdDea: getLatestValue(macd.dea),
      macdBar: getLatestValue(macd.bar),
      macdStatus: MACDStatus.BULLISH,
      macdSignal: "",
      rsi6: getLatestValue(rsi6),
      rsi12: getLatestValue(rsi12),
      rsi24: getLatestValue(rsi24),
      rsiStatus: RSIStatus.NEUTRAL,
      rsiSignal: "",
      buySignal: BuySignal.WAIT,
      signalScore: 0,
      signalReasons: [],
      riskFactors: []
    };

    // 2. 趋势分析
    this.analyzeTrend(ma5, ma10, ma20, result);

    // 3. 乖离率计算
    result.biasMa5 = ((result.currentPrice - result.ma5) / result.ma5) * 100;
    result.biasMa10 = ((result.currentPrice - result.ma10) / result.ma10) * 100;
    result.biasMa20 = ((result.currentPrice - result.ma20) / result.ma20) * 100;

    // 4. 量能分析
    const vol5Avg = _.mean(volumes.slice(-6, -1));
    result.volumeRatio5d = latest.volume / vol5Avg;
    const priceChange = latest.pct_chg || 0;

    if (result.volumeRatio5d >= this.VOLUME_HEAVY_RATIO) {
      if (priceChange > 0) {
        result.volumeStatus = VolumeStatus.HEAVY_VOLUME_UP;
        result.volumeTrend = "放量上涨，多头力量强劲";
      } else {
        result.volumeStatus = VolumeStatus.HEAVY_VOLUME_DOWN;
        result.volumeTrend = "放量下跌，注意风险";
      }
    } else if (result.volumeRatio5d <= this.VOLUME_SHRINK_RATIO) {
      if (priceChange > 0) {
        result.volumeStatus = VolumeStatus.SHRINK_VOLUME_UP;
        result.volumeTrend = "缩量上涨，上攻动能不足";
      } else {
        result.volumeStatus = VolumeStatus.SHRINK_VOLUME_DOWN;
        result.volumeTrend = "缩量回调，洗盘特征明显（好）";
      }
    } else {
      result.volumeStatus = VolumeStatus.NORMAL;
      result.volumeTrend = "量能正常";
    }

    // 5. 支撑压力分析
    if (Math.abs(result.currentPrice - result.ma5) / result.ma5 <= this.MA_SUPPORT_TOLERANCE && result.currentPrice >= result.ma5) {
      result.supportMa5 = true;
      result.supportLevels.push(result.ma5);
    }
    if (Math.abs(result.currentPrice - result.ma10) / result.ma10 <= this.MA_SUPPORT_TOLERANCE && result.currentPrice >= result.ma10) {
      result.supportMa10 = true;
      result.supportLevels.push(result.ma10);
    }

    // 6. MACD 分析
    const prevDif = macd.dif[macd.dif.length - 2];
    const prevDea = macd.dea[macd.dea.length - 2];
    const isGoldenCross = (prevDif <= prevDea) && (result.macdDif > result.macdDea);
    const isDeathCross = (prevDif >= prevDea) && (result.macdDif < result.macdDea);

    if (isGoldenCross && result.macdDif > 0) {
      result.macdStatus = MACDStatus.GOLDEN_CROSS_ZERO;
      result.macdSignal = "⭐ 零轴上金叉，强烈买入信号！";
    } else if (isGoldenCross) {
      result.macdStatus = MACDStatus.GOLDEN_CROSS;
      result.macdSignal = "✅ 金叉，趋势向上";
    } else if (isDeathCross) {
      result.macdStatus = MACDStatus.DEATH_CROSS;
      result.macdSignal = "❌ 死叉，趋势向下";
    } else {
      result.macdSignal = result.macdDif > 0 ? "✓ 多头排列" : "⚠ 空头排列";
    }

    // 7. RSI 分析
    if (result.rsi12 > 70) {
      result.rsiStatus = RSIStatus.OVERBOUGHT;
      result.rsiSignal = `⚠️ RSI超买(${result.rsi12.toFixed(1)}>70)`;
    } else if (result.rsi12 < 30) {
      result.rsiStatus = RSIStatus.OVERSOLD;
      result.rsiSignal = `⭐ RSI超卖(${result.rsi12.toFixed(1)}<30)`;
    } else {
      result.rsiStatus = RSIStatus.NEUTRAL;
      result.rsiSignal = `RSI中性(${result.rsi12.toFixed(1)})`;
    }

    // 8. 评分与信号生成
    this.generateSignal(result);

    return result;
  }

  private analyzeTrend(ma5: number[], ma10: number[], ma20: number[], result: TrendAnalysisResult) {
    const m5 = result.ma5;
    const m10 = result.ma10;
    const m20 = result.ma20;

    if (m5 > m10 && m10 > m20) {
      result.trendStatus = TrendStatus.BULL;
      result.maAlignment = "多头排列 MA5>MA10>MA20";
      result.trendStrength = 75;
    } else if (m5 < m10 && m10 < m20) {
      result.trendStatus = TrendStatus.BEAR;
      result.maAlignment = "空头排列 MA5<MA10<MA20";
      result.trendStrength = 25;
    } else {
      result.trendStatus = TrendStatus.CONSOLIDATION;
      result.maAlignment = "均线缠绕，趋势不明";
      result.trendStrength = 50;
    }
  }

  private generateSignal(result: TrendAnalysisResult) {
    let score = 0;
    const reasons: string[] = [];
    const risks: string[] = [];

    // 趋势评分 (30)
    if (result.trendStatus === TrendStatus.BULL) score += 26;
    if (result.trendStatus === TrendStatus.STRONG_BULL) score += 30;
    
    // 乖离率评分 (20)
    if (result.biasMa5 < 2 && result.biasMa5 > -2) {
      score += 20;
      reasons.push("✅ 价格贴近MA5，介入时机好");
    } else if (result.biasMa5 > 5) {
      risks.push("❌ 乖离率过高，严禁追高");
    }

    // 量能评分 (15)
    if (result.volumeStatus === VolumeStatus.SHRINK_VOLUME_DOWN) {
      score += 15;
      reasons.push("✅ 缩量回调，洗盘特征");
    }

    // 指标评分 (MACD 15 + RSI 10)
    if (result.macdStatus === MACDStatus.GOLDEN_CROSS_ZERO) score += 15;
    if (result.rsiStatus === RSIStatus.OVERSOLD) score += 10;

    result.signalScore = score;
    result.signalReasons = reasons;
    result.riskFactors = risks;

    if (score >= 70) result.buySignal = BuySignal.BUY;
    else if (score < 30) result.buySignal = BuySignal.SELL;
    else result.buySignal = BuySignal.HOLD;
  }
}

export const stockTrendAnalyzer = new StockTrendAnalyzer();
