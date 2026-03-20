# -*- coding: utf-8 -*-
"""
===================================
大盘复盘分析模块 - 美股版
===================================

职责：
1. 获取美股大盘指数数据（S&P 500, Nasdaq, Dow Jones）
2. 搜索美股市场新闻形成复盘情报
3. 使用大模型生成每日美股复盘报告
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List

import pandas as pd

from src.config import get_config
from src.search_service import SearchService
from src.core.market_profile import get_profile, MarketProfile
from src.core.market_strategy import get_market_strategy_blueprint
from data_provider.base import DataFetcherManager

logger = logging.getLogger(__name__)


@dataclass
class MarketIndex:
    """大盘指数数据"""
    code: str                    # 指数代码
    name: str                    # 指数名称
    current: float = 0.0         # 当前点位
    change: float = 0.0          # 涨跌点数
    change_pct: float = 0.0      # 涨跌幅(%)
    open: float = 0.0            # 开盘点位
    high: float = 0.0            # 最高点位
    low: float = 0.0             # 最低点位
    prev_close: float = 0.0      # 昨收点位
    volume: float = 0.0          # 成交量
    amount: float = 0.0          # 成交额
    amplitude: float = 0.0       # 振幅(%)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'code': self.code,
            'name': self.name,
            'current': self.current,
            'change': self.change,
            'change_pct': self.change_pct,
            'open': self.open,
            'high': self.high,
            'low': self.low,
            'volume': self.volume,
            'amount': self.amount,
            'amplitude': self.amplitude,
        }


@dataclass
class MarketOverview:
    """市场概览数据 (美股版)"""
    date: str                           # 日期
    indices: List[MarketIndex] = field(default_factory=list)  # 主要指数


class MarketAnalyzer:
    """
    大盘复盘分析器 (美股专用)
    """
    
    def __init__(
        self,
        search_service: Optional[SearchService] = None,
        analyzer=None,
        region: str = "us",
    ):
        self.config = get_config()
        self.search_service = search_service
        self.analyzer = analyzer
        self.data_manager = DataFetcherManager()
        self.region = "us" # 强制美股
        self.profile: MarketProfile = get_profile(self.region)
        self.strategy = get_market_strategy_blueprint(self.region)

    def get_market_overview(self) -> MarketOverview:
        """获取市场概览数据"""
        today = datetime.now().strftime('%Y-%m-%d')
        overview = MarketOverview(date=today)
        overview.indices = self._get_main_indices()
        return overview

    def _get_main_indices(self) -> List[MarketIndex]:
        """获取主要指数实时行情"""
        indices = []
        try:
            logger.info("[大盘] 获取美股指数行情...")
            data_list = self.data_manager.get_main_indices(region="us")
            if data_list:
                for item in data_list:
                    index = MarketIndex(
                        code=item['code'],
                        name=item['name'],
                        current=item['current'],
                        change=item['change'],
                        change_pct=item['change_pct'],
                        open=item['open'],
                        high=item['high'],
                        low=item['low'],
                        prev_close=item['prev_close'],
                        volume=item.get('volume', 0.0),
                        amount=item.get('amount', 0.0),
                        amplitude=item.get('amplitude', 0.0)
                    )
                    indices.append(index)
        except Exception as e:
            logger.error(f"[大盘] 获取指数行情失败: {e}")
        return indices

    def search_market_news(self) -> List[Dict]:
        """搜索美股市场新闻"""
        if not self.search_service:
            return []
        
        all_news = []
        search_queries = self.profile.news_queries
        
        try:
            logger.info("[大盘] 开始搜索美股市场新闻...")
            for query in search_queries:
                response = self.search_service.search_stock_news(
                    stock_code="market",
                    stock_name="US market",
                    max_results=3,
                    focus_keywords=query.split()
                )
                if response and response.results:
                    all_news.extend(response.results)
            
        except Exception as e:
            logger.error(f"[大盘] 搜索市场新闻失败: {e}")
        return all_news
    
    def generate_market_review(self, overview: MarketOverview, news: List) -> str:
        """生成大盘复盘报告"""
        if not self.analyzer or not self.analyzer.is_available():
            return self._generate_template_review(overview, news)
        
        prompt = self._build_review_prompt(overview, news)
        logger.info("[大盘] 调用大模型生成美股复盘报告...")
        review = self.analyzer.generate_text(prompt, max_tokens=2048, temperature=0.7)

        if review:
            return self._inject_data_into_review(review, overview)
        else:
            return self._generate_template_review(overview, news)
    
    def _inject_data_into_review(self, review: str, overview: MarketOverview) -> str:
        """注入数据表格"""
        indices_block = self._build_indices_block(overview)
        import re
        # 尝试在第一个标题后注入
        parts = re.split(r'(###\s*.*?\n)', review, maxsplit=2)
        if len(parts) >= 3:
            return parts[0] + parts[1] + "\n" + indices_block + "\n\n" + parts[2]
        return review + "\n\n" + indices_block

    def _build_indices_block(self, overview: MarketOverview) -> str:
        """构建指数行情表格"""
        if not overview.indices:
            return ""
        lines = [
            "| Index | Last | Change% |",
            "|-------|------|---------|"]
        for idx in overview.indices:
            arrow = "🔴" if idx.change_pct < 0 else "🟢" if idx.change_pct > 0 else "⚪"
            lines.append(f"| {idx.name} | {idx.current:.2f} | {arrow} {idx.change_pct:+.2f}% |")
        return "\n".join(lines)

    def _build_review_prompt(self, overview: MarketOverview, news: List) -> str:
        """构建美股复盘 Prompt"""
        indices_text = ""
        for idx in overview.indices:
            direction = "↑" if idx.change_pct > 0 else "↓" if idx.change_pct < 0 else "-"
            indices_text += f"- {idx.name}: {idx.current:.2f} ({direction}{abs(idx.change_pct):.2f}%)\n"
        
        news_text = ""
        for i, n in enumerate(news[:6], 1):
            title = getattr(n, 'title', n.get('title', '')) if hasattr(n, 'title') or isinstance(n, dict) else ''
            snippet = getattr(n, 'snippet', n.get('snippet', '')) if hasattr(n, 'snippet') or isinstance(n, dict) else ''
            news_text += f"{i}. {title}\n   {snippet}\n"

        return f"""You are a professional US market analyst. Please produce a concise US market recap report.

