const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const config = require('../../config');

let currentTextKeyIndex = 0;
let currentTextModelIndex = 0;

const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

class TranslationService {
  static async translateText(text, userId) {
    let response = null;
    
    for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
      const keyIndex = (currentTextKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
      const apiKey = config.GEMINI_API_KEYS[keyIndex];
      
      if (!apiKey || apiKey === "your_gemini_api_key") {
        console.log(`🔑 Skipping key ${keyIndex + 1} (empty or placeholder)`);
        continue;
      }
      
      console.log(`🔑 Trying key ${keyIndex + 1} (${apiKey.substring(0, 15)}...) for translation`);
      
      for (let modelLoop = 0; modelLoop < TEXT_MODELS.length; modelLoop++) {
        const modelIndex = (currentTextModelIndex + modelLoop) % TEXT_MODELS.length;
        const modelName = TEXT_MODELS[modelIndex];
        
        try {
          console.log(`  🧠 Trying model: ${modelName} (Key ${keyIndex + 1})`);
          
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 500,
              topP: 0.95,
              topK: 40
            }
          });
          
          const prompt = `Translate this text to English. Return ONLY the English translation, nothing else, no explanations, no labels, no quotes:

"${text}"`;
          
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
            continue;
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
      const simpleTrans = this.simpleTranslate(text);
      if (simpleTrans) {
        return simpleTrans;
      }
      
      try {
        const encodedText = encodeURIComponent(text.substring(0, 500));
        const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodedText}`;
        
        const googleResponse = await axios.get(translateUrl, { timeout: 10000 });
        
        if (googleResponse.data && googleResponse.data[0] && googleResponse.data[0][0] && googleResponse.data[0][0][0]) {
          return googleResponse.data[0][0][0];
        }
      } catch (translateError) {
        console.error('Google Translate fallback also failed:', translateError);
      }
      
      return text;
    }
    
    let cleanResponse = response.trim();
    
    const translationPrefixes = [
      /^Translation:?\s*/i,
      /^English:?\s*/i,
      /^Translated:?\s*/i,
      /^Here(?:'s| is) the translation:?\s*/i,
      /^The translation is:?\s*/i,
      /["']/g,
      /^```[\s\S]*?```\s*/,
      /^\s*\([^)]*\)\s*/
    ];
    
    translationPrefixes.forEach(prefix => {
      cleanResponse = cleanResponse.replace(prefix, '');
    });
    
    cleanResponse = cleanResponse.split('\n')[0].trim();
    
    if (!cleanResponse || cleanResponse === text) {
      const simpleTrans = this.simpleTranslate(text);
      if (simpleTrans) {
        return simpleTrans;
      }
      return text;
    }
    
    return cleanResponse;
  }
  
  static simpleTranslate(text) {
    if (!text || text.length < 1) return null;
    
    const commonTranslations = {
      'hola': 'Hello',
      'buenos días': 'Good morning',
      'buenas tardes': 'Good afternoon',
      'buenas noches': 'Good night',
      'gracias': 'Thank you',
      'por favor': 'Please',
      'de nada': 'You\'re welcome',
      'lo siento': 'I\'m sorry',
      'adiós': 'Goodbye',
      'hasta luego': 'See you later',
      'cómo estás': 'How are you',
      'estoy bien': 'I\'m fine',
      'te amo': 'I love you',
      'qué pasa': 'What\'s up',
      
      'bonjour': 'Hello',
      'bonsoir': 'Good evening',
      'merci': 'Thank you',
      's\'il vous plaît': 'Please',
      'excusez-moi': 'Excuse me',
      'je t\'aime': 'I love you',
      'au revoir': 'Goodbye',
      
      'hallo': 'Hello',
      'guten morgen': 'Good morning',
      'guten tag': 'Good day',
      'danke': 'Thank you',
      'bitte': 'Please',
      'entschuldigung': 'Excuse me',
      'auf wiedersehen': 'Goodbye',
      
      'ciao': 'Hello/Goodbye',
      'buongiorno': 'Good morning',
      'grazie': 'Thank you',
      'per favore': 'Please',
      'scusa': 'Excuse me',
      'arrivederci': 'Goodbye',
      
      'olá': 'Hello',
      'bom dia': 'Good morning',
      'obrigado': 'Thank you (male)',
      'obrigada': 'Thank you (female)',
      'por favor': 'Please',
      'adeus': 'Goodbye'
    };
    
    const textLower = text.toLowerCase().trim();
    
    if (commonTranslations[textLower]) {
      return commonTranslations[textLower];
    }
    
    for (const [foreign, english] of Object.entries(commonTranslations)) {
      if (textLower.includes(foreign.toLowerCase())) {
        const regex = new RegExp(foreign, 'gi');
        return text.replace(regex, english);
      }
    }
    
    return null;
  }
}

module.exports = TranslationService;