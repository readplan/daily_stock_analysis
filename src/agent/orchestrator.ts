import { aiAnalyzer } from '../services/aiAnalyzer.js';
import { searchService } from '../services/searchService.js';
import { stockService } from '../services/stockService.js';
import { logger } from '../core/logger.js';
import { agentMemory } from './memory.js';

/**
 * ===================================
 * Agent 任务协调器 (修复版)
 * ===================================
 */

export class AgentOrchestrator {
  /**
   * 自动研判流程
   */
  async runAutoResearch(ticker: string, sessionId: string) {
    logger.info(`[Orchestrator] 启动多维深度研究: ${ticker}`);

    // 1. 获取技术面历史数据 (使用 stockService 中的方法)
    const historyData = await stockService.getHistoryData(ticker, 60);
    
    // 2. 舆情调研
    const newsContext = await searchService.getStockContext(ticker);

    // 3. 汇总给 AI 决策
    const finalReport = await aiAnalyzer.analyze(
      { code: ticker, name: ticker, trend: {} as any },
      `【技术面摘要】已获取 60 天数据。\n\n【联网资讯】\n${newsContext}`
    );

    // 4. 更新对话记忆
    await agentMemory.appendMessage(sessionId, { 
      role: 'user', 
      content: `请对 ${ticker} 进行深度多维研究` 
    });
    await agentMemory.appendMessage(sessionId, { 
      role: 'assistant', 
      content: finalReport.analysis_summary 
    });

    return finalReport;
  }

  /**
   * 自由对话模式
   */
  async chat(sessionId: string, userMessage: string) {
    const response = await aiAnalyzer.analyze(
      { code: 'CHAT', name: 'Chat', trend: {} as any },
      `用户提问：${userMessage}`
    );

    await agentMemory.appendMessage(sessionId, { role: 'user', content: userMessage });
    await agentMemory.appendMessage(sessionId, { role: 'assistant', content: response.analysis_summary });

    return response.analysis_summary;
  }
}

export const orchestrator = new AgentOrchestrator();
