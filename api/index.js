import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// 🚀 补丁：Vercel 环境强制 Key (如果环境变量未生效)
if (!process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = 'AIzaSyAbMWdn9A3RnZPlkviJKyqXcs3dlOkCQdM';
}

// 注意：Vercel 部署时会先运行 npm run build，产物在 dist 目录
import { authService, sessionGuard } from '../dist/core/auth.js';
import { analysisPipeline } from '../dist/services/analysisPipeline.js';
import { historyService } from '../dist/services/historyService.js';
import { stockService } from '../dist/services/stockService.js';
import { connectDatabase } from '../dist/core/database.js';
import { logger } from '../dist/core/logger.js';

const app = express();
app.use(express.json());

// 数据库连接缓存 (Serverless 最佳实践)
let isConnected = false;
const ensureDb = async () => {
  if (!isConnected) {
    await connectDatabase();
    isConnected = true;
  }
};

// --- 公开管理路由 ---

app.post('/manage/login', async (req, res) => {
  await ensureDb();
  const { username, password } = req.body;
  try {
    const token = await authService.login(username, password);
    if (token) res.json({ success: true, token });
    else res.status(401).json({ success: false, message: '用户名或密码错误' });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', runtime: 'vercel' });
});

/**
 * Vercel Cron 自动触发
 */
app.get('/api/cron/daily', async (req, res) => {
  await ensureDb();
  try {
    // 异步执行
    analysisPipeline.runDailyAutomatedTask();
    res.json({ message: 'triggered' });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// --- 受保护 API ---
app.use('/api', sessionGuard);

app.get('/api/stocks', async (req, res) => {
  await ensureDb();
  try {
    const list = await stockService.getWatchlistWithQuotes();
    res.json(list);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get('/api/analyze/:code', async (req, res) => {
  await ensureDb();
  try {
    const result = await analysisPipeline.processSingleStock(req.params.code);
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// 导出 Express
export default app;
