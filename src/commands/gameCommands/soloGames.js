const gameRules = require('../../utils/gameRules');
const hangmanEngine = require('../../services/games/hangmanEngine');

async function guess(sock, msg, sender, userJid, bot) {
  const text = gameRules.startGuessNumber(sender, bot, userJid);
  const sent = await sock.sendMessage(sender, { text }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

async function trivia(sock, msg, sender, userJid, bot) {
  const text = gameRules.startTrivia(sender, bot, userJid);
  const sent = await sock.sendMessage(sender, { text }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

async function scramble(sock, msg, sender, userJid, bot) {
  const text = gameRules.startWordScramble(sender, bot, userJid);
  const sent = await sock.sendMessage(sender, { text }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

async function riddle(sock, msg, sender, userJid, bot) {
  const text = gameRules.startRiddle(sender, bot, userJid);
  const sent = await sock.sendMessage(sender, { text }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

async function flag(sock, msg, sender, userJid, bot) {
  const text = gameRules.startFlagQuiz(sender, bot, userJid);
  const sent = await sock.sendMessage(sender, { text }, { quoted: msg });
  gameRules.attachGameMessageId(sender, sent);
}

async function hangman(sock, msg, sender, userJid, bot) {
  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const result = hangmanEngine.start(sender, userJid);
  if (result.error) {
    return sock.sendMessage(sender, { text: result.error }, { quoted: msg });
  }

  const sent = await sock.sendMessage(sender, { text: result.text }, { quoted: msg });
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