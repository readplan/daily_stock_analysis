import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * ===================================
 * 数据库连接管理 (MongoDB/Mongoose)
 * ===================================
 */

export const connectDatabase = async () => {
  if (!config.MONGODB_URI) {
    logger.warn('⚠️ 未配置 MONGODB_URI，系统将运行在无持久化模式下');
    return;
  }

  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    logger.info(`✅ MongoDB 已连接: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB 连接失败: ${error instanceof Error ? error.message : error}`);
    // 在 Vercel 或生产环境下，如果数据库连不上，通常需要抛出异常
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('🌐 MongoDB 连接断开，尝试重新连接...');
});
