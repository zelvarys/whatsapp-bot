const config = require('../../config');
const gameRules = require('../../utils/gameRules');

// !game flag — starts a flag quiz.
async function start(sock, msg, sender, bot) {
  const text = gameRules.startFlagQuiz(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// !flag <country> — legacy alias to answer directly.
async function flag(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Provide a country name!\n*Usage:* ${config.prefix}flag [country name]`
    }, { quoted: msg });
  }

  const result = gameRules.processFlagGuess(sender, userJid, args.join(' '));
  if (result) {
    await sock.sendMessage(sender, { text: result.result }, { quoted: msg });
  }
}

module.exports = { start, flag };