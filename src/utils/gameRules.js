const { load } = require('./contentLoader');
const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const config = require('../config');

const FAST_STALE_MS = 20 * 1000;
const SLOW_STALE_MS = 2 * 60 * 1000;
const SLOW_GAMES = ['riddle', 'wordScramble'];

function isSlowGame(type) {
  return SLOW_GAMES.includes(type);
}

function lastSeen(game) {
  return game.lastActivity || game.startTime || 0;
}

function touchGame(game) {
  if (game) game.lastActivity = Date.now();
}

function canStartGame(chatJid, gameType) {
  const activeGame = global.activeGames.get(chatJid);
  if (!activeGame) return true;

  const staleMs = isSlowGame(activeGame.type) ? SLOW_STALE_MS : FAST_STALE_MS;
  const age = Date.now() - lastSeen(activeGame);

  if (age > staleMs) {
    global.activeGames.delete(chatJid);
    return true;
  }

  return false;
}

function gameLabel(type) {
  const labels = {
    guess: 'number guessing',
    trivia: 'trivia',
    wordScramble: 'word scramble',
    riddle: 'riddle',
    flag: 'flag quiz',
    hangman: 'hangman'
  };
  return labels[type] || type;
}

// Levenshtein distance between two strings, used to accept answers that
// are close enough to the reference without being exact.
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }

  return prev[n];
}

// Accepts an answer if it normalises to the same string as the correct
// answer, or if the edit distance is within a tolerance that scales with
// the length of the expected answer. Short answers (three letters or
// fewer) require an exact match so that a stray letter cannot win.
function isSimilarAnswer(userAnswer, correctAnswer) {
  const normalize = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const user = normalize(userAnswer);
  const correct = normalize(correctAnswer);

  if (!user || !correct) return false;
  if (user === correct) return true;

  const threshold =
    correct.length <= 3 ? 0 :
    correct.length <= 6 ? 1 :
    correct.length <= 10 ? 2 :
    3;

  if (threshold === 0) return false;

  return levenshtein(user, correct) <= threshold;
}

function startGuessNumber(chatJid, bot, userJid) {
  if (!canStartGame(chatJid, 'guess')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const now = Date.now();
  const number = Math.floor(Math.random() * 100) + 1;

  global.activeGames.set(chatJid, {
    type: 'guess',
    number,
    attempts: 0,
    maxAttempts: config.gameSettings.guessMaxAttempts,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null
  });

  if (userJid) userModel.recordParticipation(userJid);

  return `✧ *NUMBER GUESSING*
┌─⊶
│ Guess a number between 1 and 100.
│ You have ${config.gameSettings.guessMaxAttempts} attempts.
└─────────────⊶
▸ Reply with a number (1-100) to play!`;
}

function processGuess(chatJid, userJid, rawGuess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'guess') return null;

  touchGame(game);

  const guess = parseInt(rawGuess);
  if (isNaN(guess)) {
    return { result: '❌ Enter a valid number!', won: false, gameOver: false };
  }

  if (guess < 1 || guess > 100) {
    return { result: '❌ Guess a number between 1 and 100!', won: false, gameOver: false };
  }

  game.attempts++;

  if (guess === game.number) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 50);
    userModel.addWin(userJid);
    gameStatsModel.increment('guess', 50);

    return {
      result: '🎉 *Correct* +50 points!\n▸ Play again: !game guess',
      won: true,
      gameOver: true
    };
  }

  if (game.attempts >= game.maxAttempts) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 10);
    gameStatsModel.increment('guess', 10);

    return {
      result: `❌ *Game Over* +10 points!\nThe number was ${game.number}\n\n▸ Play again: !game guess`,
      won: false,
      gameOver: true
    };
  }

  const hint = guess > game.number ? '📉 Too high!' : '📈 Too low!';

  return {
    result: `${hint}\nAttempts: ${game.attempts}/${game.maxAttempts}`,
    won: false,
    gameOver: false
  };
}

