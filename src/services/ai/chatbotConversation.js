const geminiClient = require('./geminiClient');
const config = require('../../config');

// Per-chat chatbot conversation history. Each entry keeps the last
// few messages as context so the bot stays on-topic within a chat.
// History is kept in memory only and cleaned up hourly.

const conversationHistory = new Map();
const MAX_HISTORY = 10;
const CONTEXT_WINDOW = 4;

function getHistory(chatJid) {
  if (!conversationHistory.has(chatJid)) {
    conversationHistory.set(chatJid, []);
  }
  return conversationHistory.get(chatJid);
}

function appendMessage(chatJid, role, content) {
  const history = getHistory(chatJid);
  history.push({ role, content, timestamp: Date.now() });

  // Trim old messages
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

function buildContext(chatJid) {
  const history = getHistory(chatJid);
  if (history.length <= 1) return '';

  return history
    .slice(-CONTEXT_WINDOW)
    .map((entry) => {
      return entry.role === 'user'
        ? `User: ${entry.content}`
        : `You: ${entry.content}`;
    })
    .join('\n');
}

// Strips assistant-style prefixes the model sometimes adds.
function cleanResponse(text) {
  let cleaned = text.trim();

  cleaned = cleaned.replace(
    new RegExp(`^(AI|Bot|Assistant|${config.botName}):?\\s*`, 'i'),
    ''
  );

  cleaned = cleaned.replace(
    /^(Sure!|Of course!|Certainly!|Alright!|Okay!|Well, )\s*/i,
    ''
  );

  if (cleaned.length > 300) cleaned = cleaned.substring(0, 300);

  return cleaned.trim();
}

function getNaturalFallback() {
  const fallbacks = [
    'Hey there! 👋',
    'Got it 👍',
    'Interesting!',
    'Alright!'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function generateResponse(text, userJid, chatJid) {
  try {
    appendMessage(chatJid, 'user', text);

    const context = buildContext(chatJid);

    const prompt = context
      ? `You are ${config.botName}, a WhatsApp bot. Keep responses short and casual. Have a high roastful and sarcastic personality, and self awareness.

Previous chat:
${context}

Current message: ${text}

Your short response:`
      : `You are ${config.botName}, a friendly WhatsApp bot. Keep it short and casual.

Message: ${text}

Your short, friendly response:`;

    const response = await geminiClient.generateChatbotText(prompt);

    if (!response || response.startsWith('❌') || response.startsWith('⚠️')) {
      return getNaturalFallback();
    }

    const cleaned = cleanResponse(response);

    if (cleaned.length < 3) return getNaturalFallback();

    appendMessage(chatJid, 'assistant', cleaned);
    return cleaned;
  } catch (err) {
    console.error('Chatbot response error:', err.message);
    return getNaturalFallback();
  }
}

function clearChat(chatJid) {
  return conversationHistory.delete(chatJid);
}

// Called by the periodic cleanup task.
function pruneOldConversations() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleaned = 0;

  for (const [chatJid, history] of conversationHistory.entries()) {
    if (history.length === 0) {
      conversationHistory.delete(chatJid);
      cleaned++;
      continue;
    }

    const last = history[history.length - 1];
    if (last.timestamp < oneHourAgo) {
      conversationHistory.delete(chatJid);
      cleaned++;
    }
  }

  return cleaned;
}

module.exports = {
  generateResponse,
  clearChat,
  pruneOldConversations
};