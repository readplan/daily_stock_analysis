# -*- coding: utf-8 -*-
"""
===================================
美股自选股智能分析系统 - 配置管理模块
===================================

职责：
1. 使用单例模式管理全局配置
2. 从 .env 文件加载敏感配置
3. 提供类型安全的配置访问接口
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple
from urllib.parse import urlparse
from dotenv import load_dotenv
from dataclasses import dataclass, field


@dataclass
class ConfigIssue:
    severity: Literal["error", "warning", "info"]
    message: str
    field: str = ""

    def __str__(self) -> str:
        return self.message


SUPPORTED_LLM_CHANNEL_PROTOCOLS = ("openai", "anthropic", "gemini", "vertex_ai", "deepseek", "ollama")
_FALSEY_ENV_VALUES = {"0", "false", "no", "off"}


def parse_env_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if not normalized:
        return default
    return normalized not in _FALSEY_ENV_VALUES


def setup_env(override: bool = False):
    env_file = os.getenv("ENV_FILE")
    if env_file:
        env_path = Path(env_file)
    else:
        env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(dotenv_path=env_path, override=override)


@dataclass
class Config:
    """系统配置类 (美股版)"""
    
    # === 自选股配置 ===
    stock_list: List[str] = field(default_factory=list)

    # === AI 分析配置 ===
    litellm_model: str = "gemini/gemini-1.5-flash"
    litellm_fallback_models: List[str] = field(default_factory=list)
    llm_temperature: float = 0.7
    litellm_config_path: Optional[str] = None
    
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None

    # === 运行模式配置 ===
    market_review_enabled: bool = True
    agent_mode: bool = False
    agent_skills: List[str] = field(default_factory=list)
    
    # === 通知配置 ===
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    email_sender: Optional[str] = None
    email_password: Optional[str] = None
    email_receivers: List[str] = field(default_factory=list)
    discord_webhook_url: Optional[str] = None
    custom_webhook_urls: List[str] = field(default_factory=list)

    # === 系统配置 ===
    database_path: str = "./data/stock_analysis.db"
    log_dir: str = "./logs"
    log_level: str = "INFO"
    max_workers: int = 3
    debug: bool = False
    
    # === 其他配置 ===
    enable_realtime_quote: bool = True
    analysis_delay: float = 0.0
    report_type: str = "simple"
    markdown_to_image_channels: List[str] = field(default_factory=list)
    markdown_to_image_max_chars: int = 15000
    
    # Discord 机器人状态
    discord_bot_status: str = "US Stock Analysis | /help"

    _instance: Optional['Config'] = None
    
    @classmethod
    def get_instance(cls) -> 'Config':
        if cls._instance is None:
            cls._instance = cls._load_from_env()
        return cls._instance
    
    @classmethod
    def _load_from_env(cls) -> 'Config':
        setup_env()
        
        # 解析股票列表
        stocks_raw = os.getenv('STOCK_LIST', 'AAPL,TSLA,NVDA')
        stock_list = [s.strip().upper() for s in stocks_raw.split(',') if s.strip()]
        
        return cls(
            stock_list=stock_list,
            litellm_model=os.getenv('LITELLM_MODEL', 'gemini/gemini-1.5-flash'),
            gemini_api_key=os.getenv('GEMINI_API_KEY'),
            openai_api_key=os.getenv('OPENAI_API_KEY'),
            telegram_bot_token=os.getenv('TELEGRAM_BOT_TOKEN'),
            telegram_chat_id=os.getenv('TELEGRAM_CHAT_ID'),
            email_sender=os.getenv('EMAIL_SENDER'),
            email_password=os.getenv('EMAIL_PASSWORD'),
            market_review_enabled=parse_env_bool(os.getenv('MARKET_REVIEW_ENABLED'), True),
            agent_mode=parse_env_bool(os.getenv('AGENT_MODE'), False),
            debug=parse_env_bool(os.getenv('DEBUG'), False),
            max_workers=int(os.getenv('MAX_WORKERS', '3')),
            report_type=os.getenv('REPORT_TYPE', 'simple')
        )

    def validate(self) -> List[str]:
        warnings = []
        if not self.gemini_api_key and not self.openai_api_key:
            warnings.append("未配置 AI API Key，分析功能将不可用")
        return warnings

    def refresh_stock_list(self):
        """刷新股票列表"""
        setup_env(override=True)
        stocks_raw = os.getenv('STOCK_LIST', 'AAPL,TSLA,NVDA')
        self.stock_list = [s.strip().upper() for s in stocks_raw.split(',') if s.strip()]

def get_config() -> Config:
    return Config.get_instance()
