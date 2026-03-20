/**
 * ===================================
 * 股票代码工具 (Node.js/TypeScript 版)
 * ===================================
 */

// 美股代码正则：1-5 个大写字母，可选 .X 后缀（如 BRK.B）
const US_STOCK_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;

// 用户输入 -> [Yahoo Finance 符号, 中文名称]
export const US_INDEX_MAPPING: Record<string, [string, string]> = {
  'SPX': ['^GSPC', '标普500指数'],
  '^GSPC': ['^GSPC', '标普500指数'],
  'GSPC': ['^GSPC', '标普500指数'],
  'DJI': ['^DJI', '道琼斯工业指数'],
  '^DJI': ['^DJI', '道琼斯工业指数'],
  'DJIA': ['^DJI', '道琼斯工业指数'],
  'IXIC': ['^IXIC', '纳斯达克综合指数'],
  '^IXIC': ['^IXIC', '纳斯达克综合指数'],
  'NASDAQ': ['^IXIC', '纳斯达克综合指数'],
  'NDX': ['^NDX', '纳斯达克100指数'],
  '^NDX': ['^NDX', '纳斯达克100指数'],
  'VIX': ['^VIX', 'VIX恐慌指数'],
  '^VIX': ['^VIX', 'VIX恐慌指数'],
  'RUT': ['^RUT', '罗素2000指数'],
  '^RUT': ['^RUT', '罗素2000指数'],
};

/**
 * 判断代码是否为北交所代码
 */
export const isBseCode = (code: string): boolean => {
  const c = code.split('.')[0].toUpperCase();
  return c.startsWith('8') || c.startsWith('4') || c.startsWith('920');
};

/**
 * 判断代码是否为美股指数符号
 */
export const isUsIndexCode = (code: string): boolean => {
  return (code || '').trim().toUpperCase() in US_INDEX_MAPPING;
};

/**
 * 判断代码是否为美股股票符号（排除美股指数）
 */
export const isUsStockCode = (code: string): boolean => {
  const normalized = (code || '').trim().toUpperCase();
  if (normalized in US_INDEX_MAPPING) return false;
  return US_STOCK_PATTERN.test(normalized);
};

/**
 * 获取美股指数的 Yahoo Finance 符号与中文名称
 */
export const getUsIndexYfSymbol = (code: string): [string | null, string | null] => {
  const normalized = (code || '').trim().toUpperCase();
  return US_INDEX_MAPPING[normalized] || [null, null];
};

/**
 * 转换股票代码为 Yahoo Finance 格式
 */
export const convertStockCodeToYf = (stockCode: string): string => {
  let code = stockCode.trim().toUpperCase();

  // 美股指数
  const [yfSymbol] = getUsIndexYfSymbol(code);
  if (yfSymbol) return yfSymbol;

  // 美股股票
  if (isUsStockCode(code)) return code;

  // 港股: HK前缀 -> .HK后缀 (补齐到4位，yahoo-finance2 通常需要 0700.HK 这种格式)
  if (code.startsWith('HK')) {
    let hkCode = code.substring(2).replace(/^0+/, '');
    if (hkCode === '') hkCode = '0';
    hkCode = hkCode.padStart(4, '0');
    return `${hkCode}.HK`;
  }

  // 已经包含后缀
  if (code.includes('.SS') || code.includes('.SZ') || code.includes('.HK') || code.includes('.BJ')) {
    return code;
  }

  // A股去除 .SH 后缀
  code = code.replace('.SH', '');

  // ETF 判断逻辑
  if (code.length === 6) {
    if (['51', '52', '56', '58'].some(prefix => code.startsWith(prefix))) {
      return `${code}.SS`;
    }
    if (['15', '16', '18'].some(prefix => code.startsWith(prefix))) {
      return `${code}.SZ`;
    }
  }

  // 北交所
  if (isBseCode(code)) {
    return `${code.split('.')[0]}.BJ`;
  }

  // A股前缀判断
  if (['600', '601', '603', '688'].some(prefix => code.startsWith(prefix))) {
    return `${code}.SS`;
  } else if (['000', '002', '300'].some(prefix => code.startsWith(prefix))) {
    return `${code}.SZ`;
  }

  // 默认兜底深市
  return `${code}.SZ`;
};
