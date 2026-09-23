const config = require('../../config');
const wordValidator = require('../../utils/wordValidator');

const minPlayers = 3;
const maxPlayers = 8;

const START_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY'.split('');
const END_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY'.split('');

function pickLetter(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function startGame(lobby) {
  const first = pickLetter(START_LETTERS);
  const second = pickLetter(END_LETTERS);

  const state = {
    type: 'bombshell',
    players: lobby.players.slice(),
    eliminated: [],
    currentPlayer: lobby.players[0],
    turnOrder: lobby.players.slice(),
    turnIndex: 0,
    firstLetter: first,
    secondLetter: second,
    usedWords: [],
    gameMessageId: null,
    lastMessageId: null
  };

  const text = `✧ *BOMBSHELL — START*

The bomb passes to the first player.

Word rule: starts with *${first}* and ends with *${second}*
You have 20 seconds on your turn.

▸ @${state.currentPlayer.split('@')[0]}, reply with a word!`;

  return {
    text,
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
    return eliminateCurrent(game, !patternOk ? 'pattern' : !isReal ? 'not a real word' : 'already used');
  }

  game.usedWords.push(word);

  const nextFirst = pickLetter(START_LETTERS);
  const nextSecond = pickLetter(END_LETTERS);
  game.firstLetter = nextFirst;
  game.secondLetter = nextSecond;

  game.turnIndex = (game.turnIndex + 1) % game.turnOrder.length;
  game.currentPlayer = game.turnOrder[game.turnIndex];

  const text_ = `✅ *${word}* accepted.

Next: starts with *${nextFirst}* and ends with *${nextSecond}*
▸ @${game.currentPlayer.split('@')[0]}, your turn! (20s)`;

  return {
    text: text_,
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
      gameOver: {
        winners: [winner],
        losers: game.eliminated
      }
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

  const nextFirst = pickLetter(START_LETTERS);
  const nextSecond = pickLetter(END_LETTERS);
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

async function handle(sock, msg, sender, userJid) {
  const existing = global.gameLobbies.get(sender);
  if (existing) {
    return sock.sendMessage(sender, {
      text: `❌ A ${existing.gameType} lobby is already open in this chat.`
    }, { quoted: msg });
  }

  const lobby = require('../../utils/lobbyState').createLobby(sender, 'bombshell', userJid, {
    minPlayers,
    maxPlayers,
    startGame,
    handleTurn,
    handleTimeout
  });

  global.gameLobbies.set(sender, lobby);

  await require('../../utils/lobbyState').postLobby(sock, sender, lobby);
}

module.exports = {
  handle,
  minPlayers,
  maxPlayers,
  startGame,
  handleTurn,
  handleTimeout
};