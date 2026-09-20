const config = require('../../config');
const gameRules = require('../../utils/gameRules');

// !game riddle — starts a riddle round.
async function start(sock, msg, sender, bot) {
  const text = gameRules.startRiddle(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// !solve <answer> — legacy alias to answer directly.
async function solve(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Please provide an answer!\n*Usage:* ${config.prefix}solve [your answer]`
    }, { quoted: msg });
  }

  const result = gameRules.processRiddle(sender, userJid, args.join(' '));
  if (result) {
    await sock.sendMessage(sender, {
      text: result.result,
      mentions: result.mention ? [result.mention] : undefined
    }, { quoted: msg });
  }
}

module.exports = { start, solve };