---
# Market Data
## Date: {overview.date}
## Major Indices
{indices_text if indices_text else "No index data"}

## Market News
{news_text if news_text else "No relevant news"}

{self.strategy.to_prompt_block()}

---
# Output Structure
## {overview.date} US Market Recap
### 1. Market Summary
### 2. Index Commentary (S&P 500, Nasdaq, Dow)
### 3. Sector/Theme Highlights
### 4. Outlook & Strategy
---
Output pure Markdown directly.
"""
    
    def _generate_template_review(self, overview: MarketOverview, news: List) -> str:
        """模板生成报告"""
        indices_text = ""
        for idx in overview.indices[:4]:
            direction = "↑" if idx.change_pct > 0 else "↓" if idx.change_pct < 0 else "-"
            indices_text += f"- **{idx.name}**: {idx.current:.2f} ({direction}{abs(idx.change_pct):.2f}%)\n"
        
        report = f"""## {overview.date} US Market Recap

### 1. Market Summary
Indices performance today:
{indices_text}

### 2. Strategy
{self.strategy.to_markdown_block()}

---
*Generated at: {datetime.now().strftime('%H:%M')}*
"""
        return report
    
    def run_daily_review(self) -> str:
        logger.info("========== 开始美股复盘分析 ==========")
        overview = self.get_market_overview()
        news = self.search_market_news()
        report = self.generate_market_review(overview, news)
        logger.info("========== 美股复盘分析完成 ==========")
        return report
