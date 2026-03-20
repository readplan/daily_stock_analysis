# -*- coding: utf-8 -*-
"""
===================================
数据源策略层 - 包初始化
===================================

本包实现策略模式管理多个数据源，实现：
1. 统一的数据获取接口
2. 自动故障切换
3. 防封禁流控策略

数据源：
1. YfinanceFetcher (Priority 0) - 来自 yfinance 库，主要支持美股。
"""

from .base import BaseFetcher, DataFetcherManager
from .yfinance_fetcher import YfinanceFetcher
from .us_index_mapping import is_us_index_code, is_us_stock_code, get_us_index_yf_symbol, US_INDEX_MAPPING

__all__ = [
    'BaseFetcher',
    'DataFetcherManager',
    'YfinanceFetcher',
    'is_us_index_code',
    'is_us_stock_code',
    'get_us_index_yf_symbol',
    'US_INDEX_MAPPING',
]
