const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const config = require('../../config');

let currentTextKeyIndex = 0;
let currentTextModelIndex = 0;

const IMAGE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-pro"
];

class ImageGenerator {
  static async generateImage(prompt, userId, config) {
    try {
      const now = Date.now();
      if (global.aiCooldowns.has(userId + '_image')) {
        const lastRequest = global.aiCooldowns.get(userId + '_image');
        if (now - lastRequest < config.IMAGE_COOLDOWN_TIME) {
          const waitTime = Math.ceil((config.IMAGE_COOLDOWN_TIME - (now - lastRequest)) / 1000);
          return { success: false, error: `⏰ Please wait ${waitTime} seconds before generating another image!` };
        }
      }
      
      global.aiCooldowns.set(userId + '_image', now);
      console.log(`🎨 Generating image for ${userId}: ${prompt}`);
      
      for (let keyLoop = 0; keyLoop < config.GEMINI_API_KEYS.length; keyLoop++) {
        const keyIndex = (currentTextKeyIndex + keyLoop) % config.GEMINI_API_KEYS.length;
        const apiKey = config.GEMINI_API_KEYS[keyIndex];
        
        if (!apiKey) continue;
        
        console.log(`  🔑 Trying key ${keyIndex + 1} for Gemini models`);
        
        for (const modelName of IMAGE_MODELS) {
          try {
            console.log(`    🧠 Trying Gemini model: ${modelName}`);
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            await model.generateContent(`Test for ${modelName}`);
            console.log(`    ✅ Gemini model ${modelName} is accessible`);
            
            currentTextKeyIndex = keyIndex;
            currentTextModelIndex = IMAGE_MODELS.indexOf(modelName);
            
            break;
          } catch (error) {
            console.log(`    ❌ Gemini model ${modelName} failed: ${error.message.substring(0, 50)}`);
            continue;
          }
        }
        break;
      }
      
      console.log('🔄 Using reliable image APIs...');
      
      const imageBuffer = await this.tryReliableImageAPIs(prompt);
      
      if (imageBuffer) {
        return {
          success: true,
          imageBuffer: imageBuffer
        };
      } else {
        return {
          success: false,
          error: "❌ Image generation failed. Please try a different prompt!"
        };
      }
      
    } catch (error) {
      console.error('❌ Image Generation Error:', error.message);
      
      return {
        success: false,
        error: `⚠️ Failed to generate image: ${error.message}`
      };
    }
  }
  
  static async tryReliableImageAPIs(prompt) {
    console.log('🔄 Trying reliable image APIs...');
    
    const apis = [
      {
        name: 'Pollinations AI',
        method: 'GET',
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=flux&seed=${Math.floor(Math.random() * 10000)}&nologo=true`,
        process: async (response) => {
          return Buffer.from(response.data, 'binary');
        }
      }
    ];
    
    for (const api of apis) {
      try {
        console.log(`  🔄 Trying ${api.name}...`);
        
        let response;
        if (api.method === 'POST') {
          response = await axios.post(api.url, api.body, {
            headers: api.headers,
            timeout: 60000,
            responseType: 'arraybuffer'
          });
        } else {
          response = await axios.get(api.url, {
            timeout: 30000,
            responseType: 'arraybuffer'
          });
        }
        
        if (response.status === 200 || response.status === 201) {
          const imageBuffer = await api.process(response);
          if (imageBuffer && imageBuffer.length > 1000) {
            console.log(`  ✅ Success with ${api.name}`);
            return imageBuffer;
          }
        }
      } catch (apiError) {
        console.log(`  ❌ ${api.name} failed:`, apiError.message);
        continue;
      }
    }
    
    try {
      console.log('🔄 Trying simple fallback...');
      const fallbackUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt.replace(/\s+/g, '%20'))}`;
      const response = await axios.get(fallbackUrl, {
        timeout: 20000,
        responseType: 'arraybuffer'
      });
      
      if (response.status === 200) {
        return Buffer.from(response.data, 'binary');
      }
    } catch (fallbackError) {
      console.log('❌ Fallback also failed:', fallbackError.message);
    }
    
    return null;
  }
}

module.exports = ImageGenerator;