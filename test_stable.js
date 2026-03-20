import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY || 'AIzaSyDizTJyOGNfMzJTIkrFoHVbnFwAKqaKbDo';
const genAI = new GoogleGenerativeAI(key);

async function testStable() {
  console.log("--- 使用旧版稳定 SDK 测试 ---");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi, are you alive?");
    const response = await result.response;
    console.log("✅ 成功！AI 回复:", response.text());
  } catch (e) {
    console.error("❌ 依然失败！错误:", e.message);
  }
}

testStable();
