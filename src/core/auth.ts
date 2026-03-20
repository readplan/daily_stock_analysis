import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserModel } from '../schemas/user.js';
import { logger } from './logger.js';

/**
 * ===================================
 * 身份认证核心逻辑 (Session & Telegram 绑定版)
 * ===================================
 */

export class AuthService {
  /**
   * 用户登录：验证密码并返回随机 Session
   */
  async login(username: string, password: string): Promise<string | null> {
    const user = await UserModel.findOne({ username });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    // 生成 64 位随机 Token 作为 localSession
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // 更新到数据库，设置 7 天有效期
    user.sessionToken = sessionToken;
    user.sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return sessionToken;
  }

  /**
   * 验证 Session
   */
  async validateSession(token: string): Promise<any | null> {
    const user = await UserModel.findOne({ 
      sessionToken: token,
      sessionExpires: { $gt: new Date() } 
    });
    return user;
  }

  /**
   * 绑定 Telegram ID
   */
  async bindTelegram(username: string, telegramId: string): Promise<boolean> {
    const user = await UserModel.findOne({ username });
    if (!user) return false;

    user.telegramId = telegramId;
    await user.save();
    return true;
  }

  /**
   * 通过 Telegram ID 免登录识别用户
   */
  async getUserByTelegramId(telegramId: string): Promise<any | null> {
    return await UserModel.findOne({ telegramId: String(telegramId) });
  }

  /**
   * 初始化检查 (空方法，保留用于后续可能的自检逻辑)
   */
  async initAdmin() {
    // 逻辑已移除，改由外部脚本或手动维护数据库用户
  }
}

export const authService = new AuthService();

/**
 * Express 中间件：强制 Session 校验
 */
export const sessionGuard = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-session-token'] || req.query.session;
  
  if (!token) {
    return res.status(401).json({ error: 'auth_required', message: '请先登录' });
  }

  const user = await authService.validateSession(token as string);
  if (!user) {
    return res.status(401).json({ error: 'invalid_session', message: 'Session 已过期' });
  }

  (req as any).user = user;
  next();
};
