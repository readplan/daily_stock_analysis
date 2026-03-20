import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// 强制补丁
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'AIzaSyDizTJyOGNfMzJTIkrFoHVbnFwAKqaKbDo';
}

import { config, refreshConfig } from './core/config.js';
refreshConfig();

import { logger, setupLogging } from './core/logger.js';
import { connectDatabase } from './core/database.js';
import { authService, sessionGuard } from './core/auth.js';
import { analysisPipeline } from './services/analysisPipeline.js';
import { historyService } from './services/historyService.js';
import { stockService } from './services/stockService.js';
import { telegramBotService } from './services/telegramBot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const startServer = async () => {
  const app = express();
  const port = config.PORT || 8000;

  setupLogging('web_server');
  await connectDatabase();
  
  // 初始化管理员账户
  await authService.initAdmin();
  
  telegramBotService.start();

  app.use(express.json());
  app.use(express.static(path.resolve(__dirname, '../public')));

  // --- 公开 API ---

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', auth: 'session-based' });
  });

  /**
   * 登录接口：返回 Session Token
   * POST /api/login
   */
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const token = await authService.login(username, password);
      if (token) {
        res.json({ success: true, token });
      } else {
        res.status(401).json({ success: false, message: '用户名或密码错误' });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // --- 受保护 API (需要 X-Session-Token Header) ---
  
  app.use('/api', sessionGuard); // 保护所有以 /api 开头的后续路由

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

  app.get('/api/analyze/:code', async (req, res) => {
    try {
      const result = await analysisPipeline.processSingleStock(req.params.code);
      res.json(result);
    } catch (error) { res.status(500).json({ error: String(error) }); }
  });

  app.listen(port, () => {
    logger.info(`🚀 DSA 认证系统已就绪，运行端口: ${port}`);
  });
};

startServer().catch(err => {
  console.error(err);
  process.exit(1);
});
