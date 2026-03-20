# 🤖 LLM 配置指南 (Gemini 3.0 时代)

本系统采用多模态 AI 架构，核心引擎已升级为原生支持 Gemini 3.0 及 Vercel AI Gateway。

---

## 1. 核心模型支持

### Google Gemini 3.0 (首选)
系统默认使用 `@google/genai` 专用 SDK，支持：
- **Google Search**: 实时联网获取股票最新资讯。
- **Thinking Config**: 开启深度思考模式，研判逻辑更缜密。
- **配置**:
  - `GEMINI_API_KEY`: 您的 API Key。
  - `LITELLM_MODEL`: 建议设为 `gemini-3-flash-preview` 或 `gemini-2.0-flash`。

### Claude 4.5 / OpenAI (通过 Vercel AI Gateway)
如果您想使用 Claude 4.5 进行更深度的研判，建议开启 Vercel AI Gateway：
- `AI_GATEWAY_API_KEY`: 您的 Vercel Gateway Token。
- `AI_GATEWAY_URL`: 您的 Gateway 终结点。

---

## 2. 分析逻辑说明

系统会自动按以下顺序注入数据给 AI：
1. **技术面**: 由 `Tiingo` 提供的 K 线及系统自动计算的 MA/MACD/RSI。
2. **宏观面**: 由 `FRED` 提供的利率、就业数据。
3. **策略面**: 自动加载 `strategies/` 目录下的 11 个专业 YAML 策略文件。
4. **即时资讯**: 通过 Gemini 3 的 `googleSearch` 工具进行实时搜索。

---

## 3. 如何优化 AI 响应
您可以修改 `src/services/aiAnalyzer.ts` 中的 `SYSTEM_PROMPT`，或者直接在 `strategies/` 中新增 YAML 文件来引导 AI 的研判偏好。

---
*Created by Gemini CLI*
