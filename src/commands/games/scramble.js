const config = require('../../config');
const gameRules = require('../../utils/gameRules');

// !game scramble — starts a word scramble round.
async function start(sock, msg, sender, bot) {
  const text = gameRules.startWordScramble(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// !unscramble <word> — legacy alias to answer directly.
async function unscramble(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Provide a word!\n*Usage:* ${config.prefix}unscramble [word]`
    }, { quoted: msg });
  }

  const result = gameRules.processWordScramble(sender, userJid, args[0]);
  if (result) {
    await sock.sendMessage(sender, {
      text: result.result,
      mentions: result.mention ? [result.mention] : undefined
    }, { quoted: msg });
  }
}

module.exports = { start, unscramble };