function startTrivia(chatJid, bot, userJid) {
  if (!canStartGame(chatJid, 'trivia')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const now = Date.now();
  const questions = load('trivia_questions');
  const question = questions[Math.floor(Math.random() * questions.length)];

  global.activeGames.set(chatJid, {
    type: 'trivia',
    question,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us'),
    participants: userJid ? [userJid] : []
  });

  if (userJid) userModel.recordParticipation(userJid);

  return `✧ *TRIVIA TIME*

${question.question}

${question.options.join('\n')}

▸ Reply with A, B, C, or D to answer!`;
}

function processTriviaAnswer(chatJid, userJid, answer) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'trivia') return null;

  touchGame(game);

  if (userJid && !game.participants.includes(userJid)) {
    game.participants.push(userJid);
    userModel.recordParticipation(userJid);
  }

  const userAnswer = String(answer).trim().toUpperCase();
  const correct = game.question.answer;

  if (userAnswer === correct) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 20);
    userModel.addWin(userJid);
    gameStatsModel.increment('trivia', 20);

    return {
      result: '🎉 *Correct* +20 points!\nPlay again: !game trivia',
      won: true,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  return {
    result: '❌ *Wrong answer* Try again!',
    won: false,
    gameOver: false,
    mention: game.isGroup ? userJid : null
  };
}

