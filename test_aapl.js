import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = 'AIzaSyDizTJyOGNfMzJTIkrFoHVbnFwAKqaKbDo';
const ai = new GoogleGenAI({ apiKey: API_KEY });

async function runAutoTest() {
  const models = ['gemini-3-flash-preview', 'gemini-3-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  
  console.log("🚀 开始自动探测模型并分析 AAPL...");

  for (const m of models) {
    try {
      console.log(`--- 尝试模型: ${m} ---`);
      const response = await ai.models.generateContent({
        model: m,
        config: { tools: [{ googleSearch: {} }] },
        contents: [{ role: 'user', parts: [{ text: "分析 AAPL 股票今日表现，请简短回答。" }] }]
      });
      console.log(`✅ 成功！模型 ${m} 响应:`);
      console.log(response.text);
      return;
    } catch (e) {
      console.log(`❌ 失败: ${e.message.split('\n')[0]}`);
    }
  }
  console.error("⛔ 所有模型均无法使用。");
}

runAutoTest();
