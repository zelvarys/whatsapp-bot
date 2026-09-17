const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../../config');
const AICore = require('./aiCore');

let currentStoryKeyIndex = 0;
let currentStoryModelIndex = 0;

const STORY_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

class AIService {
  static canUseAI(userId) {
    const today = this.getCurrentDate();
    const userKey = `${userId}_${today}`;
    
    if (!global.aiUsage.has(userKey)) {
      global.aiUsage.set(userKey, 1);
      return { allowed: true, remaining: config.DAILY_AI_LIMIT - 1 };
    }
    
    const count = global.aiUsage.get(userKey);
    if (count >= config.DAILY_AI_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    
    global.aiUsage.set(userKey, count + 1);
    return { allowed: true, remaining: config.DAILY_AI_LIMIT - (count + 1) };
  }
  
  static async getGeminiAIResponse(question, userId) {
    const isTranslation = userId.includes('_translate');
    const isChatbot = userId.includes('_chatbot');
    
    if (!isTranslation && !isChatbot) {
      const usageCheck = this.canUseAI(userId);
      if (!usageCheck.allowed) {
        return `❌ You've reached your daily AI limit. Try again tomorrow!`;
      }
    }
    
    const now = Date.now();
    if (global.aiCooldowns.has(userId)) {
      const lastRequest = global.aiCooldowns.get(userId);
      if (now - lastRequest < config.AI_COOLDOWN_TIME) {
        const waitTime = Math.ceil((config.AI_COOLDOWN_TIME - (now - lastRequest)) / 1000);
        return `Wait ${waitTime} seconds before trying again!`;
      }
    }
    
    global.aiCooldowns.set(userId, now);
    
    console.log(`🤖 ${isTranslation ? 'Translation' : isChatbot ? 'Chatbot' : 'AI'} request from ${userId}: ${question.substring(0, 100)}...`);
    
    let response = null;
    
    if (isChatbot) {
      response = await AICore.generateChatbotResponse(question, userId, config);
    } else {
      response = await AICore.generateAIResponse(question, userId, config);
    }
    
    return response;
  }
  
  static async generateStory(prompt, userId) {
    const usageCheck = this.canUseAI(userId);
    if (!usageCheck.allowed) {
      return { success: false, error: `You've reached your daily AI limit. Try again tomorrow!` };
    }
    
    try {
      let result = null;
      
      for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
        const keyIndex = (currentStoryKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
        const apiKey = config.GEMINI_API_KEYS[keyIndex];
        
        if (!apiKey || apiKey === "your_gemini_api_key") {
          console.log(`🔑 Skipping key ${keyIndex + 1} (empty or placeholder)`);
          continue;
        }
        
        for (let modelLoop = 0; modelLoop < STORY_MODELS.length; modelLoop++) {
          const modelIndex = (currentStoryModelIndex + modelLoop) % STORY_MODELS.length;
          const modelName = STORY_MODELS[modelIndex];
          
          try {
            console.log(`📖 Story: Trying key ${keyIndex + 1}, model ${modelName}`);
            
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ 
              model: modelName,
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 4096,
                topP: 0.95,
                topK: 40
              },
              thinkingConfig: {
                thinkingBudget: 0
              }
            });
            
            const storyPrompt = `Write a short story based on this prompt: "${prompt}"

Requirements:
- Under 600 words
- Engaging and creative
- Start directly with the story, no title, no intro like "Here's a story"
- No markdown formatting
- End with a satisfying conclusion`;
            
            const response = await model.generateContent(storyPrompt);
            const story = response.response.text().trim();
            
            if (story && story.length > 20) {
              result = { success: true, story: story };
              currentStoryKeyIndex = keyIndex;
              currentStoryModelIndex = modelIndex;
              console.log(`✅ Story success with key ${keyIndex + 1}, model ${modelName}`);
              break;
            }
          } catch (modelError) {
            const errorMsg = modelError.message || '';
            
            if (errorMsg.includes('model not found') || errorMsg.includes('404')) {
              continue;
            } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
              continue;
            } else if (errorMsg.includes('permission denied') || errorMsg.includes('403')) {
              break;
            } else if (errorMsg.includes('thinking')) {
              console.log(`  ⚠️ thinkingConfig rejected for ${modelName}, retrying without it...`);
              try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const fallbackModel = genAI.getGenerativeModel({ 
                  model: modelName,
                  generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 4096,
                    topP: 0.95,
                    topK: 40
                  }
                });
                const fallbackResult = await fallbackModel.generateContent(storyPrompt);
                const story = fallbackResult.response.text().trim();
                if (story && story.length > 20) {
                  result = { success: true, story: story };
                  currentStoryKeyIndex = keyIndex;
                  currentStoryModelIndex = modelIndex;
                  break;
                }
              } catch (fallbackError) {
                continue;
              }
            } else {
              continue;
            }
          }
        }
        
        if (result) break;
      }
      
      if (!result) {
        return { success: false, error: "Failed to generate story. Try again later." };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Generate Story Error:', error);
      return { success: false, error: `Failed: ${error.message}` };
    }
  }
  
  static getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = AIService;