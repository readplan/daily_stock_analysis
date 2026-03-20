import axios from 'axios';
import FormData from 'form-data';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { AnalysisResult } from './aiAnalyzer.js';
import { reportRenderer } from './reportRenderer.js';
import { md2img } from '../utils/md2img.js';
import { DateTime } from 'luxon';

/**
 * ===================================
 * 通知推送服务 (高级版 - 支持图片发送)
 * ===================================
 */

export class NotificationService {
  /**
   * 发送消息到 Telegram (支持文字或图片)
   */
  async sendToTelegram(content: string, imageBuffer?: Buffer | null): Promise<boolean> {
    const token = config.TELEGRAM_BOT_TOKEN;
    const chatId = config.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return false;

    try {
      if (imageBuffer) {
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('photo', imageBuffer, { filename: 'report.png' });
        form.append('caption', content.substring(0, 1024)); // Telegram caption 限制
        await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
          headers: form.getHeaders()
        });
      } else {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          text: content,
          parse_mode: 'Markdown'
        });
      }
      return true;
    } catch (e) {
      logger.error(`Telegram 推送失败: ${e}`);
      return false;
    }
  }

  /**
   * 汇总分析并一键推送
   */
  async pushDailyReport(results: AnalysisResult[]) {
    const markdown = await reportRenderer.render(results);
    
    // 尝试生成图片报告
    let imageBuffer = null;
    try {
      imageBuffer = await md2img.convert(markdown);
    } catch (e) {
      logger.warn('生成图片报告失败，将回退到文字。');
    }

    await this.sendToTelegram(markdown, imageBuffer);
  }
}

export const notificationService = new NotificationService();
