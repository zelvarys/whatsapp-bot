const config = require('../../config');
const { load } = require('../../utils/contentLoader');
const userModel = require('../../models/userModel');
const gameStatsModel = require('../../models/gameStatsModel');
const gameRules = require('../../utils/gameRules');

function buildDisplay(game) {
  const word = game.word.toUpperCase();
  const guessed = new Set(game.guessedLetters);

  const visible = word
    .split('')
    .map((ch) => (guessed.has(ch) ? ch : '_'))
    .join(' ');

  const wrong = game.wrongLetters.length
    ? game.wrongLetters.join(' ')
    : '—';

  const remaining = game.maxWrong - game.wrongLetters.length;

  return `✧ *HANGMAN* — ${game.category}

${visible}

Wrong: ${wrong}
Attempts left: ${remaining}/${game.maxWrong}`;
}

function start(chatJid) {
  if (!gameRules.canStartGame(chatJid, 'hangman')) {
    const active = global.activeGames.get(chatJid);
    return { error: `❌ A ${gameRules.gameLabel(active.type)} game is already active!` };
  }

  const now = Date.now();
  const pool = load('hangman_words');
  const pick = pool[Math.floor(Math.random() * pool.length)];

  global.activeGames.set(chatJid, {
    type: 'hangman',
    word: pick.word.toUpperCase(),
    category: pick.category,
    guessedLetters: [],
    wrongLetters: [],
    participants: [],
    maxWrong: config.gameSettings.hangmanMaxWrong,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us')
  });

  const game = global.activeGames.get(chatJid);
  return { text: `${buildDisplay(game)}\n\n▸ Reply with a single letter to guess.` };
}

function processGuess(chatJid, userJid, rawGuess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'hangman') return null;

  gameRules.touchGame(game);

  const letter = String(rawGuess).trim().toUpperCase();

  if (!/^[A-Z]$/.test(letter)) {
    return {
      result: '❌ Send one letter at a time.',
      won: false,
      gameOver: false,
      keepGame: true
    };
  }

  if (game.guessedLetters.includes(letter)) {
    return {
      result: `❌ *${letter}* was already guessed.`,
      won: false,
      gameOver: false,
      keepGame: true
    };
  }

  if (!game.participants.includes(userJid)) {
    game.participants.push(userJid);
  }

  game.guessedLetters.push(letter);

  const isInWord = game.word.includes(letter);

  if (isInWord) {
    userModel.addPoints(userJid, 15);
  } else {
    game.wrongLetters.push(letter);
  }

  const won = game.word.split('').every((ch) => game.guessedLetters.includes(ch));

  if (won) {
    global.activeGames.delete(chatJid);
    userModel.addWin(userJid);
    gameStatsModel.increment('hangman', 50);

    return {
      result: `🎉 *SOLVED!*\nThe word was *${game.word}*\n\n▸ +15 for the letter, +50 for the win\n▸ Play again: !hangman`,
      won: true,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  const lost = game.wrongLetters.length >= game.maxWrong;

  if (lost) {
    global.activeGames.delete(chatJid);

    for (const participant of game.participants) {
      userModel.addPoints(participant, 5);
    }

    gameStatsModel.increment('hangman', 5 * game.participants.length);

    return {
      result: `💀 *GAME OVER*\nThe word was *${game.word}*\n\n▸ +5 points to all participant`,
      won: false,
      gameOver: true,
      mention: game.isGroup ? game.participants : null
    };
  }

  const letterFeedback = isInWord
    ? `✅ *${letter}* is in the word (+15 points)`
    : `❌ *${letter}* is not in the word`;

  return {
    result: `${letterFeedback}\n\n${buildDisplay(game)}`,
    won: false,
    gameOver: false,
    keepGame: true
  };
}

module.exports = {
  start,
  processGuess
};