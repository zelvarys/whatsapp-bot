const botState = require('../models/botStateModel');
const chatbotConversation = require('../services/ai/chatbotConversation');
const mentionStripper = require('../utils/mentionStripper');

// Handles chatbot responses.
// Behavior:
//   - Private chat + chatbot on → always respond
//   - Group + chatbot off → do nothing
//   - Group + chatbot on + tag with no message → fixed greeting
//   - Group + chatbot on + tag with message, or reply to bot → AI response

const FIXED_TAG_REPLY = 'Hey boss, how can I help you';

async function routeChatbot(sock, msg, text, sender, userJid, isGroup, isReplyToBot, isTagged, stats) {
  if (!botState.isChatbotEnabled()) return;

  // Private chat: respond to any non-empty message.
  if (!isGroup) {
    if (!text || !text.trim()) return;

    const reply = await chatbotConversation.generateResponse(text, userJid, sender);
    if (reply) {
      await sock.sendMessage(sender, { text: reply }, { quoted: msg });
      if (stats) stats.commandsExecuted++;
    }
    return;
  }

  // Group chat: only respond when tagged or replying to the bot.
  if (!isTagged && !isReplyToBot) return;

  // Tagged without any actual text → fixed greeting.
  if (isTagged && !isReplyToBot) {
    const stripped = mentionStripper.stripMentions(text);
    if (!stripped) {
      await sock.sendMessage(sender, { text: FIXED_TAG_REPLY }, { quoted: msg });
      if (stats) stats.commandsExecuted++;
      return;
    }
  }

  const reply = await chatbotConversation.generateResponse(text, userJid, sender);
  if (reply) {
    await sock.sendMessage(sender, { text: reply }, { quoted: msg });
    if (stats) stats.commandsExecuted++;
  }
}

module.exports = { routeChatbot };