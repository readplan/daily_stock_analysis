# 🎯 DSA 完整使用指南 (Node.js/TypeScript 版)

欢迎使用 **Daily Stock Analysis (DSA)**。本指南将带您深入了解如何配置、运行并利用 AI 进行智能化投资。

---

## 📖 系统架构

本系统由四个核心模块组成：
1. **数据中台**: 通过 `Tiingo` 抓取美股实时/历史行情，通过 `FRED` 监控宏观环境。
2. **AI 大脑**: 由 `Gemini 3` 驱动，集成了联网搜索、深度思考及策略注入逻辑。
3. **控制中心**: 现代化的 Web 管理界面，用于管理自选股、查看历史及执行登录。
4. **即时通讯**: Telegram Bot 实时交互与日报推送。

---

## ⚙️ 关键配置流程

### 1. 数据库准备 (MongoDB)
前往 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 创建一个免费集群，获取 `MONGODB_URI`。本系统使用数据库管理您的自选股列表及分析历史。

### 2. 获取 API Keys
- **Gemini**: 在 [Google AI Studio](https://aistudio.google.com/) 获取。
- **Tiingo**: 在 [Tiingo.com](https://www.tiingo.com/) 获取。
- **Telegram**: 通过 [@BotFather](https://t.me/botfather) 创建机器人获取 Token。

---

## 🛠️ 进阶功能

### 策略自定义
您可以进入 `strategies/` 目录，按照已有的 YAML 格式新增选股策略。AI 在生成报告时会自动读取并参考这些策略规则。

### 自动化复盘 (Vercel Cron)
如果您在 Vercel 部署，系统会自动启用内置的 Cron Job。每天美东时间收盘后，系统会自动跑一遍您的自选股，并发送图片/文字报告到您的手机上。

---

## ❓ 常见问题 (FAQ)

**Q: 为什么 Web 页面打不开？**
A: 请确保本地运行了 `npm run build` 和 `npm start`，且端口 8080 未被占用。

**Q: 如何绑定 Telegram 免登录？**
A: 在 Telegram 给 Bot 发送任何消息，获取 ID。然后在 Web 侧（即将推出）或通过数据库 `UserModel` 的 `telegramId` 字段手动填入即可。

---
*Created by Gemini CLI*