function startWordScramble(chatJid, bot, userJid) {
  if (!canStartGame(chatJid, 'wordScramble')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const now = Date.now();
  const words = load('word_scramble');
  const wordData = words[Math.floor(Math.random() * words.length)];

  global.activeGames.set(chatJid, {
    type: 'wordScramble',
    word: wordData.word,
    scrambled: wordData.scrambled,
    hint: wordData.hint,
    attempts: 0,
    maxAttempts: config.gameSettings.scrambleMaxAttempts,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us'),
    participants: userJid ? [userJid] : []
  });

  if (userJid) userModel.recordParticipation(userJid);

  return `✧ *WORD SCRAMBLE*
┌─⊶
│ *Unscramble:* *${wordData.scrambled}*
│ *Hint:* ${wordData.hint}
└─────────────⊶
▸ Reply with the unscrambled word!`;
}

function processWordScramble(chatJid, userJid, guess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'wordScramble') return null;

  touchGame(game);

  if (userJid && !game.participants.includes(userJid)) {
    game.participants.push(userJid);
    userModel.recordParticipation(userJid);
  }

  const userGuess = String(guess).trim().toUpperCase();
  const correct = game.word.toUpperCase();

  if (userGuess === correct) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 30);
    userModel.addWin(userJid);
    gameStatsModel.increment('wordScramble', 30);

    return {
      result: `🎉 *CORRECT* +30 points!\nThe word was *${game.word}*\n\n▸ Play again: !game scramble`,
      won: true,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  game.attempts++;

  if (game.attempts >= game.maxAttempts) {
    global.activeGames.delete(chatJid);
    return {
      result: `❌ *Game Over!*\nThe word was *${game.word}*\n\n▸ Play again: !game scramble`,
      won: false,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  let hint = `❌ *Wrong* Try again!\n`;

  if (game.attempts === 1) {
    hint += `First letter: "${game.word.charAt(0).toUpperCase()}"\n`;
  } else if (game.attempts === 2) {
    hint += `Last letter: "${game.word.charAt(game.word.length - 1).toUpperCase()}"\n`;
  }

  const remaining = game.maxAttempts - game.attempts;
  hint += `${remaining} attempt${remaining > 1 ? 's' : ''} left.`;

  return {
    result: hint,
    won: false,
    gameOver: false,
    mention: game.isGroup ? userJid : null
  };
}

function startRiddle(chatJid, bot, userJid) {
  if (!canStartGame(chatJid, 'riddle')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const now = Date.now();
  const riddles = load('riddles');
  const riddle = riddles[Math.floor(Math.random() * riddles.length)];

  global.activeGames.set(chatJid, {
    type: 'riddle',
    question: riddle.question,
    answer: riddle.answer,
    attempts: 0,
    maxAttempts: config.gameSettings.riddleMaxAttempts,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us'),
    participants: userJid ? [userJid] : []
  });

  if (userJid) userModel.recordParticipation(userJid);

  return `✧ *RIDDLE TIME*

${riddle.question}

▸ Reply with your answer!
▸ You have ${config.gameSettings.riddleMaxAttempts} attempts`;
}

function processRiddle(chatJid, userJid, guess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'riddle') return null;

  touchGame(game);

  if (userJid && !game.participants.includes(userJid)) {
    game.participants.push(userJid);
    userModel.recordParticipation(userJid);
  }

  const isCorrect = isSimilarAnswer(guess, game.answer);

  if (isCorrect) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 25);
    userModel.addWin(userJid);
    gameStatsModel.increment('riddle', 25);

    return {
      result: `🎉 *CORRECT* +25 points!\nThe answer is *${game.answer}*\n\n▸ Play again: !game riddle`,
      won: true,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  game.attempts++;

  if (game.attempts >= game.maxAttempts) {
    global.activeGames.delete(chatJid);
    return {
      result: `❌ *Game Over!*\nNo one got it. The answer was *${game.answer}*\n\n▸ Play again: !game riddle`,
      won: false,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  const remaining = game.maxAttempts - game.attempts;
  return {
    result: `❌ *Wrong* Try again!\n${remaining} attempt${remaining > 1 ? 's' : ''} left.`,
    won: false,
    gameOver: false,
    mention: game.isGroup ? userJid : null
  };
}

function startFlagQuiz(chatJid, bot, userJid) {
  if (!canStartGame(chatJid, 'flag')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const now = Date.now();
  const flags = load('country_flags');
  const flagData = flags[Math.floor(Math.random() * flags.length)];

  global.activeGames.set(chatJid, {
    type: 'flag',
    country: flagData.country,
    flag: flagData.flag,
    attempts: 0,
    maxAttempts: config.gameSettings.flagMaxAttempts,
    startTime: now,
    lastActivity: now,
    gameMessageId: null,
    lastMessageId: null,
    participants: userJid ? [userJid] : []
  });

  if (userJid) userModel.recordParticipation(userJid);

  return `✧ *FLAG QUIZ*
┌─⊶
│ Guess the country: ${flagData.flag}
│ You have ${config.gameSettings.flagMaxAttempts} attempts!
└─────────────⊶
▸ Reply with the country name!`;
}

function processFlagGuess(chatJid, userJid, guess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'flag') return null;

  touchGame(game);

  if (userJid && !game.participants.includes(userJid)) {
    game.participants.push(userJid);
    userModel.recordParticipation(userJid);
  }

  game.attempts++;

  const isCorrect = isSimilarAnswer(guess, game.country);

  if (isCorrect) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 30);
    userModel.addWin(userJid);
    gameStatsModel.increment('flag', 30);

    return {
      result: `✅ *CORRECT* +30 points\nThe country is *${game.country}* ${game.flag}\n\n▸ Play again: !game flag`,
      won: true,
      gameOver: true
    };
  }

  if (game.attempts >= game.maxAttempts) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 5);
    gameStatsModel.increment('flag', 5);

    return {
      result: `❌ Game Over +5 points!\nThe country was *${game.country}* ${game.flag}\n\n▸ Play again: !game flag`,
      won: false,
      gameOver: true
    };
  }

  const remaining = game.maxAttempts - game.attempts;
  let hint = `❌ Wrong! ${remaining} attempt${remaining > 1 ? 's' : ''} left.`;

  if (game.attempts === 1) {
    hint += `\nHint: Starts with "${game.country.charAt(0).toUpperCase()}"`;
  } else if (game.attempts === 2) {
    hint += `\nHint: ${game.country.length} letters`;
  }

  return { result: hint, won: false, gameOver: false };
}

function attachGameMessageId(chatJid, sentMsg) {
  if (!sentMsg || !sentMsg.key || !sentMsg.key.id) return;

  const game = global.activeGames.get(chatJid);
  if (!game) return;

  if (game.gameMessageId) return;

  game.gameMessageId = sentMsg.key.id;
  game.lastMessageId = sentMsg.key.id;
}

function updateLastMessageId(chatJid, sentMsg) {
  if (!sentMsg || !sentMsg.key || !sentMsg.key.id) return;
  const game = global.activeGames.get(chatJid);
  if (!game) return;
  game.lastMessageId = sentMsg.key.id;
  touchGame(game);
}

module.exports = {
  canStartGame,
  isSimilarAnswer,
  touchGame,
  gameLabel,
  startGuessNumber,
  processGuess,
  startTrivia,
  processTriviaAnswer,
  startWordScramble,
  processWordScramble,
  startRiddle,
  processRiddle,
  startFlagQuiz,
  processFlagGuess,
  attachGameMessageId,
  updateLastMessageId
};