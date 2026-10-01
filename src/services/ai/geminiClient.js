const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config');

// The client rotates through API keys and models on rate limits or
// transient errors. Indexes persist across calls so a busy bot does not
// keep retrying the same key that just failed.

let textKeyIndex = 0;
let textModelIndex = 0;
let chatbotKeyIndex = 0;
let chatbotModelIndex = 0;

const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
];

const CHATBOT_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash'
];

function baseGenerationConfig(overrides = {}) {
  return {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topP: 0.95,
    topK: 40,
    ...overrides
  };
}

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

// Some model/config combinations reject thinkingConfig. Retrying without
// it is cheaper than tracking which models currently support it.
async function tryGenerateWithoutThinking(apiKey, modelName, prompt, generationConfig) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

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

        // Missing model or rate-limited: try the next model on the same key.
        if (msg.includes('model not found') || msg.includes('404')) continue;
        if (msg.includes('rate limit') || msg.includes('429')) continue;

        // Permission errors will not resolve by cycling. Move on to the
        // next key instead of burning the remaining models.
        if (msg.includes('permission denied') || msg.includes('403')) break;

        if (msg.includes('safety') || msg.includes('blocked')) {
          return { text: null, blocked: true };
        }

        // Some SDK/model pairs reject thinkingConfig. Retry without it.
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

// Generic text generation for commands that want a plain answer.
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

// Chatbot path. Persona is applied by the caller, so no injection here.
// Slightly higher temperature keeps casual replies from sounding canned.
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