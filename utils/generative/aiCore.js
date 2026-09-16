const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../../config');

let currentTextKeyIndex = 0;
let currentTextModelIndex = 0;
let currentChatbotKeyIndex = 0;
let currentChatbotModelIndex = 0;

const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

const CHATBOT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-pro"
];

class AICore {
  static async generateAIResponse(question, userId, config) {
    let response = null;
    
    for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
      const keyIndex = (currentTextKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
      const apiKey = config.GEMINI_API_KEYS[keyIndex];
      
      if (!apiKey || apiKey === "your_gemini_api_key") {
        console.log(`🔑 Skipping key ${keyIndex + 1} (empty or placeholder)`);
        continue;
      }
      
      console.log(`🔑 Trying key ${keyIndex + 1} (${apiKey.substring(0, 15)}...) for text`);
      
      for (let modelLoop = 0; modelLoop < TEXT_MODELS.length; modelLoop++) {
        const modelIndex = (currentTextModelIndex + modelLoop) % TEXT_MODELS.length;
        const modelName = TEXT_MODELS[modelIndex];
        
        try {
          console.log(`  🧠 Trying model: ${modelName} (Key ${keyIndex + 1})`);
          
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
              topP: 0.95,
              topK: 40
            }
          });
          
          const prompt = `You are ${config.botName}, a friendly and helpful WhatsApp assistant created by Incognito.
Answer the user's question in a clear and concise manner, no need for greetings.
Keep your response under 150 words.
If you cannot answer the question, say so.
User's question: ${question}
Response as ${config.botName}:`;
          
          const result = await model.generateContent(prompt);
          response = result.response.text();
          
          currentTextKeyIndex = keyIndex;
          currentTextModelIndex = modelIndex;
          
          console.log(`✅ Success with key ${keyIndex + 1}, model ${modelName}`);
          break;
        } catch (modelError) {
          const errorMsg = modelError.message || '';
          
          if (errorMsg.includes('model not found') || errorMsg.includes('not found') || errorMsg.includes('404')) {
            console.log(`  ❌ Model ${modelName} not found for this key, trying next model...`);
            continue;
          } else if (errorMsg.includes('rate limit') || errorMsg.includes('quota') || errorMsg.includes('429')) {
            console.log(`  ⚠️ Rate limit for model ${modelName}, trying next model...`);
            continue;
          } else if (errorMsg.includes('permission denied') || errorMsg.includes('403')) {
            console.log(`  🔒 Permission denied for key ${keyIndex + 1}, trying next key...`);
            break;
          } else if (errorMsg.includes('safety') || errorMsg.includes('blocked')) {
            console.log(`  🚫 Content blocked by safety settings for model ${modelName}`);
            return "⚠️ My safety settings prevented a response. Please try rephrasing.";
          } else {
            console.log(`  ❌ Model ${modelName} failed: ${errorMsg.substring(0, 100)}`);
            continue;
          }
        }
      }
      
      if (response) {
        break;
      }
      
      console.log(`❌ All models failed for key ${keyIndex + 1}, trying next key...`);
    }
    
    if (!response) {
      return this.getSmartFallback(question, false, false);
    }
    
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/\*\*/g, '*');
    
    if (cleanResponse.length > config.MAX_AI_RESPONSE_LENGTH) {
      cleanResponse = cleanResponse.substring(0, config.MAX_AI_RESPONSE_LENGTH) + "...";
    }
    
    return cleanResponse;
  }
  
  static async generateChatbotResponse(question, userId, config) {
    let response = null;
    
    for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
      const keyIndex = (currentChatbotKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
      const apiKey = config.GEMINI_API_KEYS[keyIndex];
      
      if (!apiKey || apiKey === "your_gemini_api_key") {
        console.log(`🔑 Skipping key ${keyIndex + 1} (empty or placeholder)`);
        continue;
      }
      
      console.log(`🔑 Trying key ${keyIndex + 1} (${apiKey.substring(0, 15)}...) for chatbot`);
      
      for (let modelLoop = 0; modelLoop < CHATBOT_MODELS.length; modelLoop++) {
        const modelIndex = (currentChatbotModelIndex + modelLoop) % CHATBOT_MODELS.length;
        const modelName = CHATBOT_MODELS[modelIndex];
        
        try {
          console.log(`  🧠 Trying model: ${modelName} (Key ${keyIndex + 1})`);
          
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 800,
              topP: 0.95,
              topK: 40
            }
          });
          
          const prompt = `You are ${config.botName}, a friendly WhatsApp chatbot. You have a cool, slightly roastful, and sarcastic personality. Be casual, fun, and conversational. Don't be overly formal or helpful.

Conversation context: ${question}

Respond naturally in 1-2 sentences. Keep it cool, light, and engaging.`;
          
          const result = await model.generateContent(prompt);
          response = result.response.text();
          
          currentChatbotKeyIndex = keyIndex;
          currentChatbotModelIndex = modelIndex;
          
          console.log(`✅ Success with key ${keyIndex + 1}, model ${modelName}`);
          break;
        } catch (modelError) {
          const errorMsg = modelError.message || '';
          
          if (errorMsg.includes('model not found') || errorMsg.includes('not found') || errorMsg.includes('404')) {
            console.log(`  ❌ Model ${modelName} not found for this key, trying next model...`);
            continue;
          } else if (errorMsg.includes('rate limit') || errorMsg.includes('quota') || errorMsg.includes('429')) {
            console.log(`  ⚠️ Rate limit for model ${modelName}, trying next model...`);
            continue;
          } else if (errorMsg.includes('permission denied') || errorMsg.includes('403')) {
            console.log(`  🔒 Permission denied for key ${keyIndex + 1}, trying next key...`);
            break;
          } else if (errorMsg.includes('safety') || errorMsg.includes('blocked')) {
            console.log(`  🚫 Content blocked by safety settings for model ${modelName}`);
            return this.getChatbotFallback();
          } else {
            console.log(`  ❌ Model ${modelName} failed: ${errorMsg.substring(0, 100)}`);
            continue;
          }
        }
      }
      
      if (response) {
        break;
      }
      
      console.log(`❌ All models failed for key ${keyIndex + 1}, trying next key...`);
    }
    
    if (!response) {
      return this.getChatbotFallback();
    }
    
    let cleanResponse = response.trim();
    cleanResponse = cleanResponse.replace(/\*\*/g, '*');
    
    return cleanResponse;
  }
  
  static getSmartFallback(question, isChatbot = false, isTranslation = false) {
    const lowerQ = question.toLowerCase();
    
    if (isChatbot) {
      return this.getChatbotFallback();
    }
    
    if (lowerQ.includes('your name')) {
      return `I'm ${config.botName}, your friendly WhatsApp bot!`;
    } else if (lowerQ.includes('who made you') || lowerQ.includes('created you')) {
      return "Hehe, I was created by my awesome developer, Incognito! 🗿";
    } else if (lowerQ.includes('weather')) {
      return "I can't check real-time weather, but you can use weather apps for accurate forecasts!";
    } else if (lowerQ.includes('love you')) {
      return "Aww, I love you too! But as a bot, it's purely digital love 💖";
    }
    
    const fallbacks = [
      "That's an interesting question! My AI brain is taking a break. Try asking something else!",
      "My AI capabilities are limited right now. Why not try a game with !games?",
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  
  static getChatbotFallback() {
    const fallbacks = [
      "Uh huh.. I've hit my limit, laterr",
      "Limit reached, let's chat some other time",
      "Interesting! I'm going off soon"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

module.exports = AICore;