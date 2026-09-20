const config = require('../../config');
const gameRules = require('../../utils/gameRules');

// !game trivia — starts a trivia question.
async function start(sock, msg, sender, bot) {
  const text = gameRules.startTrivia(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// !answer <A/B/C/D> — legacy alias to answer directly.
async function answer(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Provide an answer!\n*Usage:* ${config.prefix}answer [A/B/C/D]`
    }, { quoted: msg });
  }

  const result = gameRules.processTriviaAnswer(sender, userJid, args[0]);
  if (result) {
    await sock.sendMessage(sender, {
      text: result.result,
      mentions: result.mention ? [result.mention] : undefined
    }, { quoted: msg });
  }
}

module.exports = { start, answer };