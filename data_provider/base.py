# -*- coding: utf-8 -*-
"""
===================================
数据源基类与管理层
===================================

职责：
1. 定义数据源标准接口 (BaseFetcher)
2. 管理多个数据源实例 (DataFetcherManager)
3. 实现自动故障切换 (Failover) 和 优先级调度
4. 统一的数据模型转换
"""

import logging
import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple, Callable
from datetime import datetime, timedelta
import pandas as pd
from threading import Lock, Semaphore
from threading import Thread

from src.analyzer import AnalysisResult, normalize_model_used
from src.utils.stock_utils import (
    normalize_stock_code, 
    summarize_exception,
    is_meaningful_stock_name
)

logger = logging.getLogger(__name__)

# 静态股票名称映射（兜底用）
STOCK_NAME_MAP = {
    "AAPL": "苹果",
    "TSLA": "特斯拉",
    "NVDA": "英伟达",
    "MSFT": "微软",
    "GOOGL": "谷歌",
    "AMZN": "亚马逊",
    "META": "Meta",
}

class DataFetchError(Exception):
    """数据获取异常"""
    pass

class BaseFetcher(ABC):
    """数据源适配器基类"""
    
    def __init__(self):
        self.name = self.__class__.__name__
        self.priority = 10  # 默认优先级，越小越优先
        
    @abstractmethod
    def get_daily_data(
        self, 
        stock_code: str, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None,
        days: int = 30
    ) -> Optional[pd.DataFrame]:
        """获取日线数据"""
        pass

    def get_realtime_quote(self, stock_code: str) -> Any:
        """获取实时行情（可选实现）"""
        return None

    def get_stock_name(self, stock_code: str) -> Optional[str]:
        """获取股票中文名称（可选实现）"""
        return None


class DataFetcherManager:
    """
    数据源管理器 (Singleton)
    
    采用策略模式，统一管理所有数据获取请求。
    """
    
    _instance: Optional['DataFetcherManager'] = None
    _lock: Lock = Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DataFetcherManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
            
    def __init__(self):
        if self._initialized:
            return
            
        self._fetchers: List[BaseFetcher] = []
        self._stock_name_cache: Dict[str, str] = {}
        
        # 基础并发限制（用于基本面聚合等）
        self._fundamental_timeout_slots = Semaphore(16)
        self._fundamental_cache: Dict[str, Dict[str, Any]] = {}
        self._fundamental_cache_lock = Lock()

        self._init_default_fetchers()
        self._initialized = True
        
    def _init_default_fetchers(self) -> None:
        """
        初始化默认数据源列表
        
        目前仅支持 YfinanceFetcher (美股)。
        """
        from .yfinance_fetcher import YfinanceFetcher
        
        yfinance = YfinanceFetcher()
        yfinance.priority = 0

        # 初始化数据源列表
        self._fetchers = [
            yfinance,
        ]

        # 按优先级排序
        self._fetchers.sort(key=lambda f: f.priority)

        # 构建优先级说明
        priority_info = ", ".join([f"{f.name}(P{f.priority})" for f in self._fetchers])
        logger.info(f"已初始化 {len(self._fetchers)} 个数据源（按优先级）: {priority_info}")
    
    def get_daily_data(
        self, 
        stock_code: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        days: int = 30
    ) -> Tuple[pd.DataFrame, str]:
        """
        获取日线数据 (YfinanceFetcher)
        """
        request_start = time.time()
        errors = []

        for attempt, fetcher in enumerate(self._fetchers, start=1):
            try:
                df = fetcher.get_daily_data(
                    stock_code=stock_code,
                    start_date=start_date,
                    end_date=end_date,
                    days=days
                )
                
                if df is not None and not df.empty:
                    elapsed = time.time() - request_start
                    logger.info(
                        f"[数据源完成] {stock_code} 使用 [{fetcher.name}] 获取成功: "
                        f"rows={len(df)}, elapsed={elapsed:.2f}s"
                    )
                    return df, fetcher.name
                else:
                    errors.append(f"[{fetcher.name}] 返回空数据")
            except Exception as e:
                error_type, error_reason = summarize_exception(e)
                errors.append(f"[{fetcher.name}] ({error_type}) {error_reason}")

        # 所有数据源都失败
        error_summary = f"{stock_code} 获取失败:\n" + "\n".join(errors)
        raise DataFetchError(error_summary)

    def get_realtime_quote(self, stock_code: str):
        """
        获取实时行情数据 (YfinanceFetcher)
        """
        from src.config import get_config
        config = get_config()

        if not config.enable_realtime_quote:
            return None

        for fetcher in self._fetchers:
            if fetcher.name == "YfinanceFetcher":
                try:
                    quote = fetcher.get_realtime_quote(stock_code)
                    if quote is not None:
                        return quote
                except Exception as e:
                    logger.warning(f"[实时行情] {stock_code} 获取失败: {e}")
                break
        return None

    def get_chip_distribution(self, stock_code: str):
        """目前美股不支持筹码分布"""
        return None

    def get_stock_name(self, stock_code: str, allow_realtime: bool = True) -> Optional[str]:
        """获取股票名称"""
        stock_code = normalize_stock_code(stock_code)
        
        if stock_code in self._stock_name_cache:
            return self._stock_name_cache[stock_code]
        
        # 1. 静态映射
        static_name = STOCK_NAME_MAP.get(stock_code)
        if static_name:
            self._stock_name_cache[stock_code] = static_name
            return static_name

        # 2. 尝试从实时行情获取
        if allow_realtime:
            quote = self.get_realtime_quote(stock_code)
            if quote and hasattr(quote, 'name'):
                name = quote.name
                if is_meaningful_stock_name(name, stock_code):
                    self._stock_name_cache[stock_code] = name
                    return name

        # 3. 尝试数据源
        for fetcher in self._fetchers:
            try:
                name = fetcher.get_stock_name(stock_code)
                if name and is_meaningful_stock_name(name, stock_code):
                    self._stock_name_cache[stock_code] = name
                    return name
            except:
                continue

        return stock_code

    def get_fundamental_context(self, stock_code: str, budget_seconds: Optional[float] = None) -> Dict[str, Any]:
        """获取基础面信息 (美股版)"""
        # 美股暂不启用复杂的基本面聚合流水线，返回基础结构
        return {
            "market": "us",
            "status": "partial",
            "valuation": {"status": "ok", "data": {}},
            "coverage": {"valuation": "ok"},
            "source_chain": [],
            "errors": []
        }

    def get_belong_boards(self, stock_code: str) -> List[Dict[str, Any]]:
        """美股暂不支持板块分类"""
        return []

    def prefetch_stock_names(self, stock_codes: List[str], use_bulk: bool = False) -> None:
        """预取股票名称"""
        for code in stock_codes:
            self.get_stock_name(code, allow_realtime=False)

    def get_main_indices(self, region: str = "us") -> List[Dict[str, Any]]:
        """获取主要指数行情"""
        for fetcher in self._fetchers:
            try:
                data = fetcher.get_main_indices(region="us")
                if data:
                    return data
            except:
                continue
        return []

    def get_market_stats(self) -> Dict[str, Any]:
        """美股市场统计暂未实现"""
        return {}
