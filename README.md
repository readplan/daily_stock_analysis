# 🎯 Daily Stock Analysis (DSA) - 美股智能分析系统

> **Version 2.0 (Node.js/TypeScript Edition)**
> 由 Gemini 3.0 (Flash Preview) 驱动的生产级美股自动研判系统。支持 Google Search 联网搜索、深度思考 (Thinking Mode) 及 Vercel Serverless 自动化运行。

---

## 🌟 核心特性

- 🤖 **全能 AI 引擎**: 集成最新 `@google/genai` SDK，支持 Gemini 3.0 的 Google Search 与 Thinking 能力；同时兼容 Vercel AI Gateway 调用 Claude 4.5。
- 📊 **工业级数据流**: 优先使用 **Tiingo API** 获取高质量 K 线数据，整合 **FRED** (美联储) 宏观利率与失业率指标。
- ⚡ **云原生架构**: 完美支持 **Vercel** 部署，内置 Vercel Cron Job 实现每日收盘后的全自动分析。
- 🔐 **全栈安全**: 基于 **MongoDB Atlas** 的 Session 认证系统，支持 Telegram ID 永久绑定免登录。
- 🤖 **智能机器人**: 内置 Telegram Bot，支持随时发送股票代码获取即时深度研判报告。
- 🖥️ **现代控制台**: 响应式 Web 管理界面，支持自选股动态管理与历史分析记录查询。

---

## 🛠️ 技术栈

- **Language**: TypeScript (ESM)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: Google Gemini 3.0, Claude 4.5 (via Vercel AI Gateway)
- **Finance**: Tiingo API, FRED API
- **Deployment**: Vercel (Serverless Functions + Cron)
- **Notification**: Telegram (Telegraf)

---

## 🚀 快速开始

### 1. 准备工作
克隆仓库后，在根目录下创建 `.env` 文件，并配置以下关键变量：

```env
# AI 配置
GEMINI_API_KEY=your_gemini_api_key
LITELLM_MODEL=gemini-3-flash-preview

# 数据源
TIINGO_API_TOKEN=your_tiingo_token
FRED_API_KEY=your_fred_key

# 数据库与认证
MONGODB_URI=your_mongodb_atlas_uri
PORT=8080

# 通知配置
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 2. 安装与运行
```bash
# 安装依赖
npm install

# 编译项目
npm run build

# 启动服务
npm start
```
访问 `http://localhost:8080` 开启您的智能投资之旅。

---

## ☁️ Vercel 部署

1. 在 Vercel 控制台导入 GitHub 仓库。
2. 配置上述环境变量。
3. 部署成功后，Vercel 会自动根据 `vercel.json` 中的配置执行每日自动分析任务。

---

## 📜 免责声明
本系统生成的分析报告仅供参考，不构成任何投资建议。股市有风险，入市需谨慎。

---
*Created by Gemini CLI*
