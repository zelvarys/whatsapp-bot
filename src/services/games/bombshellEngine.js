const wordValidator = require('../../utils/wordValidator');

const minPlayers = 3;
const maxPlayers = 8;

const LETTER_PAIRS = [
  ['A', 'D'], ['A', 'E'], ['A', 'G'], ['A', 'K'], ['A', 'L'],
  ['A', 'M'], ['A', 'N'], ['A', 'P'], ['A', 'R'], ['A', 'S'],
  ['A', 'T'], ['A', 'W'], ['A', 'Y'],
  ['B', 'D'], ['B', 'E'], ['B', 'G'], ['B', 'K'], ['B', 'L'],
  ['B', 'N'], ['B', 'R'], ['B', 'S'], ['B', 'T'], ['B', 'Y'],
  ['C', 'E'], ['C', 'H'], ['C', 'K'], ['C', 'L'], ['C', 'N'],
  ['C', 'P'], ['C', 'R'], ['C', 'S'], ['C', 'T'], ['C', 'Y'],
  ['D', 'E'], ['D', 'G'], ['D', 'K'], ['D', 'N'], ['D', 'R'],
  ['D', 'S'], ['D', 'T'], ['D', 'Y'],
  ['F', 'E'], ['F', 'G'], ['F', 'L'], ['F', 'N'], ['F', 'R'],
  ['F', 'S'], ['F', 'T'], ['F', 'Y'],
  ['G', 'E'], ['G', 'H'], ['G', 'L'], ['G', 'N'], ['G', 'R'],
  ['G', 'S'], ['G', 'T'], ['G', 'Y'],
  ['H', 'E'], ['H', 'L'], ['H', 'N'], ['H', 'P'], ['H', 'S'],
  ['H', 'T'], ['H', 'Y'],
  ['K', 'E'], ['K', 'N'], ['K', 'S'], ['K', 'T'], ['K', 'Y'],
  ['L', 'E'], ['L', 'K'], ['L', 'L'], ['L', 'M'], ['L', 'N'],
  ['L', 'P'], ['L', 'S'], ['L', 'T'], ['L', 'Y'],
  ['M', 'E'], ['M', 'N'], ['M', 'P'], ['M', 'S'], ['M', 'T'], ['M', 'Y'],
  ['N', 'E'], ['N', 'G'], ['N', 'L'], ['N', 'S'], ['N', 'T'], ['N', 'Y'],
  ['P', 'E'], ['P', 'H'], ['P', 'L'], ['P', 'N'], ['P', 'R'],
  ['P', 'S'], ['P', 'T'], ['P', 'Y'],
  ['R', 'E'], ['R', 'K'], ['R', 'L'], ['R', 'M'], ['R', 'N'],
  ['R', 'P'], ['R', 'S'], ['R', 'T'], ['R', 'Y'],
  ['S', 'E'], ['S', 'G'], ['S', 'H'], ['S', 'K'], ['S', 'L'],
  ['S', 'M'], ['S', 'N'], ['S', 'P'], ['S', 'S'], ['S', 'T'], ['S', 'Y'],
  ['T', 'E'], ['T', 'H'], ['T', 'L'], ['T', 'N'], ['T', 'R'],
  ['T', 'S'], ['T', 'T'], ['T', 'Y'],
  ['W', 'E'], ['W', 'K'], ['W', 'L'], ['W', 'N'], ['W', 'R'],
  ['W', 'S'], ['W', 'T'], ['W', 'Y'],
  ['Y', 'E'], ['Y', 'S']
];

function pickPair() {
  return LETTER_PAIRS[Math.floor(Math.random() * LETTER_PAIRS.length)];
}

function startGame(orderedPlayers) {
  const [first, second] = pickPair();

  const state = {
    type: 'bombshell',
    players: orderedPlayers.slice(),
    eliminated: [],
    currentPlayer: orderedPlayers[0],
    turnOrder: orderedPlayers.slice(),
    turnIndex: 0,
    firstLetter: first,
    secondLetter: second,
    usedWords: [],
    gameMessageId: null,
    lastMessageId: null
  };

  return {
    text: `✧ *BOMBSHELL — START*

The bomb passes to the first player.

Word rule: starts with *${first}* and ends with *${second}*
You have 20 seconds on your turn.

▸ @${state.currentPlayer.split('@')[0]}, reply with a word!`,
    mentions: [state.currentPlayer],
    state
  };
}

function handleTurn(game, userJid, text) {
  const word = String(text).trim().toUpperCase();

  if (game.currentPlayer !== userJid) return null;

  const first = game.firstLetter;
  const last = game.secondLetter;

  const patternOk = word.startsWith(first) && word.endsWith(last) && word.length >= 3;
  const isReal = patternOk && wordValidator.isWord(word);
  const isNew = !game.usedWords.includes(word);

  if (!patternOk || !isReal || !isNew) {
    return eliminateCurrent(game, !patternOk ? 'wrong pattern' : !isReal ? 'not a real word' : 'already used');
  }

  game.usedWords.push(word);

  const [nextFirst, nextSecond] = pickPair();
  game.firstLetter = nextFirst;
  game.secondLetter = nextSecond;

  game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
  game.currentPlayer = game.turnOrder[game.turnIndex];

  return {
    text: `✅ *${word}* accepted.

Next: starts with *${nextFirst}* and ends with *${nextSecond}*
▸ @${game.currentPlayer.split('@')[0]}, your turn! (20s)`,
    mentions: [game.currentPlayer],
    gameOver: null
  };
}

function handleTimeout(game) {
  return eliminateCurrent(game, 'timeout');
}

function eliminateCurrent(game, reason) {
  const loser = game.currentPlayer;
  game.eliminated.push(loser);

  const idx = game.turnOrder.indexOf(loser);
  if (idx !== -1) game.turnOrder.splice(idx, 1);

  if (game.turnOrder.length === 1) {
    const winner = game.turnOrder[0];
    return {
      text: `💥 @${loser.split('@')[0]} is out (${reason})!

🏆 *@${winner.split('@')[0]} WINS BOMBSHELL!*
▸ +60 points`,
      mentions: [loser, winner],
      gameOver: { winners: [winner], losers: game.eliminated }
    };
  }

  if (game.turnOrder.length === 0) {
    return {
      text: `💥 Everyone eliminated. No winner.`,
      mentions: [loser],
      gameOver: { winners: [], losers: game.eliminated }
    };
  }

  if (game.turnIndex >= game.turnOrder.length) game.turnIndex = 0;
  game.currentPlayer = game.turnOrder[game.turnIndex];

  const [nextFirst, nextSecond] = pickPair();
  game.firstLetter = nextFirst;
  game.secondLetter = nextSecond;

  return {
    text: `💥 @${loser.split('@')[0]} is out (${reason})!

Next: starts with *${nextFirst}* and ends with *${nextSecond}*
▸ @${game.currentPlayer.split('@')[0]}, your turn! (20s)`,
    mentions: [loser, game.currentPlayer],
    gameOver: null
  };
}

module.exports = {
  minPlayers,
  maxPlayers,
  startGame,
  handleTurn,
  handleTimeout
};