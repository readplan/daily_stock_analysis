import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserModel } from '../schemas/user.js';
import { logger } from './logger.js';

/**
 * ===================================
 * 身份认证核心逻辑 (精简版)
 * ===================================
 */

export class AuthService {
  async login(username: string, password: string): Promise<string | null> {
    // 忽略大小写进行查找
    const user = await UserModel.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    user.sessionToken = sessionToken;
    user.sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return sessionToken;
  }

  async validateSession(token: string): Promise<any | null> {
    const user = await UserModel.findOne({ 
      sessionToken: token,
      sessionExpires: { $gt: new Date() } 
    });
    return user;
  }

  async bindTelegram(username: string, telegramId: string): Promise<boolean> {
    const user = await UserModel.findOne({ username });
    if (!user) return false;
    user.telegramId = telegramId;
    await user.save();
    return true;
  }

  async getUserByTelegramId(telegramId: string): Promise<any | null> {
    return await UserModel.findOne({ telegramId: String(telegramId) });
  }
}

export const authService = new AuthService();

/**
 * Express 中件：强制 Session 校验
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
