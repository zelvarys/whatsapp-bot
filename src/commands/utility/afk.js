const config = require('../../config');
const afkTracker = require('../../utils/afkTracker');

// !afk [reason] — mark self away. No args = clear.
async function handle(sock, msg, sender, userJid, fullText) {
  // No args: clear AFK if set, otherwise show help.
  if (!fullText) {
    if (afkTracker.isAfk(userJid)) {
      afkTracker.clearAfk(userJid);
      return sock.sendMessage(sender, {
        text: '✅ Welcome back! AFK cleared.'
      }, { quoted: msg });
    }

    return sock.sendMessage(sender, {
      text: `✧ *AFK MODE*
┌─⊶
│ *Usage:* ${config.prefix}afk [reason]
│ Marks you away. Clears when you send a message.
└─────────────⊶`
    }, { quoted: msg });
  }

  const reason = fullText.trim().slice(0, 100);

  afkTracker.setAfk(userJid, reason);

  await sock.sendMessage(sender, {
    text: `💤 You're now AFK\n▸ *Reason:* ${reason}`
  }, { quoted: msg });
}

module.exports = { handle };