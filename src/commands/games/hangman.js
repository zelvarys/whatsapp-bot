const gameRules = require('../../utils/gameRules');

// !hangman — starts a hangman round.
async function start(sock, msg, sender, bot) {
  const text = gameRules.startHangman(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

module.exports = { start };