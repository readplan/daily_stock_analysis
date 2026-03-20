import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../core/logger.js';

/**
 * ===================================
 * 策略管理模块 (Node.js/TypeScript 版)
 * ===================================
 * 
 * 负责加载和解析 YAML 格式的交易策略。
 */

export interface Strategy {
  name: string;
  description: string;
  indicators: any;
  rules: string[];
}

export class StrategyManager {
  private strategies: Map<string, Strategy> = new Map();

  /**
   * 加载所有策略文件
   */
  async loadStrategies(strategiesDir: string) {
    try {
      const files = await fs.readdir(strategiesDir);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const content = await fs.readFile(path.join(strategiesDir, file), 'utf8');
          const data = yaml.load(content) as Strategy;
          if (data && data.name) {
            this.strategies.set(data.name, data);
            logger.debug(`[Strategy] 加载策略: ${data.name}`);
          }
        }
      }
      logger.info(`[Strategy] 成功加载 ${this.strategies.size} 个策略`);
    } catch (e) {
      logger.error(`[Strategy] 加载策略失败: ${e}`);
    }
  }

  /**
   * 获取所有策略的描述 (用于注入 Prompt)
   */
  getStrategiesContext(): string {
    let context = "## 交易策略参考\n";
    this.strategies.forEach((s) => {
      context += `### ${s.name}\n- 描述: ${s.description}\n- 核心规则: ${s.rules.join('; ')}\n\n`;
    });
    return context;
  }
}

export const strategyManager = new StrategyManager();
