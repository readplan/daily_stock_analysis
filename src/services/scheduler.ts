import cron from 'node-cron';
import { analysisPipeline } from './analysisPipeline.js';
import { marketAnalyzer } from './marketAnalyzer.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { notificationService } from './notificationService.js';

/**
 * ===================================
 * 定时任务调度器 (修复版)
 * ===================================
 */

export class Scheduler {
  start() {
    logger.info('⏰ 定时任务调度器已启动');

    // 每日收盘分析
    cron.schedule('30 18 * * 1-5', async () => {
      logger.info('🔔 触发每日自动分析任务...');
      try {
        // 大盘复盘 (这里目前返回字符串，我们直接推送到 Telegram)
        const marketReport = await marketAnalyzer.runDailyReview();
        await notificationService.sendToTelegram(marketReport);

        // 执行个股批量分析与推送
        await analysisPipeline.runDailyAutomatedTask();
      } catch (e) {
        logger.error(`定时任务执行失败: ${e}`);
      }
    });

    cron.schedule('0 * * * *', () => {
      logger.debug('💓 调度器运行中...');
    });
  }
}

export const scheduler = new Scheduler();
