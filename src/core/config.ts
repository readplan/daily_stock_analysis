import { z } from 'zod';

/**
 * ===================================
 * 美股自选股智能分析系统 - 配置管理模块 (Node.js/TypeScript 版)
 * ===================================
 */

const ConfigSchema = z.object({
  // === 自选股配置 ===
  STOCK_LIST: z.string().default('AAPL,TSLA,NVDA').transform((val) => 
    val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  ),

  // === AI 分析配置 ===
  LITELLM_MODEL: z.string().default('gemini/gemini-1.5-flash'),
  LLM_TEMPERATURE: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return 0.7;
    const parsed = parseFloat(val as string);
    return isNaN(parsed) ? 0.7 : parsed;
  }, z.number().default(0.7)),
  
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  FRED_API_KEY: z.string().optional(),
  TIINGO_API_TOKEN: z.string().optional(),

  // === 运行模式配置 ===
  MARKET_REVIEW_ENABLED: z.preprocess((val) => val === 'true' || val === '1', z.boolean().default(true)),
  AGENT_MODE: z.preprocess((val) => val === 'true' || val === '1', z.boolean().default(false)),
  
  // === 通知配置 ===
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  EMAIL_SENDER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_RECEIVERS: z.string().default('').transform((val) => 
    val.split(',').map((s) => s.trim()).filter(Boolean)
  ),
  DISCORD_WEBHOOK_URL: z.string().optional(),

  // === 系统配置 ===
  DATABASE_PATH: z.string().default('./data/stock_analysis.db'),
  MONGODB_URI: z.string().optional(),
  LOG_DIR: z.string().default('./logs'),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  PORT: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return 8000;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? 8000 : parsed;
  }, z.number().default(8000)),
  MAX_WORKERS: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return 3;
    const parsed = parseInt(val as string, 10);
    return isNaN(parsed) ? 3 : parsed;
  }, z.number().default(3)),
  DEBUG: z.preprocess((val) => val === 'true' || val === '1', z.boolean().default(false)),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// 解析并导出
export const config = ConfigSchema.parse(process.env);

export const refreshConfig = () => {
  const result = ConfigSchema.parse(process.env);
  Object.assign(config, result);
};
