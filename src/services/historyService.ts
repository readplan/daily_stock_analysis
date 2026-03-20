import { AnalysisModel } from '../schemas/analysis.js';
import { logger } from '../core/logger.js';

/**
 * ===================================
 * 历史记录查询服务 (Node.js/TypeScript 版)
 * ===================================
 */

export class HistoryService {
  /**
   * 分页获取历史分析列表
   */
  async getHistoryList(params: {
    stock_code?: string;
    start_date?: string;
    end_date?: string;
    page: number;
    limit: number;
  }) {
    const { stock_code, start_date, end_date, page, limit } = params;
    const query: any = {};

    if (stock_code) {
      query.code = stock_code.toUpperCase();
    }

    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = start_date;
      if (end_date) query.date.$lte = end_date;
    }

    try {
      const skip = (page - 1) * limit;
      const total = await AnalysisModel.countDocuments(query);
      const items = await AnalysisModel.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      return {
        total,
        page,
        limit,
        items
      };
    } catch (e) {
      logger.error(`[History] 查询历史列表失败: ${e}`);
      throw e;
    }
  }

  /**
   * 获取单条报告详情
   */
  async getHistoryDetail(id: string) {
    try {
      // 尝试按 MongoDB ID 查询，如果失败尝试按 code 查询最新的一条
      let result = await AnalysisModel.findById(id);
      if (!result) {
        result = await AnalysisModel.findOne({ code: id.toUpperCase() }).sort({ created_at: -1 });
      }
      return result;
    } catch (e) {
      logger.error(`[History] 查询历史详情失败: ${e}`);
      throw e;
    }
  }

  /**
   * 批量删除历史记录
   */
  async deleteHistoryRecords(ids: string[]) {
    try {
      const result = await AnalysisModel.deleteMany({ _id: { $in: ids } });
      return result.deletedCount;
    } catch (e) {
      logger.error(`[History] 删除历史记录失败: ${e}`);
      throw e;
    }
  }
}

export const historyService = new HistoryService();
