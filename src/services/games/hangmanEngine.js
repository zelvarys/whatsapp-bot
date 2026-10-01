const config = require('../../config');
const { load } = require('../../utils/contentLoader');
const userModel = require('../../models/userModel');
const gameStatsModel = require('../../models/gameStatsModel');
const gameRules = require('../../utils/gameRules');

const POINTS_PER_CORRECT_LETTER = 15;
const POINTS_ON_LOSS = 5;

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

function start(chatJid, userJid) {
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
    participants: userJid ? [userJid] : [],
    maxWrong: config.gameSettings.hangmanMaxWrong,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us')
  });

  if (userJid) userModel.recordParticipation(userJid);

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
      gameOver: false
    };
  }

  if (game.guessedLetters.includes(letter)) {
    return {
      result: `❌ *${letter}* was already guessed.`,
      won: false,
      gameOver: false
    };
  }

  if (userJid && !game.participants.includes(userJid)) {
    game.participants.push(userJid);
    userModel.recordParticipation(userJid);
  }

  game.guessedLetters.push(letter);

  const isInWord = game.word.includes(letter);

  if (isInWord) {
    userModel.addPoints(userJid, POINTS_PER_CORRECT_LETTER);
  } else {
    game.wrongLetters.push(letter);
  }

  const won = game.word.split('').every((ch) => game.guessedLetters.includes(ch));

  if (won) {
    global.activeGames.delete(chatJid);

    for (const participant of game.participants) {
      userModel.addWin(participant);
    }

    gameStatsModel.increment('hangman', POINTS_PER_CORRECT_LETTER * game.participants.length);

    return {
      result: `🎉 *SOLVED!*\nThe word was *${game.word}*\n\n▸ Play again: !hangman`,
      won: true,
      gameOver: true,
      mention: game.isGroup ? game.participants : null
    };
  }

  const lost = game.wrongLetters.length >= game.maxWrong;

  if (lost) {
    global.activeGames.delete(chatJid);

    for (const participant of game.participants) {
      userModel.addPoints(participant, POINTS_ON_LOSS);
    }

    gameStatsModel.increment('hangman', POINTS_ON_LOSS * game.participants.length);

    return {
      result: `💀 *GAME OVER*\nThe word was *${game.word}*\n\n▸ +${POINTS_ON_LOSS} points to every participant`,
      won: false,
      gameOver: true,
      mention: game.isGroup ? game.participants : null
    };
  }

  const letterFeedback = isInWord
    ? `✅ *${letter}* is in the word (+${POINTS_PER_CORRECT_LETTER} points)`
    : `❌ *${letter}* is not in the word`;

  return {
    result: `${letterFeedback}\n\n${buildDisplay(game)}`,
    won: false,
    gameOver: false
  };
}

module.exports = {
  start,
  processGuess
};