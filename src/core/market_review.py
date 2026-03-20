# -*- coding: utf-8 -*-
"""
===================================
股票智能分析系统 - 大盘复盘模块（美股专用）
===================================

职责：
1. 执行美股大盘复盘分析并生成复盘报告
2. 保存和发送复盘报告
"""

import logging
from datetime import datetime
from typing import Optional

from src.config import get_config
from src.notification import NotificationService
from src.market_analyzer import MarketAnalyzer
from src.search_service import SearchService
from src.analyzer import GeminiAnalyzer


logger = logging.getLogger(__name__)


def run_market_review(
    notifier: NotificationService,
    analyzer: Optional[GeminiAnalyzer] = None,
    search_service: Optional[SearchService] = None,
    send_notification: bool = True,
    merge_notification: bool = False,
    override_region: Optional[str] = None,
) -> Optional[str]:
    """
    执行大盘复盘分析 (美股)
    """
    logger.info("开始执行美股大盘复盘分析...")
    
    try:
        market_analyzer = MarketAnalyzer(
            search_service=search_service,
            analyzer=analyzer,
            region="us",
        )
        review_report = market_analyzer.run_daily_review()
        
        if review_report:
            # 保存报告到文件
            date_str = datetime.now().strftime('%Y%m%d')
            report_filename = f"market_review_us_{date_str}.md"
            filepath = notifier.save_report_to_file(
                f"# 🎯 US Market Review\n\n{review_report}", 
                report_filename
            )
            logger.info(f"大盘复盘报告已保存: {filepath}")
            
            # 推送通知
            if merge_notification and send_notification:
                logger.info("合并推送模式：跳过单独推送")
            elif send_notification and notifier.is_available():
                report_content = f"🎯 US Market Review\n\n{review_report}"
                success = notifier.send(report_content, email_send_to_all=True)
                if success:
                    logger.info("大盘复盘推送成功")
            
            return review_report
        
    except Exception as e:
        logger.error(f"大盘复盘分析失败: {e}")
    
    return None
