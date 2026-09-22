const gameRules = require('../utils/gameRules');
const tictactoeGame = require('../commands/games/tictactoe');
const reactions = require('../utils/messageReactions');

const REACTIVE_GAMES = ['trivia', 'riddle', 'wordScramble', 'flag'];
const SLOW_GAMES = ['hangman', 'riddle', 'wordScramble'];

async function routeGameAnswer(sock, msg, text, sender, userJid, repliedToMessageId) {
  if (/^[1-9]$/.test(text.trim())) {
    if (tictactoeGame.ownsReply(sender, userJid, repliedToMessageId)) {
      await tictactoeGame.handleReply(sock, sender, userJid, msg, text.trim());
      return true;
    }
  }

  const game = global.activeGames.get(sender);
  if (!game) return false;

  const chainMatched =
    repliedToMessageId &&
    (repliedToMessageId === game.gameMessageId || repliedToMessageId === game.lastMessageId);

  // Strict reply-chain rule for fast games.
  // Slow games accept a plain-text answer as long as the message matches
  // the expected shape for that game.
  const isSlow = SLOW_GAMES.includes(game.type);
  const isShapedAnswer = matchesShape(game.type, text.trim());

  if (!chainMatched && !(isSlow && isShapedAnswer)) {
    return false;
  }

  const result = processGameText(game.type, sender, userJid, text.trim());
  if (!result) return false;

  const sent = await sock.sendMessage(sender, {
    text: result.result,
    mentions: result.mention ? [result.mention] : undefined
  }, { quoted: msg });

  const stillActive = global.activeGames.get(sender);
  if (stillActive && sent && sent.key && sent.key.id) {
    gameRules.updateLastMessageId(sender, sent);
  }

  if (REACTIVE_GAMES.includes(game.type)) {
    if (result.won) {
      await reactions.applyReaction(sock, sender, msg.key, '✅');
    } else if (!result.gameOver) {
      await reactions.applyReaction(sock, sender, msg.key, '❌');
    }
  }

  return true;
}

// Validates that the raw text could plausibly be an answer for the game type.
function matchesShape(gameType, text) {
  switch (gameType) {
    case 'hangman':
      return /^[A-Za-z]$/.test(text);
    case 'guess':
      return /^\d{1,3}$/.test(text);
    case 'trivia':
      return /^[A-Da-d1-4]$/.test(text);
    case 'riddle':
    case 'wordScramble':
    case 'flag':
      return text.length > 0 && text.length < 60;
    default:
      return false;
  }
}

function processGameText(gameType, sender, userJid, text) {
  switch (gameType) {
    case 'guess': {
      const asNumber = parseInt(text);
      if (isNaN(asNumber)) return null;
      return gameRules.processGuess(sender, userJid, text);
    }

    case 'trivia': {
      const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      const answer = map[text] || text.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(answer)) return null;
      return gameRules.processTriviaAnswer(sender, userJid, answer);
    }

    case 'wordScramble':
      return gameRules.processWordScramble(sender, userJid, text);

    case 'riddle':
      return gameRules.processRiddle(sender, userJid, text);

    case 'flag':
      return gameRules.processFlagGuess(sender, userJid, text);

    case 'hangman':
      return gameRules.processHangmanGuess(sender, userJid, text);

    default:
      return null;
  }
}

module.exports = { routeGameAnswer };