import { aiAnalyzer } from '../services/aiAnalyzer.js';
import { searchService } from '../services/searchService.js';
import { stockService } from '../services/stockService.js';
import { logger } from '../core/logger.js';
import { AgentRole, AgentContext, Message } from './types.js';
import { agentMemory } from './memory.js';

/**
 * ===================================
 * Agent 任务协调器 (Node.js/TypeScript 版)
 * ===================================
 * 
 * 职责：负责分解用户需求，调用不同能力的子 Agent 协作。
 */

export class AgentOrchestrator {
  /**
   * 自动研判流程
   * 
   * 模拟多 Agent 协作：
   * 1. Analyst Agent: 获取技术面指标
   * 2. Researcher Agent: 联网搜索舆情
   * 3. Strategist Agent: 综合给出结论
   */
  async runAutoResearch(ticker: string, sessionId: string) {
    logger.info(`[Orchestrator] 启动多维深度研究: ${ticker}`);

    // 1. 获取基础上下文
    const history = await agentMemory.getHistory(sessionId);
    
    // 2. 技术面分析 (Analyst 角色)
    const historyData = await stockService.getHistoryData(ticker, 60);
    
    // 3. 舆情调研 (Researcher 角色)
    const newsContext = await searchService.getStockContext(ticker);

    // 4. 汇总给 Strategist (由 aiAnalyzer 担任核心决策者)
    const finalReport = await aiAnalyzer.analyze(
      { code: ticker, name: ticker, trend: {} as any }, // 具体指标由 aiAnalyzer 内部重新计算或透传
      `【Agent 联网调研报告】\n${newsContext}\n\n【技术面历史概览】\n已获取过去 60 天 K 线数据。`
    );

    // 5. 更新对话记忆
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
   * 自由对话模式 (Agent 交互)
   */
  async chat(sessionId: string, userMessage: string) {
    const history = await agentMemory.getHistory(sessionId);
    
    // 调用 AI 进行自由问答 (可以复用 aiAnalyzer 的客户端)
    // 这里展示了如何处理非结构化的 Agent 对话
    const prompt = `你是一个专业的投资助手。当前对话历史：\n${JSON.stringify(history)}\n用户：${userMessage}`;
    
    // 暂时简单返回，后续可扩展工具调用
    const response = await aiAnalyzer.analyze(
      { code: 'CHAT', name: 'Chat', trend: {} as any },
      `对话上下文：${userMessage}`
    );

    await agentMemory.appendMessage(sessionId, { role: 'user', content: userMessage });
    await agentMemory.appendMessage(sessionId, { role: 'assistant', content: response.analysis_summary });

    return response.analysis_summary;
  }
}

export const orchestrator = new AgentOrchestrator();
