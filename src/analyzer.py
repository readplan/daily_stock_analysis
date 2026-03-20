# -*- coding: utf-8 -*-
"""
===================================
AI 核心分析引擎 - 决策仪表盘版
===================================

职责：
1. 整合多源数据（行情、技术面、基本面、舆情）
2. 驱动 LLM (Gemini/OpenAI) 进行深度研判
3. 生成结构化 JSON 决策报告
4. 执行结果解析与完整性校验
"""

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

import litellm
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import get_config
from src.utils.stock_utils import is_meaningful_stock_name

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

_PRICE_POS_KEYS = ["current_price", "ma5", "ma10", "ma20", "bias_ma5", "support_level", "resistance_level"]

def _is_value_placeholder(v: Any) -> bool:
    if v is None: return True
    if isinstance(v, (int, float)) and v == 0: return True
    if isinstance(v, str) and v.strip() in ("", "0", "0.0", "N/A", "None", "null"): return True
    return False

def fill_missing_price_position(
    result: Any,
    trend_result: Any = None,
    realtime_quote: Any = None,
) -> None:
    """Fill missing price_position fields (in-place)."""
    if not result:
        return
    try:
        if not result.dashboard:
            result.dashboard = {}
        dash = result.dashboard
        dp = dash.get("data_perspective") or {}
        dash["data_perspective"] = dp
        pp = dp.get("price_position") or {}

        computed: Dict[str, Any] = {}
        if trend_result:
            tr = trend_result if isinstance(trend_result, dict) else (
                trend_result.__dict__ if hasattr(trend_result, "__dict__") else {}
            )
            computed["ma5"] = tr.get("ma5")
            computed["ma10"] = tr.get("ma10")
            computed["ma20"] = tr.get("ma20")
            computed["bias_ma5"] = tr.get("bias_ma5")
            computed["current_price"] = tr.get("current_price")
            support_levels = tr.get("support_levels") or []
            resistance_levels = tr.get("resistance_levels") or []
            if support_levels:
                computed["support_level"] = support_levels[0]
            if resistance_levels:
                computed["resistance_level"] = resistance_levels[0]
        if realtime_quote:
            rq = realtime_quote if isinstance(realtime_quote, dict) else (
                realtime_quote.to_dict() if hasattr(realtime_quote, "to_dict") else {}
            )
            if _is_value_placeholder(computed.get("current_price")):
                computed["current_price"] = rq.get("price")

        filled = False
        for k in _PRICE_POS_KEYS:
            if _is_value_placeholder(pp.get(k)) and not _is_value_placeholder(computed.get(k)):
                pp[k] = computed[k]
                filled = True
        if filled:
            dp["price_position"] = pp
    except Exception as e:
        logger.warning("[price_position] Fill failed: %s", e)


@dataclass
class AnalysisResult:
    """AI 分析结果数据类 (美股版)"""
    code: str
    name: str
    sentiment_score: int
    trend_prediction: str
    operation_advice: str
    decision_type: str = "hold"
    confidence_level: str = "中"
    dashboard: Optional[Dict[str, Any]] = None
    analysis_summary: str = ""
    key_points: str = ""
    risk_warning: str = ""
    buy_reason: str = ""
    fundamental_analysis: str = ""
    sector_position: str = ""
    model_used: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None

    def get_emoji(self) -> str:
        emoji_map = {'买入': '🟢', '加仓': '🟢', '强烈买入': '💚', '持有': '🟡', '观望': '⚪', '减仓': '🟠', '卖出': '🔴'}
        return emoji_map.get(self.operation_advice, '⚪')

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__


