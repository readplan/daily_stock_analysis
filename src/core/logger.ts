import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from './config.js';

/**
 * ===================================
 * 日志管理模块 (Node.js/TypeScript 版)
 * ===================================
 */

const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} | ${level.toUpperCase().padEnd(7)} | ${stack || message}`;
});

const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    logFormat
  ),
});

const fileTransport = new DailyRotateFile({
  dirname: config.LOG_DIR,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
});

const errorFileTransport = new DailyRotateFile({
  dirname: config.LOG_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
});

export const logger = winston.createLogger({
  level: config.LOG_LEVEL.toLowerCase(),
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport
  ],
});

export const setupLogging = (logPrefix: string = 'app') => {
  logger.info(`日志系统初始化完成 [Prefix: ${logPrefix}]`);
};
