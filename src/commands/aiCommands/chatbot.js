const config = require('../../config');
const botState = require('../../models/botStateModel');
const ownerChecker = require('../../utils/ownerChecker');

// !chatbot on|off
async function handle(sock, msg, sender, userJid, args) {
  if (args.length === 0) {
    const status = botState.isChatbotEnabled();
    return sock.sendMessage(sender, {
      text: `✧ *CHATBOT MODE*
┌─⊶
│ *Status:* ${status ? '✅ Active' : '❌ Inactive'}
│ *Usage:* ${config.prefix}chatbot on/off
└─────────────⊶`
    }, { quoted: msg });
  }

  const action = args[0].toLowerCase();

  if (action !== 'on' && action !== 'off') {
    return sock.sendMessage(sender, {
      text: `❌ Invalid subcommand!\n*Usage:* ${config.prefix}chatbot on/off`
    }, { quoted: msg });
  }

  if (!ownerChecker.isOwner(userJid)) {
    return sock.sendMessage(sender, {
      text: '❌ Only the bot owner can toggle chatbot mode!'
    }, { quoted: msg });
  }

  const newState = action === 'on';

  if (newState === botState.isChatbotEnabled()) {
    return sock.sendMessage(sender, {
      text: `ChatBot is already ${newState ? 'Active ✅' : 'Inactive ❌'}`
    }, { quoted: msg });
  }

  botState.setChatbot(newState);

  await sock.sendMessage(sender, {
    text: `ChatBot is now ${newState ? 'Active ✅' : 'Inactive ❌'}\n${
      newState ? "I'll start responding to chats!" : "I'll stop responding to chats!"
    }`
  }, { quoted: msg });
}

module.exports = { handle };