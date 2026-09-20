const config = require('../../config');
const botState = require('../../models/botStateModel');
const ownerChecker = require('../../utils/ownerChecker');

// !mode public|private
// Public: everyone can use the bot's commands.
// Private: only the owner can use commands.

async function handle(sock, msg, sender, userJid, args) {
  if (!ownerChecker.isOwner(userJid)) {
    return sock.sendMessage(sender, {
      text: '❌ Only the bot owner can change the mode!'
    }, { quoted: msg });
  }

  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *BOT MODE*
┌─⊶
│ *Current Mode:* ${botState.getMode().toUpperCase()}
│ *Usage:* ${config.prefix}mode [public/private]
└─────────────⊶`
    }, { quoted: msg });
  }

  const newMode = args[0].toLowerCase();

  if (newMode !== 'public' && newMode !== 'private') {
    return sock.sendMessage(sender, {
      text: '❌ Invalid mode! Use "public" or "private"'
    }, { quoted: msg });
  }

  if (newMode === botState.getMode()) {
    return sock.sendMessage(sender, {
      text: `❌ Bot is already in ${botState.getMode().toUpperCase()} mode!`
    }, { quoted: msg });
  }

  botState.setMode(newMode);

  await sock.sendMessage(sender, {
    text: `✅ Bot mode changed to ${newMode.toUpperCase()}!`
  }, { quoted: msg });
}

module.exports = { handle };