const geminiClient = require('./geminiClient');
const config = require('../../config');
const userModel = require('../../models/userModel');

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

function appendMessage(chatJid, role, senderName, content) {
  const history = getHistory(chatJid);
  history.push({ role, senderName, content, timestamp: Date.now() });

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
      if (entry.role === 'user') {
        return `${entry.senderName}: ${entry.content}`;
      }
      return `You: ${entry.content}`;
    })
    .join('\n');
}

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
    const senderName = userModel.getDisplayName(userJid) || userJid.split('@')[0];

    appendMessage(chatJid, 'user', senderName, text);

    const context = buildContext(chatJid);

    const persona = `You are ${config.botName}, a WhatsApp chatbot. You have a cool, slightly roastful, and sarcastic personality. Be casual, fun, and conversational. Don't be overly formal.

However, if the user asks a serious question — health, safety, technical help, factual information, emotional distress, or anything that clearly needs a straight answer — drop the sarcasm and respond normally and helpfully.

In group chats, multiple people may be talking. Each message is prefixed with the sender's name so you can tell who is who. Address the current sender by their name when replying.`;

    const prompt = context
      ? `${persona}

Conversation so far:
${context}

Reply to the latest message from ${senderName}. Keep it short (1-2 sentences).`
      : `${persona}

${senderName} said: ${text}

Reply in 1-2 sentences.`;

    const response = await geminiClient.generateChatbotText(prompt);

    if (!response || response.startsWith('❌') || response.startsWith('⚠️')) {
      return getNaturalFallback();
    }

    const cleaned = cleanResponse(response);

    if (cleaned.length < 3) return getNaturalFallback();

    appendMessage(chatJid, 'assistant', 'You', cleaned);
    return cleaned;
  } catch (err) {
    console.error('Chatbot response error:', err.message);
    return getNaturalFallback();
  }
}

function clearChat(chatJid) {
  return conversationHistory.delete(chatJid);
}

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