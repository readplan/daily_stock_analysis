import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY || 'AIzaSyDizTJyOGNfMzJTIkrFoHVbnFwAKqaKbDo';
const ai = new GoogleGenAI({ apiKey: key });

async function tryModel(modelId) {
  try {
    console.log(`尝试模型 ID: ${modelId}`);
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: "Hi" }] }]
    });
    console.log(`✅ ${modelId} 成功！回复: ${response.text.substring(0, 10)}...`);
    return true;
  } catch (e) {
    console.log(`❌ ${modelId} 失败: ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function runTests() {
  const models = [
    'gemini-1.5-flash',
    'models/gemini-1.5-flash',
    'gemini-pro',
    'models/gemini-pro',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp'
  ];

  for (const m of models) {
    if (await tryModel(m)) break;
  }
}

runTests();
