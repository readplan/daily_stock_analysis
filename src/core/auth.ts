import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { logger } from './logger.js';
import { Request, Response, NextFunction } from 'express';

/**
 * ===================================
 * 身份认证模块 (JWT 版)
 * ===================================
 */

const JWT_SECRET = process.env.JWT_SECRET || 'dsa-default-secret-change-me';
const SESSION_EXPIRE = '24h';

/**
 * 生成登录 Token
 */
export const createToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRE });
};

/**
 * 校验 Token 中间件
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 检查是否启用了认证
  if (process.env.ADMIN_AUTH_ENABLED !== 'true') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
};

/**
 * 密码哈希与校验工具
 */
export const authUtils = {
  hashPassword: async (pwd: string) => await bcrypt.hash(pwd, 10),
  comparePassword: async (pwd: string, hash: string) => await bcrypt.compare(pwd, hash),
};
