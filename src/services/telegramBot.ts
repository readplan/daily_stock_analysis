import { Telegraf } from 'telegraf';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { authService } from '../core/auth.js';
import { analysisPipeline } from './analysisPipeline.js';

/**
 * ===================================
 * Telegram Bot (身份增强版)
 * ===================================
 */

export class TelegramBotService {
  private bot?: Telegraf;

  start() {
    const token = config.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    this.bot = new Telegraf(token);

    // 1. 自动识别中间件
    this.bot.use(async (ctx, next) => {
      const tgId = ctx.from?.id;
      if (!tgId) return next();

      const user = await authService.getUserByTelegramId(String(tgId));
      (ctx as any).dbUser = user;
      return next();
    });

    this.bot.start((ctx) => {
      const user = (ctx as any).dbUser;
      if (user) {
        ctx.reply(`✅ 认证成功！欢迎回来，${user.username}。您可以直接发送股票代码进行分析。`);
      } else {
        ctx.reply(`👋 欢迎！您的 Telegram ID 是: \`${ctx.from.id}\`。\n\n请在 Web 控制台绑定此 ID 以开启智能分析权限。`);
      }
    });

    // 2. 绑定指令 (仅限演示，通常在 Web 绑定更安全)
    this.bot.command('bind', async (ctx) => {
      const text = (ctx as any).update.message.text;
      const username = text.split(' ')[1];
      if (!username) return ctx.reply('请输入用户名: /bind <username>');
      
      const success = await authService.bindTelegram(username, String(ctx.from.id));
      if (success) ctx.reply('🎉 绑定成功！您现在拥有免登录分析权限。');
      else ctx.reply('❌ 绑定失败，请检查用户名是否正确。');
    });

    // 3. 需要权限的分析逻辑
    this.bot.on('text', async (ctx) => {
      const user = (ctx as any).dbUser;
      if (!user) {
        return ctx.reply('⛔ 权限不足。请先在 Web 控制台绑定您的 Telegram ID。');
      }

      const ticker = ctx.message.text.trim().toUpperCase();
      if (/^[A-Z]{1,5}$/.test(ticker)) {
        ctx.reply(`🔍 正在为 ${user.username} 分析 ${ticker}...`);
        try {
          const result = await analysisPipeline.processSingleStock(ticker);
          ctx.replyWithMarkdown(`📊 *${result.name}* 研判报告\n建议: *${result.operation_advice}*\n结论: ${result.analysis_summary}`);
        } catch (e) {
          ctx.reply('分析异常，请稍后再试。');
        }
      }
    });

    this.bot.launch();
    logger.info('🤖 认证版 Telegram Bot 已启动');
  }
}

export const telegramBotService = new TelegramBotService();
