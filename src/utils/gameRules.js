const { load } = require('./contentLoader');
const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const config = require('../config');

// All game rules and state transitions live here.
// Chat state is stored in global.activeGames (Map of chatJid → game object).

const STALE_MS = 20 * 1000;

function canStartGame(chatJid, gameType) {
  const activeGame = global.activeGames.get(chatJid);
  if (!activeGame) return true;

  const age = Date.now() - (activeGame.startTime || 0);
  if (age > STALE_MS) {
    global.activeGames.delete(chatJid);
    return true;
  }

  return false;
}

// Human-readable label for a game type, used in rejection messages.
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

function isSimilarAnswer(userAnswer, correctAnswer) {
  const normalize = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const user = normalize(userAnswer);
  const correct = normalize(correctAnswer);

  if (user === correct) return true;
  if (user.length >= 3 && user.includes(correct)) return true;
  if (correct.length >= 3 && correct.includes(user)) return true;

  const synonyms = {
    tv: ['television', 'tv', 'television set'],
    pc: ['computer', 'personal computer', 'pc'],
    phone: ['mobile', 'cellphone', 'telephone', 'smartphone'],
    bike: ['bicycle', 'motorcycle', 'motorbike'],
    car: ['automobile', 'vehicle', 'auto']
  };

  for (const values of Object.values(synonyms)) {
    if (values.includes(user) && values.includes(correct)) return true;
  }

  return false;
}

function startGuessNumber(chatJid, bot) {
  if (!canStartGame(chatJid, 'guess')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const number = Math.floor(Math.random() * 100) + 1;

  global.activeGames.set(chatJid, {
    type: 'guess',
    number,
    attempts: 0,
    maxAttempts: config.gameSettings.guessMaxAttempts,
    startTime: Date.now(),
    gameMessageId: null,
    lastMessageId: null
  });

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

function startTrivia(chatJid, bot) {
  if (!canStartGame(chatJid, 'trivia')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const questions = load('trivia');
  const question = questions[Math.floor(Math.random() * questions.length)];

  global.activeGames.set(chatJid, {
    type: 'trivia',
    question,
    startTime: Date.now(),
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us')
  });

  return `✧ *TRIVIA TIME*

${question.question}

${question.options.join('\n')}

▸ Reply with A, B, C, or D to answer!`;
}

function processTriviaAnswer(chatJid, userJid, answer) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'trivia') return null;

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

function startWordScramble(chatJid, bot) {
  if (!canStartGame(chatJid, 'wordScramble')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const words = load('word_scramble');
  const wordData = words[Math.floor(Math.random() * words.length)];

  global.activeGames.set(chatJid, {
    type: 'wordScramble',
    word: wordData.word,
    scrambled: wordData.scrambled,
    hint: wordData.hint,
    attempts: 0,
    maxAttempts: config.gameSettings.scrambleMaxAttempts,
    startTime: Date.now(),
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us')
  });

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

function startRiddle(chatJid, bot) {
  if (!canStartGame(chatJid, 'riddle')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const riddles = load('riddles');
  const riddle = riddles[Math.floor(Math.random() * riddles.length)];

  global.activeGames.set(chatJid, {
    type: 'riddle',
    question: riddle.question,
    answer: riddle.answer,
    attempts: 0,
    maxAttempts: config.gameSettings.riddleMaxAttempts,
    startTime: Date.now(),
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us')
  });

  return `✧ *RIDDLE TIME*

${riddle.question}

▸ Reply with your answer!
▸ You have ${config.gameSettings.riddleMaxAttempts} attempts`;
}

function processRiddle(chatJid, userJid, guess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'riddle') return null;

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

function startFlagQuiz(chatJid, bot) {
  if (!canStartGame(chatJid, 'flag')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const flags = load('country_flags');
  const flagData = flags[Math.floor(Math.random() * flags.length)];

  global.activeGames.set(chatJid, {
    type: 'flag',
    country: flagData.country,
    flag: flagData.flag,
    attempts: 0,
    maxAttempts: config.gameSettings.flagMaxAttempts,
    startTime: Date.now(),
    gameMessageId: null,
    lastMessageId: null
  });

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

function buildHangmanDisplay(game) {
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

function startHangman(chatJid, bot) {
  if (!canStartGame(chatJid, 'hangman')) {
    const active = global.activeGames.get(chatJid);
    return `❌ A ${gameLabel(active.type)} game is already active!`;
  }

  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const pool = load('hangman_words');
  const pick = pool[Math.floor(Math.random() * pool.length)];

  global.activeGames.set(chatJid, {
    type: 'hangman',
    word: pick.word.toUpperCase(),
    category: pick.category,
    guessedLetters: [],
    wrongLetters: [],
    maxWrong: config.gameSettings.hangmanMaxWrong,
    startTime: Date.now(),
    gameMessageId: null,
    lastMessageId: null,
    isGroup: chatJid.endsWith('@g.us')
  });

  const game = global.activeGames.get(chatJid);
  return `${buildHangmanDisplay(game)}

▸ Reply with a single letter to guess.`;
}

function processHangmanGuess(chatJid, userJid, rawGuess) {
  const game = global.activeGames.get(chatJid);
  if (!game || game.type !== 'hangman') return null;

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

  game.guessedLetters.push(letter);

  const isInWord = game.word.includes(letter);
  if (!isInWord) {
    game.wrongLetters.push(letter);
  }

  const won = game.word.split('').every((ch) => game.guessedLetters.includes(ch));

  if (won) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 50);
    userModel.addWin(userJid);
    gameStatsModel.increment('hangman', 50);

    return {
      result: `🎉 *SOLVED!* +50 points\nThe word was *${game.word}*\n\n▸ Play again: !hangman`,
      won: true,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  const lost = game.wrongLetters.length >= game.maxWrong;

  if (lost) {
    global.activeGames.delete(chatJid);
    userModel.addPoints(userJid, 5);
    gameStatsModel.increment('hangman', 5);

    return {
      result: `💀 *GAME OVER* +5 points\nThe word was *${game.word}*\n\n▸ Play again: !hangman`,
      won: false,
      gameOver: true,
      mention: game.isGroup ? userJid : null
    };
  }

  return {
    result: buildHangmanDisplay(game),
    won: false,
    gameOver: false,
    keepGame: true
  };
}

function playRockPaperScissors(userChoice, bot) {
  if (bot && bot.stats) bot.stats.gamesPlayed++;

  const choices = ['rock', 'paper', 'scissors'];
  const botChoice = choices[Math.floor(Math.random() * 3)];
  const user = String(userChoice).toLowerCase();

  if (!choices.includes(user)) {
    return {
      result: '❌ Invalid subcommand!\n*Usage:* rps [rock/paper/scissors]',
      won: false,
      gameOver: true
    };
  }

  let outcome = '';
  let won = false;

  if (user === botChoice) {
    outcome = "🤝 *It's a tie!*";
  } else if (
    (user === 'rock' && botChoice === 'scissors') ||
    (user === 'paper' && botChoice === 'rock') ||
    (user === 'scissors' && botChoice === 'paper')
  ) {
    outcome = '🎉 *You win*';
    won = true;
  } else {
    outcome = '❌ *You lose!*';
  }

  return {
    result: `✧ *ROCK PAPER SCISSORS*
┌─⊶
│ *You*: ${user}
│ *Bot*: ${botChoice}
└─────────────⊶
${outcome}`,
    won,
    gameOver: true
  };
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
}

module.exports = {
  canStartGame,
  isSimilarAnswer,
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
  startHangman,
  processHangmanGuess,
  playRockPaperScissors,
  attachGameMessageId,
  updateLastMessageId
};