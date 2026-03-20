import { Telegraf } from 'telegraf';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { analysisPipeline } from './analysisPipeline.js';

/**
 * ===================================
 * Telegram Bot 交互服务 (Node.js 版)
 * ===================================
 */

export class TelegramBotService {
  private bot?: Telegraf;

  start() {
    const token = config.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.warn('⚠️ 未配置 TELEGRAM_BOT_TOKEN，Telegram 交互功能未启动');
      return;
    }

    this.bot = new Telegraf(token);

    // 1. 开始指令
    this.bot.start((ctx) => {
      ctx.reply('🚀 欢迎使用美股智能分析助手！\n\n发送股票代码（如 AAPL）即可获取深度 AI 分析报告。');
    });

    // 2. 帮助指令
    this.bot.help((ctx) => {
      ctx.reply('指令列表：\n/analyze <代码> - 分析指定股票\n/market - 获取今日大盘复盘');
    });

    // 3. 股票分析指令
    this.bot.command('analyze', async (ctx) => {
      const text = ctx.update.message.text;
      const ticker = text.split(' ')[1]?.toUpperCase();
      
      if (!ticker) {
        return ctx.reply('请输入股票代码，例如: /analyze TSLA');
      }

      ctx.reply(`🔍 正在为您分析 ${ticker}，请稍候 (由 Gemini 3.0 驱动)...`);
      
      try {
        const result = await analysisPipeline.processSingleStock(ticker);
        const emoji = result.operation_advice.includes('买') ? '🟢' : '🟡';
        
        let message = `${emoji} *${result.name} (${result.code}) 分析报告*\n\n`;
        message += `📈 *建议*: ${result.operation_advice}\n`;
        message += `🎯 *情感评分*: ${result.sentiment_score}\n\n`;
        message += `📝 *核心结论*: \n${result.analysis_summary}\n\n`;
        message += `💡 *看点*: \n${result.key_points || '见详情'}\n\n`;
        message += `⚠️ *风险*: ${result.risk_warning || '无'}`;

        await ctx.replyWithMarkdown(message);
      } catch (e) {
        ctx.reply(`❌ 分析失败: ${ticker} 数据未找到或 AI 接口异常`);
      }
    });

    // 4. 监听纯文本消息 (直接输入代码也进行分析)
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text.trim().toUpperCase();
      // 正则匹配 1-5 位字母 (美股代码)
      if (/^[A-Z]{1,5}$/.test(text)) {
        ctx.reply(`🔍 识别到股票代码: ${text}，开始深度研判...`);
        try {
          const result = await analysisPipeline.processSingleStock(text);
          ctx.replyWithMarkdown(`✅ *${result.name}* 分析完成！\n建议: *${result.operation_advice}*\n评分: ${result.sentiment_score}\n\n结论: ${result.analysis_summary}`);
        } catch (e) {
          ctx.reply('抱歉，暂时无法获取该股票数据。');
        }
      }
    });

    this.bot.launch();
    logger.info('🤖 Telegram Bot 交互服务已启动');

    // 优雅退出
    process.once('SIGINT', () => this.bot?.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
  }
}

export const telegramBotService = new TelegramBotService();
