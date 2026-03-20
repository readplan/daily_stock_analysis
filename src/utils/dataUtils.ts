/**
 * ===================================
 * 数据处理工具 (Node.js/TypeScript 版)
 * ===================================
 */

const MODEL_PLACEHOLDER_VALUES = new Set(["unknown", "error", "none", "null", "n/a"]);

/**
 * 标准化模型名称
 */
export const normalizeModelUsed = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || MODEL_PLACEHOLDER_VALUES.has(text.toLowerCase())) return null;
  return text;
};

/**
 * 尽力解析 JSON 字段
 */
export const parseJsonField = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
};

/**
 * 格式化百分比
 */
export const formatPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '0.00%';
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
};
