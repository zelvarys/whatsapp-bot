const gameRules = require('../../utils/gameRules');
const hangmanEngine = require('../../services/games/hangmanEngine');

// -------------------- guess --------------------

async function guess(sock, msg, sender, bot) {
  const text = gameRules.startGuessNumber(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// -------------------- trivia --------------------

async function trivia(sock, msg, sender, bot) {
  const text = gameRules.startTrivia(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// -------------------- scramble --------------------

async function scramble(sock, msg, sender, bot) {
  const text = gameRules.startWordScramble(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// -------------------- riddle --------------------

async function riddle(sock, msg, sender, bot) {
  const text = gameRules.startRiddle(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// -------------------- flag --------------------

async function flag(sock, msg, sender, bot) {
  const text = gameRules.startFlagQuiz(sender, bot);
  const sent = await sock.sendMessage(sender, { text, context: { isGame: true } }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

// -------------------- hangman --------------------

async function hangman(sock, msg, sender, bot) {
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

module.exports = {
  guess,
  trivia,
  scramble,
  riddle,
  flag,
  hangman
};