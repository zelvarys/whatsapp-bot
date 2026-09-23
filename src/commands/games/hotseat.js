const config = require('../../config');
const wordValidator = require('../../utils/wordValidator');
const { load } = require('../../utils/contentLoader');

const minPlayers = 3;
const maxPlayers = 8;

const HUNT_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY'.split('');

const CHALLENGE_WEIGHTS = {
  oddOneOut: 1,
  typeBackwards: 1,
  punctuation: 1,
  letterHunt: 1,
  silhouette: 1
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function randomPunctuationString() {
  const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&@';
  const len = 5 + Math.floor(Math.random() * 3);
  let s = '';
  for (let i = 0; i < len; i++) s += pool[Math.floor(Math.random() * pool.length)];
  return s;
}

// ---------------- Challenge generators ----------------

function makeOddOneOut() {
  const content = load('hotseat');
  const entries = content.oddOneOut;
  const entry = pickRandom(entries);

  const items = shuffle([entry.odd, ...entry.others]);
  const answerPos = items.indexOf(entry.odd) + 1;

  return {
    kind: 'oddOneOut',
    prompt: `Which one is the odd one out?\n\n  1. ${items[0]}  2. ${items[1]}\n  3. ${items[2]}  4. ${items[3]}\n\nReply with the number (1-4).`,
    expected: String(answerPos),
    hint: null
  };
}

function makeTypeBackwards() {
  const digits = randomDigits(7);
  const expected = digits.split('').reverse().join('');

  return {
    kind: 'typeBackwards',
    prompt: `Type these digits backwards:\n\n*${digits}*\n\nExample: if it shows 123, you type 321.`,
    expected,
    hint: null
  };
}

function makePunctuation() {
  const target = randomPunctuationString();

  return {
    kind: 'punctuation',
    prompt: `Type this exactly, matching case and symbols:\n\n\`${target}\``,
    expected: target,
    hint: null
  };
}

function makeLetterHunt() {
  const letter = pickRandom(HUNT_LETTERS);

  return {
    kind: 'letterHunt',
    prompt: `Type any valid English word containing the letter *${letter}*.`,
    expected: letter,
    hint: 'contains-letter'
  };
}

function makeSilhouette() {
  const content = load('hotseat');
  const sentences = content.silhouette;
  const sentence = pickRandom(sentences);
  const words = sentence.split(' ');

  // Position 2..6 (1-indexed, so index 1..5)
  const positions = [2, 3, 4, 5, 6].filter((p) => p <= words.length);
  const position = pickRandom(positions);
  const expected = words[position - 1];

  return {
    kind: 'silhouette',
    prompt: `What is word #${position} in this sentence?\n\n"${sentence}"`,
    expected: expected.toLowerCase(),
    hint: null
  };
}

const GENERATORS = [
  makeOddOneOut,
  makeTypeBackwards,
  makePunctuation,
  makeLetterHunt,
  makeSilhouette
];

function generateChallenge() {
  return pickRandom(GENERATORS)();
}

// ---------------- Game state ----------------

function startGame(lobby) {
  const state = {
    type: 'hotseat',
    players: lobby.players.slice(),
    eliminated: [],
    currentPlayer: null,
    challenge: null,
    gameMessageId: null,
    lastMessageId: null
  };

  state.currentPlayer = pickRandom(state.players);

  state.challenge = generateChallenge();

  const text = `✧ *HOT SEAT — START*

One player at a time. 10 seconds to answer.

🔥 @${state.currentPlayer.split('@')[0]} is on the spot!

${state.challenge.prompt}`;

  return {
    text,
    mentions: [state.currentPlayer],
    state
  };
}

function handleTurn(game, userJid, text) {
  if (game.currentPlayer !== userJid) return null;

  const challenge = game.challenge;
  const answer = String(text).trim();

  let correct = false;

  if (challenge.hint === 'contains-letter') {
    const lower = answer.toLowerCase();
    const letter = challenge.expected.toLowerCase();
    correct = wordValidator.isWord(answer) && lower.includes(letter);
  } else {
    correct = answer.toLowerCase() === challenge.expected.toLowerCase();
  }

  if (!correct) {
    return eliminatePlayer(game, `wrong answer (expected: ${challenge.expected})`);
  }

  // Advance to next player, fresh challenge
  const remaining = game.players.filter((p) => !game.eliminated.includes(p));
  const nextCandidates = remaining.filter((p) => p !== userJid);

  if (nextCandidates.length === 0) {
    return {
      text: `✅ Correct! But no one left to challenge...`,
      mentions: [],
      gameOver: null
    };
  }

  game.currentPlayer = pickRandom(nextCandidates);
  game.challenge = generateChallenge();

  return {
    text: `✅ Correct!

🔥 @${game.currentPlayer.split('@')[0]} is on the spot!

${game.challenge.prompt}`,
    mentions: [game.currentPlayer],
    gameOver: null
  };
}

function handleTimeout(game) {
  return eliminatePlayer(game, 'timeout');
}

function eliminatePlayer(game, reason) {
  const loser = game.currentPlayer;
  game.eliminated.push(loser);

  const remaining = game.players.filter((p) => !game.eliminated.includes(p));

  if (remaining.length === 1) {
    const winner = remaining[0];
    return {
      text: `💥 @${loser.split('@')[0]} is out (${reason})!

🏆 *@${winner.split('@')[0]} WINS HOT SEAT!*
▸ +60 points`,
      mentions: [loser, winner],
      gameOver: {
        winners: [winner],
        losers: game.eliminated
      }
    };
  }

  if (remaining.length === 0) {
    return {
      text: `💥 Everyone eliminated. No winner.`,
      mentions: [loser],
      gameOver: { winners: [], losers: game.eliminated }
    };
  }

  game.currentPlayer = pickRandom(remaining);
  game.challenge = generateChallenge();

  return {
    text: `💥 @${loser.split('@')[0]} is out (${reason})!

🔥 @${game.currentPlayer.split('@')[0]} is on the spot!

${game.challenge.prompt}`,
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

  const lobby = require('../../utils/lobbyState').createLobby(sender, 'hotseat', userJid, {
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