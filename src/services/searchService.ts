import { tavily } from '@tavily/core';
import axios from 'axios';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

/**
 * ===================================
 * 搜索服务 (Node.js/TypeScript 版)
 * ===================================
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export class SearchService {
  /**
   * 使用 Tavily 搜索股票新闻
   */
  async searchStockNews(ticker: string, query?: string): Promise<SearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY || (process.env.TAVILY_API_KEYS?.split(',')[0]);
    if (!apiKey) {
      logger.warn('⚠️ 未配置 TAVILY_API_KEY，搜索功能已禁用');
      return [];
    }

    const searchQuery = query || `${ticker} stock latest news and analyst ratings`;
    logger.info(`[Search] 正在搜索: ${searchQuery}`);

    try {
      const tvly = tavily({ apiKey });
      const response = await tvly.search(searchQuery, {
        searchDepth: "advanced",
        maxResults: 5,
        topic: "news",
        days: 3
      });

      return response.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: (r as any).published_date
      }));
    } catch (e) {
      logger.error(`[Search] Tavily 搜索失败: ${e}`);
      return [];
    }
  }

  /**
   * 使用 SerpAPI (Google) 搜索作为备选
   */
  async searchSerp(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.SERPAPI_API_KEY || (process.env.SERPAPI_API_KEYS?.split(',')[0]);
    if (!apiKey) return [];

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: apiKey,
          engine: 'google',
          tbs: 'qdr:w' // 过去一周
        }
      });

      const results = response.data.organic_results || [];
      return results.map((r: any) => ({
        title: r.title,
        url: r.link,
        content: r.snippet,
        score: 1
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * 为 AI 构建上下文
   */
  async getStockContext(ticker: string): Promise<string> {
    const results = await this.searchStockNews(ticker);
    if (results.length === 0) return "未搜寻到近期重大新闻。";

    let context = `【${ticker} 近期联网搜索结果】\n`;
    results.forEach((r, i) => {
      context += `${i + 1}. ${r.title}\n   摘要: ${r.content.substring(0, 200)}...\n   链接: ${r.url}\n\n`;
    });
    return context;
  }
}

export const searchService = new SearchService();
