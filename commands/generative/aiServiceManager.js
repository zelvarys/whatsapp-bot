const AIService = require('../../utils/generative/aiService');

class AIServiceManager {
  constructor() {}
  
  async generateStory(prompt, userId) {
    try {
      const usageCheck = AIService.canUseAI(userId);
      if (!usageCheck.allowed) {
        return { success: false, error: `❌ Daily AI limit reached` };
      }
      
      const result = await AIService.generateStory(prompt, userId);
      return result;
    } catch (error) {
      console.error('❌ Generate Story Error:', error);
      return { success: false, error: `Failed: ${error.message}` };
    }
  }
  
  async generateCode(description, userId) {
    try {
      const usageCheck = AIService.canUseAI(userId);
      if (!usageCheck.allowed) {
        return { success: false, error: `❌ Daily AI limit reached` };
      }
      
      const result = await AIService.generateCode(description, userId);
      return result;
    } catch (error) {
      console.error('❌ Generate Code Error:', error);
      return { success: false, error: `Failed: ${error.message}` };
    }
  }
  
  async translateText(text, userId) {
    try {
      if (!text || text.trim() === '') {
        return { success: false, error: 'No text to translate' };
      }

      console.log(`Translating text: "${text.substring(0, 50)}..."`);
      
      const prompt = `Translate this text to English. Return ONLY the translation, no explanations, no extra text:
"${text.substring(0, 500)}"`;
      
      try {
        const translation = await AIService.getGeminiAIResponse(prompt, userId + '_translate_' + Date.now());
        
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
            console.log(`Translation successful: ${clean.substring(0, 50)}...`);
            return { success: true, translation: clean };
          }
        }
        
        return { success: false, error: 'Translation returned empty or same text' };
        
      } catch (aiError) {
        console.error('AI Translation error:', aiError);
        return { success: false, error: 'Translation service error' };
      }
      
    } catch (error) {
      console.error('Translation error:', error);
      return { success: false, error: 'Translation service error' };
    }
  }
}

module.exports = AIServiceManager;