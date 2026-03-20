import { GoogleGenAI } from '@google/genai';
import OpenAI from "openai";
import { config } from "../core/config.js";
import { logger } from "../core/logger.js";
import { TrendAnalysisResult } from "./stockAnalyzer.js";

/**
 * ===================================
 * AI 核心分析引擎 - 全能集成版
 * ===================================
 * 
 * 集成了：
 * 1. Gemini 3.0 (原生 SDK, 支持 Search & Thinking)
 * 2. OpenAI 兼容接口 (支持 GPT-4, DeepSeek 等)
 * 3. Vercel AI Gateway 路由支持
 */

export interface AnalysisResult {
  code: string;
  name: string;
  sentiment_score: number;
  trend_prediction: string;
  operation_advice: string;
  decision_type: 'buy' | 'hold' | 'sell';
  confidence_level: '高' | '中' | '低';
  dashboard: any;
  analysis_summary: string;
  key_points: string;
  risk_warning: string;
  buy_reason: string;
  fundamental_analysis: string;
  sector_position: string;
  model_used: string;
  success: boolean;
  error_message?: string;
  thinking_process?: string;
}

export class AiAnalyzer {
  private genAI?: any;
  private openai?: OpenAI;

  // 保留原汁原味的高精度决策 Prompt
  private readonly SYSTEM_PROMPT = `你是一位专注于趋势交易的美股投资分析师，负责生成专业的【决策仪表盘】分析报告。

## 核心交易理念
1. 趋势交易：MA5 > MA10 > MA20 多头排列。顺势而为。
2. 严进策略：股价偏离 MA5 超过 5% 时判定为观望。
3. 最佳切入点：乖离率 < 2% 为理想入场区间。
4. 综合研判：结合技术指标、宏观背景(FRED)和最新舆情。

## 输出格式：必须输出纯 JSON
{
    "stock_name": "股票名称",
    "sentiment_score": 0-100,
    "trend_prediction": "强烈看多/看多/震荡/看空/强烈看空",
    "operation_advice": "买入/加仓/持有/减仓/卖出/观望",
    "decision_type": "buy/hold/sell",
    "confidence_level": "高/中/低",
    "dashboard": {
        "core_conclusion": { "one_sentence": "核心结论", "signal_type": "信号类型", "time_sensitivity": "时效性" },
        "data_perspective": {
            "trend_status": { "ma_alignment": "状态", "is_bullish": true, "trend_score": 0-100 },
            "price_position": { "current_price": 0, "ma5": 0, "ma10": 0, "ma20": 0, "bias_ma5": 0 },
            "volume_analysis": { "volume_ratio": 0, "volume_status": "状态" }
        },
        "intelligence": { "latest_news": "摘要", "risk_alerts": [], "earnings_outlook": "分析" }
    },
    "analysis_summary": "总结",
    "key_points": "看点",
    "risk_warning": "提示",
    "buy_reason": "理由",
    "fundamental_analysis": "基本面",
    "sector_position": "行业"
}`;

  private initClients() {
    const geminiKey = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || config.OPENAI_API_KEY;

    if (!this.genAI && geminiKey) {
      this.genAI = new GoogleGenAI({ apiKey: geminiKey });
    }
    if (!this.openai && openaiKey) {
      this.openai = new OpenAI({ 
        apiKey: openaiKey,
        baseURL: process.env.AI_GATEWAY_URL || undefined 
      });
    }
  }

  /**
   * 统一分析接口
   */
  async analyze(context: { code: string; name: string; trend: TrendAnalysisResult }, newsContext: string = ""): Promise<AnalysisResult> {
    this.initClients();

    const prompt = `分析 ${context.name}(${context.code})。
    
### 1. 技术面实时数据
${JSON.stringify(context.trend, null, 2)}

### 2. 宏观与舆情背景
${newsContext}

请基于上述信息，开启 Google Search 搜寻该标的今日最及时的分析师变动和市场异动，并生成决策报告。`;

    const modelName = config.LITELLM_MODEL;

    try {
      // 路由：如果是 gemini 模型且配置了 SDK，使用原生高级功能
      if (modelName.includes('gemini') && this.genAI) {
        return await this.callGeminiAdvanced(prompt, context);
      } 
      
      // 否则走 OpenAI 兼容通道 (LiteLLM 模式)
      if (this.openai) {
        return await this.callOpenAICompatible(prompt, context);
      }

      throw new Error("无可用 AI 核心引擎配置");
    } catch (error) {
      logger.error(`AI 核心引擎故障: ${error}`);
      return this.getErrorResult(context, error);
    }
  }

  /**
   * 引擎 A: Gemini 3.0 高级模式 (Search + Thinking)
   */
  private async callGeminiAdvanced(prompt: string, context: any): Promise<AnalysisResult> {
    const modelId = config.LITELLM_MODEL.includes('/') 
      ? config.LITELLM_MODEL.split('/')[1] 
      : config.LITELLM_MODEL;

    // 自动修正为 2.0/3.0 兼容 ID
    const effectiveModel = modelId.includes('gemini-') ? modelId : 'gemini-2.0-flash';

    logger.info(`[Engine] 使用 Gemini Advanced: ${effectiveModel}`);

    const response = await this.genAI.models.generateContent({
      model: effectiveModel,
      config: {
        thinkingConfig: { includeThoughts: true },
        tools: [{ googleSearch: {} }]
      },
      contents: [
        { role: 'user', parts: [{ text: this.SYSTEM_PROMPT + "\n\n" + prompt }] }
      ]
    });

    return this.parseResponse(response.text, context, effectiveModel);
  }

  /**
   * 引擎 B: OpenAI / LiteLLM 兼容模式
   */
  private async callOpenAICompatible(prompt: string, context: any): Promise<AnalysisResult> {
    const modelId = config.LITELLM_MODEL;
    logger.info(`[Engine] 使用 OpenAI 通道: ${modelId}`);

    const completion = await this.openai!.chat.completions.create({
      model: modelId.includes('/') ? modelId.split('/')[1] : modelId,
      messages: [
        { role: "system", content: this.SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    return this.parseResponse(completion.choices[0].message.content || "{}", context, modelId);
  }

  private parseResponse(responseText: string, context: any, model: string): AnalysisResult {
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return {
      code: context.code,
      name: data.stock_name || context.name,
      sentiment_score: data.sentiment_score || 50,
      trend_prediction: data.trend_prediction || '震荡',
      operation_advice: data.operation_advice || '观望',
      decision_type: data.decision_type || 'hold',
      confidence_level: data.confidence_level || '中',
      dashboard: data.dashboard,
      analysis_summary: data.analysis_summary || '',
      key_points: data.key_points || '',
      risk_warning: data.risk_warning || '',
      buy_reason: data.buy_reason || '',
      fundamental_analysis: data.fundamental_analysis || '',
      sector_position: data.sector_position || '',
      model_used: model,
      success: true
    };
  }

  private getErrorResult(context: any, error: any): AnalysisResult {
    return {
      code: context.code, name: context.name, sentiment_score: 50, trend_prediction: "引擎异常",
      operation_advice: "观望", decision_type: 'hold', confidence_level: '中',
      dashboard: null, analysis_summary: "AI 引擎暂时无法提供服务", 
      key_points: "", risk_warning: "", buy_reason: "",
      fundamental_analysis: "", sector_position: "", model_used: "error", success: false,
      error_message: String(error)
    };
  }
}

export const aiAnalyzer = new AiAnalyzer();
