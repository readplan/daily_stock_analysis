import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. 加载环境变量
dotenv.config();

// 2. 强制补丁
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'AIzaSyDV7Iu7oudDuQF48qJy8Lx5htIE-bw5b_s';
}

import { config, refreshConfig } from './core/config.js';
refreshConfig();

import { logger, setupLogging } from './core/logger.js';
import { connectDatabase } from './core/database.js';
import { analysisPipeline } from './services/analysisPipeline.js';
import { historyService } from './services/historyService.js';
import { stockService } from './services/stockService.js';
import { strategyManager } from './services/strategyManager.js';
import { scheduler } from './services/scheduler.js';
import { telegramBotService } from './services/telegramBot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ===================================
 * DSA 全栈控制台入口 (Node.js/TypeScript)
 * ===================================
 */

const startServer = async () => {
  const app = express();
  const port = config.PORT || 8000;

  setupLogging('web_server');
  await connectDatabase();

  // 加载策略
  await strategyManager.loadStrategies(path.resolve(process.cwd(), '../strategies'));

  // 启动辅助服务
  scheduler.start();
  telegramBotService.start();

  app.use(express.json());
  
  // 静态页面托管
  app.use(express.static(path.resolve(__dirname, '../public')));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // --- API 路由 ---
  app.get('/api/history', async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    try {
      const data = await historyService.getHistoryList({
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      res.json(data);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get('/api/stocks', async (req, res) => {
    try {
      const list = await stockService.getWatchlist();
      res.json(list);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post('/api/stocks', async (req, res) => {
    try {
      const result = await stockService.addToWatchlist(req.body.symbol);
      res.json(result);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get('/api/analyze/:code', async (req, res) => {
    try {
      const result = await analysisPipeline.processSingleStock(req.params.code);
      res.json(result);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // 启动服务
  app.listen(port, () => {
    logger.info(`🚀 DSA 控制台已启动: http://localhost:${port}`);
  });
};

startServer().catch(err => {
  console.error('❌ 服务器崩溃:', err);
  process.exit(1);
});
