const geminiClient = require('./geminiClient');
const config = require('../../config');
const userModel = require('../../models/userModel');
const moodPrompts = require('./moodPrompts');

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
      return `Assistant: ${entry.content}`;
    })
    .join('\n');
}

// Aggressive cleanup: strips any "Name:" prefix the model sneaks into its
// output, plus common assistant preambles.
function cleanResponse(text) {
  let cleaned = text.trim();

  // Strip a leading "Word:" or "Word said:" prefix that mimics the context format.
  cleaned = cleaned.replace(/^[A-Za-z_][A-Za-z0-9_]*\s+said:?\s*/i, '');
  cleaned = cleaned.replace(/^[A-Za-z_][A-Za-z0-9_]{0,30}:?\s+/, (match) => {
    const name = match.replace(/:?\s+$/, '');
    if (
      name.toLowerCase() === 'you' ||
      name.toLowerCase() === 'assistant' ||
      name.toLowerCase() === 'bot' ||
      name.toLowerCase() === 'ai' ||
      name.toLowerCase() === config.botName.toLowerCase()
    ) {
      return '';
    }
    // Only strip if the name looks like a bot-generated label
    // (no spaces, capitalised word followed by a colon).
    if (/^[A-Z][a-z]+\s*:$/.test(match.trim()) || /^[A-Z][a-zA-Z0-9_]+:$/.test(match.trim())) {
      return '';
    }
    return match;
  });

  // Strip generic assistant preambles.
  cleaned = cleaned.replace(
    /^(Sure!|Of course!|Certainly!|Alright!|Okay!|Well,|Ah,|Ah yes,|Hmm,)\s*/i,
    ''
  );

  // Strip wrapping quotes.
  cleaned = cleaned.replace(/^["'](.+)["']$/, '$1');

  return cleaned.trim();
}

function getNaturalFallback() {
  const fallbacks = [
    'Not sure what to say to that. Care to elaborate?',
    'Hmm. Tell me more.',
    'Go on, I am listening.'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Rejects empty, one-word, or filler responses.
function isUsableReply(text) {
  if (!text) return false;
  if (text.length < 15) return false;

  const lower = text.toLowerCase();
  const fillers = ['ok', 'okay', 'acknowledged', 'sure', 'noted', 'alright', 'yeah'];
  if (fillers.includes(lower)) return false;

  return true;
}

async function generateResponse(text, userJid, chatJid) {
  try {
    const senderName = userModel.getDisplayName(userJid) || userJid.split('@')[0];
    const mood = userModel.getMood(userJid);

    appendMessage(chatJid, 'user', senderName, text);

    const context = buildContext(chatJid);
    const persona = moodPrompts.getPersona(mood);

    const contextBlock = context
      ? `Below is the recent chat for context. Each line is "Name: message". Do NOT copy this format in your reply. Do NOT prefix your reply with a name.

${context}

The most recent message is from ${senderName}.`
      : `The most recent message is from ${senderName}.`;

    const instruction = `Reply to ${senderName}'s latest message in 2-3 sentences. Be conversational. Never respond with a single word or a filler like "okay" or "acknowledged". Do not include your name, "You:", "${senderName}:", or any similar prefix at the start of your reply. Output only the reply text.`;

    const prompt = `${persona}

${contextBlock}

${instruction}`;

    const response = await geminiClient.generateChatbotText(prompt);

    if (!response || response.startsWith('❌') || response.startsWith('⚠️')) {
      return getNaturalFallback();
    }

    const cleaned = cleanResponse(response);

    if (!isUsableReply(cleaned)) {
      return getNaturalFallback();
    }

    const trimmed = cleaned.length > 300 ? cleaned.substring(0, 300) : cleaned;

    appendMessage(chatJid, 'assistant', 'Assistant', trimmed);
    return trimmed;
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