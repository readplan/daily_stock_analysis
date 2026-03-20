import { config } from '../dist/core/config.js';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { analysisPipeline } from '../dist/services/analysisPipeline.js';
import { historyService } from '../dist/services/historyService.js';
import { stockService } from '../dist/services/stockService.js';
import { connectDatabase } from '../dist/core/database.js';
import { logger } from '../dist/core/logger.js';

const app = express();
app.use(express.json());

let cachedDb = null;
const getDb = async () => {
  if (!cachedDb) cachedDb = await connectDatabase();
  return cachedDb;
};

// --- API 路由 ---

app.get('/api/health', async (req, res) => {
  await getDb();
  res.json({ status: 'ok', runtime: 'vercel-serverless' });
});

/**
 * Vercel Cron 触发接口
 * 用于每日定时自动分析
 */
app.get('/api/cron/daily', async (req, res) => {
  // 简单的 Vercel Cron 安全检查 (可选)
  // const authHeader = req.headers['authorization'];
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  await getDb();
  logger.info('⏰ Vercel Cron 触发每日自动分析任务');
  
  try {
    // 异步启动，不阻塞 Cron 响应超时
    analysisPipeline.processBatchAndNotify(config.STOCK_LIST);
    res.json({ message: '每日分析任务已成功触发', stocks: config.STOCK_LIST });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/analyze/:code', async (req, res) => {
  await getDb();
  try {
    const result = await analysisPipeline.processSingleStock(req.params.code);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/history', async (req, res) => {
  await getDb();
  const { page = 1, limit = 20 } = req.query;
  const data = await historyService.getHistoryList({
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });
  res.json(data);
});

app.get('/api/stocks', async (req, res) => {
  await getDb();
  const list = await stockService.getWatchlist();
  res.json(list);
});

export default app;
