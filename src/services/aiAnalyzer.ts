import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { config } from "../core/config.js";
import { logger } from "../core/logger.js";
import { TrendAnalysisResult } from "./stockAnalyzer.js";

/**
 * ===================================
 * AI 核心分析引擎 - 终极鲁棒解析版
 * ===================================
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
  success: boolean;
  error_message?: string;
  model_used: string;
}

export class AiAnalyzer {
  private genAI?: GoogleGenAI;

  private readonly SYSTEM_PROMPT = `你是一位专注于趋势交易的美股投资分析师，负责生成专业的【决策仪表盘】分析报告。
必须输出纯 JSON 格式，不要有任何 Markdown 标签。
JSON 字段要求：
- stock_name: 股票名称
- sentiment_score: 0-100 整数
- trend_prediction: 趋势预测文字
- operation_advice: 操作建议文字
- decision_type: 'buy' | 'hold' | 'sell'
- analysis_summary: 核心结论文字
- dashboard: 包含具体细节的 JSON 对象`;

  private initClient() {
    const key = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
    if (!this.genAI && key) {
      this.genAI = new GoogleGenAI({ apiKey: key });
    }
  }

  async analyze(context: { code: string; name: string; trend: TrendAnalysisResult }, newsContext: string = ""): Promise<AnalysisResult> {
    this.initClient();
    const prompt = `分析 ${context.name}(${context.code})。数据：${JSON.stringify(context.trend)}。背景：${newsContext}`;

    try {
      return await this.callRawHttp(prompt, context);
    } catch (e: any) {
      logger.error(`AI 分析调用失败: ${e.message}`);
      return this.getErrorResult(context, e.message);
    }
  }

  private async callRawHttp(prompt: string, context: any): Promise<AnalysisResult> {
    const key = process.env.GEMINI_API_KEY || config.GEMINI_API_KEY;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
    
    const response = await axios.post(`${url}?key=${key}`, {
      contents: [{
        parts: [{ text: this.SYSTEM_PROMPT + "\n\n" + prompt }]
      }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const text = response.data.candidates[0].content.parts[0].text;
    return this.parseResponse(text, context, "gemini-flash-latest-http");
  }

  /**
   * 🛠️ 终极解析器：支持非标 JSON 字段与贪婪提取
   */
  private parseResponse(responseText: string, context: any, model: string): AnalysisResult {
    let data: any = null;
    let cleanText = responseText.trim();

    try {
      // 1. 尝试直接解析
      try {
        data = JSON.parse(cleanText.replace(/```json\n?|```/g, ''));
      } catch (e) {
        // 2. 贪婪模式：提取第一个 { 和最后一个 } 之间的内容
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("找不到 JSON 边界");
        }
      }

      // 3. 字段标准化映射 (兼容您提到的 P_E_Ratio, Key_Metrics 等)
      const advice = data.operation_advice || data.advice || data.Recommendation || '观望';
      const summary = data.analysis_summary || data.summary || data.Key_Metrics || '见详细报告';
      
      const result: AnalysisResult = {
        code: context.code,
        name: data.stock_name || data.Name || context.name,
        sentiment_score: parseInt(data.sentiment_score || data.Score || 50),
        trend_prediction: data.trend_prediction || data.Trend || '震荡',
        operation_advice: advice,
        decision_type: data.decision_type || (advice.includes('买') || advice.includes('Buy') ? 'buy' : 'hold'),
        confidence_level: data.confidence_level || '中',
        // 如果没有 dashboard 字段，则把整个 data 作为 dashboard
        dashboard: data.dashboard || data,
        analysis_summary: typeof summary === 'string' ? summary : JSON.stringify(summary),
        model_used: model,
        success: true
      };

      return result;
    } catch (error) {
      logger.error(`[Parser] 解析失败。AI 原始响应如下：\n${responseText}`);
      throw error;
    }
  }

  private getErrorResult(context: any, errorMsg: string): AnalysisResult {
    return {
      code: context.code, name: context.name, sentiment_score: 50, trend_prediction: "格式异常",
      operation_advice: "观望", decision_type: 'hold', confidence_level: '中',
      dashboard: null, analysis_summary: `AI 响应解析失败: ${errorMsg}`, 
      model_used: "error", success: false, error_message: errorMsg
    };
  }
}

export const aiAnalyzer = new AiAnalyzer();
