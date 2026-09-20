const config = require('../config');

// Tracks message IDs that the bot itself sent, so we can detect
// when a user is replying to a bot message.

function trackBotMessage(messageId, chatJid, options) {
  global.botMessageIds.add(messageId);

  if (options && options.context && options.context.isGame) {
    global.gameMessageIds.add(messageId);
  }

  setTimeout(() => {
    global.botMessageIds.delete(messageId);
    global.gameMessageIds.delete(messageId);
    global.helpMessageIds.delete(messageId);
  }, config.MESSAGE_ID_TTL);
}

function isBotMessageId(messageId) {
  return (
    global.botMessageIds.has(messageId) ||
    global.gameMessageIds.has(messageId) ||
    global.helpMessageIds.has(messageId)
  );
}

// Returns true when the message is a direct reply to a bot-authored message.
function isReplyToBot(msg) {
  if (!global.botInstance || !global.botInstance.botUserId) return false;

  const chatJid = msg.key.remoteJid;

  // Any message in a private chat is considered a reply to the bot.
  if (!chatJid.endsWith('@g.us')) return true;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx) return false;

  return isBotMessageId(ctx.stanzaId);
}

module.exports = {
  trackBotMessage,
  isBotMessageId,
  isReplyToBot
};