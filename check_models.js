import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = 'AIzaSyCJD3FsUCav_aZieHOlZLVUEha0p2FpqcY';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function listModels() {
  try {
    console.log("正在使用新 Key 获取可用模型列表...");
    const response = await ai.models.list();
    
    // 检查响应中的 models 数组
    const models = response.models || [];
    
    console.log(`\n✅ 成功！目前共有 ${models.length} 个可用模型：`);
    models.forEach((model) => {
      console.log(`- 名称: ${model.name}`);
      console.log(`  方法: ${model.supportedGenerationMethods.join(', ')}`);
    });
  } catch (error) {
    console.error("❌ 获取模型列表失败:", error);
  }
}

listModels();
