const config = require('../../config');
const ownerChecker = require('../../utils/ownerChecker');
const state = require('../../utils/stateHelpers');

// !delete — reply to a bot message to delete it. Owner only.
async function handle(sock, msg, sender, userJid) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const repliedToId = ctx?.stanzaId;

  if (!repliedToId) {
    return sock.sendMessage(sender, {
      text: "❌ Reply to the bot's message you want to delete!"
    }, { quoted: msg });
  }

  if (!state.isBotMessageId(repliedToId)) {
    return sock.sendMessage(sender, {
      text: '❌ You can only delete messages sent by the bot!'
    }, { quoted: msg });
  }

  if (!ownerChecker.isOwner(userJid)) {
    return sock.sendMessage(sender, {
      text: '❌ Only the owner can delete bot messages!'
    }, { quoted: msg });
  }

  try {
    await sock.sendMessage(sender, {
      delete: { remoteJid: sender, fromMe: true, id: repliedToId }
    });
  } catch (err) {
    console.error('Delete command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to delete message.'
    }, { quoted: msg });
  }
}

module.exports = { handle };