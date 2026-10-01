const botState = require('../models/botStateModel');
const chatbotConversation = require('../services/ai/chatbotConversation');
const jid = require('../utils/jidHelpers');

// Reply sent when a group member tags the bot without any other content.
// A short acknowledgement beats a full AI round-trip for a bare mention.
const FIXED_TAG_REPLY = 'Hey, how can I help you? 👀';

async function routeChatbot(sock, msg, text, sender, userJid, isGroup, isReplyToBot, isTagged, stats) {
  if (!botState.isChatbotEnabled()) return;

  // Private chats: respond to every non-empty message.
  if (!isGroup) {
    if (!text || !text.trim()) return;

    const reply = await chatbotConversation.generateResponse(text, userJid, sender);
    if (reply) {
      await sock.sendMessage(sender, { text: reply }, { quoted: msg });
      if (stats) stats.commandsExecuted++;
    }
    return;
  }

  // Group chats: only engage when tagged or replying to the bot.
  if (!isTagged && !isReplyToBot) return;

  if (isTagged && !isReplyToBot) {
    const stripped = jid.stripMentions(text);
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