import puppeteer from 'puppeteer';
import { markdownToHtmlDocument } from './formatters.js';
import { logger } from '../core/logger.js';

/**
 * ===================================
 * Markdown 转图片工具 (Node.js/Puppeteer 版)
 * ===================================
 */

export class MarkdownToImage {
  /**
   * 将 Markdown 转换为 PNG 图片字节流
   */
  async convert(markdownText: string): Promise<Buffer | null> {
    const html = markdownToHtmlDocument(markdownText);
    
    let browser = null;
    try {
      // 启动无头浏览器
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      });

      const page = await browser.newPage();
      
      // 设置视口宽度
      await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
      
      // 设置 HTML 内容
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // 动态计算页面高度
      const bodyHandle = await page.$('body');
      if (!bodyHandle) throw new Error('Could not find body element');
      
      const boundingBox = await bodyHandle.boundingBox();
      const height = boundingBox ? Math.ceil(boundingBox.height) + 40 : 1200;

      // 截图
      const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage: true,
        clip: boundingBox ? {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: height
        } : undefined
      }) as Buffer;

      return imageBuffer;
    } catch (e) {
      logger.error(`[md2img] 转换失败: ${e}`);
      return null;
    } finally {
      if (browser) await browser.close();
    }
  }
}

export const md2img = new MarkdownToImage();
