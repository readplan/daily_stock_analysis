import axios from 'axios';

async function test() {
  const key = 'AIzaSyAbMWdn9A3RnZPlkviJKyqXcs3dlOkCQdM';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
  
  try {
    const response = await axios.post(`${url}?key=${key}`, {
      contents: [{
        parts: [{ text: "Say 'Success'" }]
      }]
    });
    console.log("✅ 成功！", response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.log("❌ 失败:", error.response?.data || error.message);
  }
}

test();
