const hangmanEngine = require('../../services/games/hangmanEngine');
const gameRules = require('../../utils/gameRules');

async function start(sock, msg, sender, bot) {
  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const result = hangmanEngine.start(sender);
  if (result.error) {
    return sock.sendMessage(sender, { text: result.error }, { quoted: msg });
  }

  const sent = await sock.sendMessage(sender, {
    text: result.text,
    context: { isGame: true }
  }, { quoted: msg });

  gameRules.attachGameMessageId(sender, sent);
}

module.exports = { start };