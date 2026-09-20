const config = require('../../config');
const gameRules = require('../../utils/gameRules');

// !game guess — starts a number guessing game.
async function start(sock, msg, sender, bot) {
  const text = gameRules.startGuessNumber(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// !guess <number> — legacy alias that processes a guess directly.
async function guess(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Provide a number!\n*Usage:* ${config.prefix}guess [number]`
    }, { quoted: msg });
  }

  const result = gameRules.processGuess(sender, userJid, args[0]);
  if (result) {
    await sock.sendMessage(sender, { text: result.result }, { quoted: msg });
  }
}

module.exports = { start, guess };