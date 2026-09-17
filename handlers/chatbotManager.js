const config = require('../config');
const AIService = require('../utils/generative/aiService');
const DataManager = require('../utils/dataManager');

class ChatbotManager {
  constructor() {
    this.conversationHistory = new Map();
    this.ownerId = '119138735378638';
    this.chatbotEnabled = global.chatbotState || false;
    
    setInterval(() => this.cleanupOldConversations(), 60 * 60 * 1000);
  }

  isOwner(userJid) {
    try {
      if (!userJid) return false;
      const cleanJid = userJid.split('@')[0].replace(/[^0-9]/g, '');
      return cleanJid.includes(this.ownerId) ||
             (config.ownerNumber && cleanJid.includes(config.ownerNumber.replace('+', '')));
    } catch (error) {
      return false;
    }
  }

  setChatbotState(enabled, userJid) {
    if (!this.isOwner(userJid)) {
      return { success: false, error: '❌ Only owner can change chatbot state!' };
    }
    
    this.chatbotEnabled = enabled;
    global.chatbotState = enabled;
    DataManager.setChatbotState(enabled);
    
    return {
      success: true,
      enabled: this.chatbotEnabled,
      message: `ChatBot is now ${this.chatbotEnabled ? 'Active ✅' : 'Inactive ❌'}`
    };
  }

  getStatus() {
    return { enabled: global.chatbotState };
  }

  async generateResponse(text, userJid, chatJid) {
    try {
      console.log(`Generating chatbot response for: "${text.substring(0, 50)}..."`);
      
      const historyKey = chatJid;
      if (!this.conversationHistory.has(historyKey)) {
        this.conversationHistory.set(historyKey, []);
      }
      
      const conversation = this.conversationHistory.get(historyKey);
      
      conversation.push({
        role: 'user',
        content: text,
        timestamp: Date.now()
      });
      
      if (conversation.length > 10) {
        conversation.splice(0, conversation.length - 10);
      }
      
      let context = '';
      if (conversation.length > 1) {
        const recentMessages = conversation.slice(-4);
        context = recentMessages.map(msg => {
          if (msg.role === 'user') {
            return `User: ${msg.content}`;
          } else {
            return `You: ${msg.content}`;
          }
        }).join('\n');
      }
      
      let prompt;
      
      if (context) {
        prompt = `You are ${config.botName}, a WhatsApp bot. Keep responses short and casual. Have a high roastful and sarcastic personality, and self awareness.

Previous chat:
${context}

Current message: ${text}

Your short response:`;
      } else {
        prompt = `You are ${config.botName}, a friendly WhatsApp bot. Keep it short and casual.

Message: ${text}

Your short, friendly response:`;
      }
      
      const response = await AIService.getGeminiAIResponse(prompt, userJid + '_chatbot');
      
      if (response && !response.startsWith('❌') && !response.startsWith('⚠️')) {
        let cleanResponse = response.trim();
        
        cleanResponse = cleanResponse.replace(/^(AI|Bot|Assistant|${config.botName}):?\s*/i, '');
        cleanResponse = cleanResponse.replace(/^(Sure!|Of course!|Certainly!|Alright!|Okay!|Well, )\s*/i, '');
        
        if (cleanResponse.length > 300) {
          cleanResponse = cleanResponse.substring(0, 300);
        }
        
        cleanResponse = cleanResponse.trim();
        
        if (cleanResponse.length < 3) {
          cleanResponse = this.getNaturalFallback();
        }
        
        conversation.push({
          role: 'assistant',
          content: cleanResponse,
          timestamp: Date.now()
        });
        
        return cleanResponse;
      }
      
      return this.getNaturalFallback();
      
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      return this.getNaturalFallback();
    }
  }

  getNaturalFallback() {
    const fallbacks = [
      "Hey there! 👋",
      "Got it 👍",
      "Interesting!",
      "Alright!",
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  cleanupOldConversations() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleaned = 0;
    
    for (const [chatJid, conversation] of this.conversationHistory.entries()) {
      if (conversation.length > 0) {
        const lastMessageTime = conversation[conversation.length - 1].timestamp;
        if (lastMessageTime < oneHourAgo) {
          this.conversationHistory.delete(chatJid);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old chatbot conversations`);
    }
  }

  async translateText(text, userJid) {
    try {
      if (!text || text.trim() === '') {
        return { success: false, error: 'No text to translate' };
      }

      console.log(`Translating text: "${text.substring(0, 50)}..."`);
      
      const prompt = `Translate this text to English. Return ONLY the translation, no explanations, no extra text:
"${text.substring(0, 500)}"`;
      
      try {
        const translation = await AIService.getGeminiAIResponse(prompt, userJid + '_translate_' + Date.now());
        
        if (translation && !translation.startsWith('❌') && !translation.startsWith('⚠️')) {
          let clean = translation.trim();
          
          const prefixes = [
            /^Translation:?\s*/i,
            /^English:?\s*/i,
            /^Translated:?\s*/i,
            /^Here(?:'s| is) the translation:?\s*/i,
            /^The translation is:?\s*/i,
            /^Translate this text to English. Return ONLY the translation, no explanations, no extra text::?\s*/i,
            /["']/g
          ];
          
          prefixes.forEach(prefix => clean = clean.replace(prefix, ''));
          clean = clean.split('\n')[0].trim();
          
          if (clean && clean.length > 0 && clean !== text) {
            return { success: true, translation: clean };
          }
        }
        
        return { success: false, error: 'Translation returned empty or same text' };
        
      } catch (aiError) {
        console.error('AI Translation error:', aiError);
        
        try {
          const encodedText = encodeURIComponent(text.substring(0, 500));
          const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodedText}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0][0] && data[0][0][0]) {
              return { success: true, translation: data[0][0][0] };
            }
          }
        } catch (googleError) {
          console.error('Google Translate fallback failed:', googleError);
        }
        
        return { success: false, error: 'All translation methods failed' };
      }
      
    } catch (error) {
      console.error('Translation error:', error);
      return { success: false, error: 'Translation service error' };
    }
  }
}

module.exports = ChatbotManager;