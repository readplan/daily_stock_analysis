import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDizTJyOGNfMzJTIkrFoHVbnFwAKqaKbDo";
const genAI = new GoogleGenerativeAI(API_KEY);

async function testSimple() {
  console.log("正在尝试直接调用 gemini-1.5-flash...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say 'Hello'");
    console.log("✅ 响应成功:", result.response.text());
  } catch (error) {
    console.error("❌ 调用失败:", error.message);
    if (error.message.includes("404")) {
      console.log("提示：模型名可能需要包含 'models/' 前缀。正在尝试 models/gemini-1.5-flash...");
      try {
        const model2 = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
        const result2 = await model2.generateContent("Say 'Hello'");
        console.log("✅ 带前缀调用成功:", result2.response.text());
      } catch (e2) {
        console.error("❌ 带前缀调用依然失败:", e2.message);
      }
    }
  }
}

testSimple();
