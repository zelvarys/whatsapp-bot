const gameRules = require('../utils/gameRules');
const tictactoeGame = require('../commands/games/tictactoe');
const reactions = require('../utils/messageReactions');

// Handles messages that might be answers to an active game.
// Only accepts answers that are replies to the game's own message chain.
//
// Reactions (✅ / ❌) are applied only for the four reactive games:
//   trivia, riddle, wordScramble, flag.
// Other games (guess, rps, tictactoe) never receive answer reactions.

const REACTIVE_GAMES = ['trivia', 'riddle', 'wordScramble', 'flag'];

async function routeGameAnswer(sock, msg, text, sender, userJid, repliedToMessageId) {
  // tictactoe has its own message-chain check.
  if (/^[1-9]$/.test(text.trim())) {
    if (tictactoeGame.ownsReply(sender, userJid, repliedToMessageId)) {
      await tictactoeGame.handleReply(sock, sender, userJid, msg, text.trim());
      return true;
    }
  }

  const game = global.activeGames.get(sender);
  if (!game) return false;

  // Only accept replies to the game's own message chain.
  const isReplyToGame =
    repliedToMessageId &&
    (repliedToMessageId === game.gameMessageId || repliedToMessageId === game.lastMessageId);

  if (!isReplyToGame) return false;

  const result = processGameText(game.type, sender, userJid, text.trim());
  if (!result) return false;

  // Send the result message.
  const sent = await sock.sendMessage(sender, {
    text: result.result,
    mentions: result.mention ? [result.mention] : undefined
  }, { quoted: msg });

  // Keep the game's lastMessageId fresh so the next reply can chain off this.
  const stillActive = global.activeGames.get(sender);
  if (stillActive && sent && sent.key && sent.key.id) {
    gameRules.updateLastMessageId(sender, sent);
  }

  // Apply ✅ or ❌ only for the reactive games.
  if (REACTIVE_GAMES.includes(game.type)) {
    if (result.won) {
      await reactions.applyReaction(sock, sender, msg.key, '✅');
    } else if (!result.gameOver) {
      await reactions.applyReaction(sock, sender, msg.key, '❌');
    }
    // If the game ended without a win (attempts exhausted), no reaction.
  }

  return true;
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

    default:
      return null;
  }
}

module.exports = { routeGameAnswer };