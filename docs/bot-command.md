# 🤖 Telegram Bot 指令手册

本项目的 Telegram Bot 已集成 **Admin 绑定系统**，支持免登录自动识别。

---

## 1. 基础指令

- `/start`: 获取您的 Telegram ID 并检查绑定状态。
- `/help`: 显示所有可用指令。
- `/analyze <ticker>`: 分析指定股票。例如: `/analyze TSLA`。
- `/bind <username>`: 将您的 Telegram 账号与 Web 控制台用户绑定（首次使用）。

---

## 2. 交互说明

### 股票代码识别
您可以直接向 Bot 发送大写的股票代码（1-5位字母），Bot 会自动触发深度研判：
> 输入: `NVDA`
> 响应: `🔍 正在为您分析 NVDA...` -> 随后返回分析卡片。

### 权限控制
如果您看到 `⛔ 权限不足`，请复制 `/start` 返回的 ID，在 Web 控制台进行绑定，或联系管理员使用 `/bind Admin`。

---

## 3. 报告样式
Bot 会返回包含 **Emoji 信号 (🟢买入/🟡观望/🔴卖出)**、**情感评分**、**核心结论** 及 **技术面摘要** 的 Markdown 消息。

---
*Created by Gemini CLI*