class GeminiAnalyzer:
    """美股 AI 分析器"""

    SYSTEM_PROMPT = """你是一位专注于趋势交易的美股投资分析师，负责为纳斯达克和纽交所上市股票生成专业的【决策仪表盘】分析报告。

## 核心交易理念

### 1. 趋势交易
- 多头排列判定：MA5 > MA10 > MA20。顺势而为，关注主要趋势。

### 2. 严进策略
- 不追高原则：当股价偏离 MA5 超过 5% 时，直接判定为"观望"。
- 最佳切入点：乖离率 < 2% 为理想入场区间。

### 3. 关键宏观与基本面
- Fed Policy：关注联储政策动向、利率环境。
- Earnings：关注财报指引 (Guidance) 及分析师预期。

## 输出格式：决策仪表盘 JSON

请严格按照以下 JSON 格式输出：

```json
{
    "stock_name": "股票名称",
    "sentiment_score": 0-100整数,
    "trend_prediction": "强烈看多/看多/震荡/看空/强烈看空",
    "operation_advice": "买入/加仓/持有/减仓/卖出/观望",
    "decision_type": "buy/hold/sell",
    "confidence_level": "高/中/低",
    "dashboard": {
        "core_conclusion": {
            "one_sentence": "核心结论",
            "signal_type": "🟢买入信号/🟡持有观望/🔴卖出信号/⚠️风险警告",
            "time_sensitivity": "立即行动/今日内/本周内/不急",
            "position_advice": {"no_position": "建议", "has_position": "建议"}
        },
        "data_perspective": {
            "trend_status": {"ma_alignment": "状态", "is_bullish": true/false, "trend_score": 0-100},
            "price_position": {"current_price": 0, "ma5": 0, "ma10": 0, "ma20": 0, "bias_ma5": 0, "support_level": 0, "resistance_level": 0},
            "volume_analysis": {"volume_ratio": 0, "volume_status": "状态", "volume_meaning": "解读"}
        },
        "intelligence": {
            "latest_news": "摘要",
            "risk_alerts": [],
            "positive_catalysts": [],
            "earnings_outlook": "分析",
            "sentiment_summary": "总结"
        },
        "battle_plan": {
            "sniper_points": {"ideal_buy": "价格", "stop_loss": "价格", "take_profit": "价格"},
            "action_checklist": []
        }
    },
    "analysis_summary": "分析摘要",
    "key_points": "核心看点",
    "risk_warning": "风险提示",
    "buy_reason": "详细理由",
    "fundamental_analysis": "基本面分析",
    "sector_position": "行业地位"
}
```
"""

    def __init__(self):
        self.config = get_config()
        self._setup_litellm()

    def _setup_litellm(self):
        if self.config.gemini_api_key:
            litellm.api_key = self.config.gemini_api_key
        logger.info(f"Analyzer LLM initialized (model={self.config.litellm_model})")

    def is_available(self) -> bool:
        return bool(self.config.gemini_api_key or self.config.openai_api_key)

    def analyze(self, context: Dict, news_context: str = "") -> AnalysisResult:
        """执行 AI 分析"""
        prompt = self._format_prompt(context, news_context)
        
        try:
            response = self._call_llm(prompt)
            return self._parse_response(response, context)
        except Exception as e:
            logger.error(f"AI 分析失败: {e}")
            return AnalysisResult(
                code=context.get('code', 'unknown'),
                name=context.get('name', 'unknown'),
                sentiment_score=50,
                trend_prediction="分析异常",
                operation_advice="观望",
                success=False,
                error_message=str(e)
            )

    def generate_text(self, prompt: str, **kwargs) -> str:
        """通用文本生成接口"""
        try:
            response = litellm.completion(
                model=self.config.litellm_model,
                messages=[{"role": "user", "content": prompt}],
                **kwargs
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM 生成失败: {e}")
            return ""

    def _format_prompt(self, context: Dict, news_context: str) -> str:
        """构建 Prompt"""
        stock_name = context.get('name', 'Unknown')
        code = context.get('code', 'Unknown')
        
        return f"""请作为美股分析师，分析 {stock_name}({code})。

### 1. 技术面数据
{json.dumps(context.get('trend', {}), ensure_ascii=False, indent=2)}

### 2. 舆情情报
{news_context}

请结合上述信息，生成决策仪表盘。
"""

    def _call_llm(self, prompt: str) -> str:
        response = litellm.completion(
            model=self.config.litellm_model,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        return response.choices[0].message.content

    def _parse_response(self, response_text: str, context: Dict) -> AnalysisResult:
        """解析 JSON 响应"""
        try:
            data = json.loads(response_text)
            result = AnalysisResult(
                code=context.get('code', ''),
                name=data.get('stock_name', context.get('name', '')),
                sentiment_score=data.get('sentiment_score', 50),
                trend_prediction=data.get('trend_prediction', '震荡'),
                operation_advice=data.get('operation_advice', '观望'),
                decision_type=data.get('decision_type', 'hold'),
                dashboard=data.get('dashboard'),
                analysis_summary=data.get('analysis_summary', ''),
                key_points=data.get('key_points', ''),
                risk_warning=data.get('risk_warning', ''),
                buy_reason=data.get('buy_reason', ''),
                fundamental_analysis=data.get('fundamental_analysis', ''),
                sector_position=data.get('sector_position', ''),
                model_used=self.config.litellm_model
            )
            return result
        except Exception as e:
            logger.error(f"解析 AI 响应失败: {e}")
            raise e

def normalize_model_used(model: Optional[str]) -> str:
    if not model: return ""
    return model.split('/')[-1]
