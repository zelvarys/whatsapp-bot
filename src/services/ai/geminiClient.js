const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');

// Rotates through API keys and models on failure.
// Two independent rotation cursors so text and chatbot calls don't
// interfere with each other's position.

let textKeyIndex = 0;
let textModelIndex = 0;
let chatbotKeyIndex = 0;
let chatbotModelIndex = 0;

const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-pro'
];

const CHATBOT_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-pro'
];

// Builds the model config with thinking disabled. Thinking mode eats
// the output budget on 2.5 models, so we turn it off everywhere.
function baseGenerationConfig(overrides = {}) {
  return {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topP: 0.95,
    topK: 40,
    ...overrides
  };
}

// Attempts the request once with a given key/model. Throws on failure.
async function tryGenerate(apiKey, modelName, prompt, generationConfig) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
    thinkingConfig: { thinkingBudget: 0 }
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Fallback when the model rejects thinkingConfig (older gemini-pro).
async function tryGenerateWithoutThinking(apiKey, modelName, prompt, generationConfig) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Shared iteration over keys × models. Returns the response text or null.
async function runWithRotation(prompt, generationConfig, models, startKey, startModel) {
  let currentKey = startKey;
  let currentModel = startModel;

  for (let keyLoop = 0; keyLoop < config.geminiApiKeys.length; keyLoop++) {
    const keyIndex = (currentKey + keyLoop) % config.geminiApiKeys.length;
    const apiKey = config.geminiApiKeys[keyIndex];

    for (let modelLoop = 0; modelLoop < models.length; modelLoop++) {
      const modelIndex = (currentModel + modelLoop) % models.length;
      const modelName = models[modelIndex];

      try {
        const text = await tryGenerate(apiKey, modelName, prompt, generationConfig);
        return { text, keyIndex, modelIndex };
      } catch (err) {
        const msg = err.message || '';

        if (msg.includes('model not found') || msg.includes('404')) continue;
        if (msg.includes('rate limit') || msg.includes('429')) continue;
        if (msg.includes('permission denied') || msg.includes('403')) break;
        if (msg.includes('safety') || msg.includes('blocked')) {
          return { text: null, blocked: true };
        }

        // Older models reject thinkingConfig — retry without it.
        if (msg.includes('thinking')) {
          try {
            const text = await tryGenerateWithoutThinking(apiKey, modelName, prompt, generationConfig);
            return { text, keyIndex, modelIndex };
          } catch (innerErr) {
            continue;
          }
        }

        continue;
      }
    }
  }

  return { text: null };
}

async function generateText(prompt, generationConfig = {}) {
  const result = await runWithRotation(
    prompt,
    baseGenerationConfig(generationConfig),
    TEXT_MODELS,
    textKeyIndex,
    textModelIndex
  );

  if (result.blocked) {
    return '⚠️ My safety settings prevented a response. Please try rephrasing.';
  }

  if (!result.text) return null;

  textKeyIndex = result.keyIndex;
  textModelIndex = result.modelIndex;

  return result.text;
}

async function generateChatbotText(prompt, generationConfig = {}) {
  const result = await runWithRotation(
    prompt,
    baseGenerationConfig({ temperature: 0.8, ...generationConfig }),
    CHATBOT_MODELS,
    chatbotKeyIndex,
    chatbotModelIndex
  );

  if (!result.text) return null;

  chatbotKeyIndex = result.keyIndex;
  chatbotModelIndex = result.modelIndex;

  return result.text;
}

module.exports = {
  generateText,
  generateChatbotText
};