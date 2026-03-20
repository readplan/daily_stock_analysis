import cron from 'node-cron';
import { analysisPipeline } from './analysisPipeline.js';
import { marketAnalyzer } from './marketAnalyzer.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { notificationService } from './notificationService.js';

/**
 * ===================================
 * 定时任务调度器 (Node.js/TypeScript 版)
 * ===================================
 */

export class Scheduler {
  /**
   * 启动所有定时任务
   */
  start() {
    logger.info('⏰ 定时任务调度器已启动');

    // 1. 每日收盘分析 (美东时间 16:30 -> 假设服务器时间是北京时间 04:30)
    // 这里我们先硬编码一个时间，后续可以从配置读取
    cron.schedule('30 18 * * 1-5', async () => {
      logger.info('🔔 触发每日自动分析任务...');
      try {
        // 先进行大盘分析
        const marketReport = await marketAnalyzer.runDailyReview();
        await notificationService.send(marketReport);

        // 再进行个股分析
        await analysisPipeline.processBatchAndNotify(config.STOCK_LIST);
      } catch (e) {
        logger.error(`定时任务执行失败: ${e}`);
      }
    });

    // 2. 每小时健康检查心跳
    cron.schedule('0 * * * *', () => {
      logger.debug('💓 调度器运行中...');
    });
  }
}

export const scheduler = new Scheduler();
