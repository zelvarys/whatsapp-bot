const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../../config');

let currentTextKeyIndex = 0;
let currentTextModelIndex = 0;

const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

class TextGenerator {
  static async generateStory(prompt, userId, config) {
    try {
      let result = null;
      
      for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
        const keyIndex = (currentTextKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
        const apiKey = config.GEMINI_API_KEYS[keyIndex];
        
        if (!apiKey) continue;
        
        for (const modelName of TEXT_MODELS) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const storyPrompt = `As ${config.botName}, write a short story: "${prompt}"
            Under 500 words, engaging, creative. Start with title.`;
            
            const response = await model.generateContent(storyPrompt);
            const story = response.response.text();
            
            currentTextKeyIndex = keyIndex;
            currentTextModelIndex = TEXT_MODELS.indexOf(modelName);
            
            result = { success: true, story: story };
            break;
          } catch (error) {
            continue;
          }
        }
        
        if (result) break;
      }
      
      if (!result) {
        return { success: false, error: "❌ Failed to generate story" };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Generate Story Error:', error);
      return { success: false, error: `Failed: ${error.message}` };
    }
  }

  static async generateCode(description, userId, config) {
    try {
      let result = null;
      
      for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
        const keyIndex = (currentTextKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
        const apiKey = config.GEMINI_API_KEYS[keyIndex];
        
        if (!apiKey) continue;
        
        for (const modelName of TEXT_MODELS) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const codePrompt = `Generate code for: "${description}"
            Include comments and make it functional. Don't add explanations`;
            
            const response = await model.generateContent(codePrompt);
            const code = response.response.text();
            
            currentTextKeyIndex = keyIndex;
            currentTextModelIndex = TEXT_MODELS.indexOf(modelName);
            
            result = { success: true, code: code };
            break;
          } catch (error) {
            continue;
          }
        }
        
        if (result) break;
      }
      
      if (!result) {
        return { success: false, error: "❌ Failed to generate code" };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Generate Code Error:', error);
      return { success: false, error: `Failed: ${error.message}` };
    }
  }
}

module.exports = TextGenerator;