const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const config = require('../../config');
const AICore = require('./aiCore');
const ImageGenerator = require('./imageGenerator');
const TextGenerator = require('./textGenerator');
const TranslationService = require('./translation');

let currentTextKeyIndex = 0;
let currentTextModelIndex = 0;
let currentChatbotKeyIndex = 0;
let currentChatbotModelIndex = 0;

const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

const IMAGE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

const CHATBOT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
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
  
  static canUseImage(userId) {
    const today = this.getCurrentDate();
    const userKey = `${userId}_image_${today}`;
    
    if (!global.imageUsage.has(userKey)) {
      global.imageUsage.set(userKey, 1);
      return { allowed: true, remaining: config.DAILY_IMAGE_LIMIT - 1 };
    }
    
    const count = global.imageUsage.get(userKey);
    if (count >= config.DAILY_IMAGE_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    
    global.imageUsage.set(userKey, count + 1);
    return { allowed: true, remaining: config.DAILY_IMAGE_LIMIT - (count + 1) };
  }
  
  static async getGeminiAIResponse(question, userId) {
    const isTranslation = userId.includes('_translate');
    const isChatbot = userId.includes('_chatbot');
    const isDirectTranslation = userId.includes('_direct_translate');
    
    if (!isTranslation && !isDirectTranslation && !isChatbot) {
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
    
    if (isTranslation || isDirectTranslation) {
      response = await TranslationService.translateText(question, userId);
    } else if (isChatbot) {
      response = await AICore.generateChatbotResponse(question, userId, config);
    } else {
      response = await AICore.generateAIResponse(question, userId, config);
    }
    
    return response;
  }
  
  static async generateImageGemini(prompt, userId) {
    return await ImageGenerator.generateImage(prompt, userId, config);
  }
  
  static async generateStory(prompt, userId) {
    return await TextGenerator.generateStory(prompt, userId, config);
  }

  static async generateCode(description, userId) {
    return await TextGenerator.generateCode(description, userId, config);
  }
  
  static getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = AIService;