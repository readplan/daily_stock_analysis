import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDizTJyOGNfMzJTIkrFoHVbnFwAKqaKbDo";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    console.log("正在使用 @google/generative-ai 查询可用模型列表...");
    
    // 调用 listModels 方法
    const response = await genAI.listModels();
    
    // 兼容不同版本的返回格式
    const models = response.models || response;

    console.log("\n✅ 查询成功！可用模型如下：");
    
    // 如果返回的是异步迭代器，转换成数组处理
    let modelList = [];
    if (models[Symbol.iterator] || models[Symbol.asyncIterator]) {
      for await (const m of models) {
        modelList.push(m);
      }
    } else {
      modelList = models;
    }

    if (Array.isArray(modelList)) {
      modelList.forEach((model) => {
        console.log(`- 名称: ${model.name}`);
        console.log(`  显示名称: ${model.displayName}`);
        console.log(`  方法: ${model.supportedGenerationMethods?.join(", ") || 'N/A'}`);
        console.log('-------------------------');
      });
    } else {
      console.log("返回格式异常:", modelList);
    }
  } catch (error) {
    console.error("❌ 查询失败！错误详情:", error.message);
  }
}

listModels();
