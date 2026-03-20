/**
 * ===================================
 * Agent 核心类型定义 (Node.js/TypeScript 版)
 * ===================================
 */

export enum AgentRole {
  ANALYST = 'analyst',     // 技术分析师
  RESEARCHER = 'researcher', // 联网调研员
  STRATEGIST = 'strategist', // 策略决策者
  MANAGER = 'manager'      // 任务协调员
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
}

export interface AgentContext {
  ticker: string;
  history: Message[];
  additionalData?: any;
}

export interface AgentResponse {
  content: string;
  toolCalls?: any[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}
