const gameRules = require('../../utils/gameRules');

async function start(sock, msg, sender, bot) {
  const text = gameRules.startRiddle(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

module.exports = { start };