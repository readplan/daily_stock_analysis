# 📈 美股智能分析系统 (US Stock Intelligence)

> 🤖 基于 AI 大模型的美股自选股智能分析系统，每日自动分析并推送「决策仪表盘」到 Telegram/Discord/邮箱

---

## 🌟 功能特性

| 维度 | 功能描述 |
|------|----------|
| **核心分析** | **多因子趋势研判**：结合 MA 均线系统、MACD、RSI 及成交量进行技术面量化评分 |
| **AI 深度** | **Gemini/OpenAI 驱动**：AI 模拟资深分析师，结合技术面与舆情生成结构化决策报告 |
| **复盘** | **美股大盘分析**：每日美股指数（SPX, IXIC, DJI）表现、宏观动态及策略建议 |
| **推送** | **多渠道通知**：支持 Telegram、Discord、邮件、Pushover 等多平台推送 |
| **自动化** | **定时运行**：支持 GitHub Actions 定时执行或本地 Docker 部署 |

---

## 🚀 快速开始

### 1. 克隆并安装依赖
```bash
git clone https://github.com/ZhuLinsen/daily_stock_analysis.git
cd daily_stock_analysis
pip install -r requirements.txt
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env` 并填入必要配置：
```bash
# 自选股列表
STOCK_LIST=AAPL,TSLA,NVDA,MSFT,AMZN

# AI API Key (Gemini 免费额度推荐)
GEMINI_API_KEY=your_key_here
```

### 3. 运行分析
```bash
python main.py
```

---

## ⚙️ 核心配置说明

| 变量名 | 说明 | 必填 |
|-------|------|:----:|
| `STOCK_LIST` | 美股代码列表（如 AAPL,TSLA） | 是 |
| `GEMINI_API_KEY` | Google Gemini API Key | 是 (或 OpenAI) |
| `MARKET_REVIEW_ENABLED` | 是否启用大盘复盘分析 | 可选 |
| `TELEGRAM_BOT_TOKEN` | Telegram 推送机器人 Token | 可选 |

---

## ⚠️ 免责声明
本项目仅供学习研究使用，不构成任何投资建议。股市有风险，投资需谨慎。
