import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// 1. 导入核心配置
import { config, refreshConfig } from './core/config.js';
refreshConfig();

import { logger, setupLogging } from './core/logger.js';
import { connectDatabase } from './core/database.js';
import { authService, sessionGuard } from './core/auth.js';
import { analysisPipeline } from './services/analysisPipeline.js';
import { historyService } from './services/historyService.js';
import { stockService } from './services/stockService.js';
import { strategyManager } from './services/strategyManager.js';
import { scheduler } from './services/scheduler.js';
import { telegramBotService } from './services/telegramBot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const startServer = async () => {
  const app = express();
  const port = config.PORT || 8080;

  setupLogging('web_server');
  
  // 2. 初始化基础设施
  await connectDatabase();
  await strategyManager.loadStrategies(path.resolve(process.cwd(), 'strategies'));

  // 3. 启动后台服务
  scheduler.start();
  
  // 启动 Bot (带延迟启动，防止与 Web 启动冲突)
  setTimeout(() => {
    telegramBotService.start();
  }, 2000);

  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, '../public')));

  // --- 🔍 监控日志 ---
  app.use((req, res, next) => {
    logger.info(`[Request] ${req.method} ${req.url}`);
    next();
  });

  // --- 公开 API ---
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', api: 'v2', port });
  });

  app.post('/manage/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const token = await authService.login(username, password);
      if (token) res.json({ success: true, token });
      else res.status(401).json({ success: false, message: '用户名或密码错误' });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  // --- 受保护 API ---
  app.use('/api', sessionGuard);

  app.get('/api/history', async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const data = await historyService.getHistoryList({
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      res.json(data);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get('/api/stocks', async (req, res) => {
    try {
      const list = await stockService.getWatchlistWithQuotes();
      res.json(list);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.post('/api/stocks', async (req, res) => {
    try {
      const result = await stockService.addToWatchlist(req.body.symbol);
      res.json(result);
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.delete('/api/stocks/:symbol', async (req, res) => {
    try {
      await stockService.removeFromWatchlist(req.params.symbol);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: String(e) }); }
  });

  app.get('/api/analyze/:code', async (req, res) => {
    try {
      const result = await analysisPipeline.processSingleStock(req.params.code);
      res.json(result);
    } catch (error) { res.status(500).json({ error: String(error) }); }
  });

  app.listen(port, () => {
    logger.info(`🚀 DSA 生产级环境已就绪，运行在: http://localhost:${port}`);
  });
};

startServer().catch(err => {
  console.error('❌ DSA 系统崩溃:', err);
  process.exit(1);
});
