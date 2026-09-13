const triviaQuestions = require('../database/trivia');
const scrambleWords = require('../database/wordScramble');
const riddles = require('../database/riddles');
const countryFlags = require('../database/countryFlags');
const DataManager = require('./dataManager');

class GameLogic {
  static canStartGame(chatJid, gameType) {
    const activeGame = global.activeGames.get(chatJid);
    if (!activeGame) return true;
    
    const now = Date.now();
    const gameAge = now - activeGame.startTime;
    
    if (gameAge > 20000) {
      return true;
    }
    
    if (activeGame.type === gameType) {
      return false;
    }
    
    const competitiveGames = ['trivia', 'riddle', 'flag', 'wordScramble'];
    if (competitiveGames.includes(gameType) && competitiveGames.includes(activeGame.type)) {
      return false;
    }
    
    return true;
  }
  
  static isSimilarAnswer(userAnswer, correctAnswer) {
    const normalize = (str) => {
      return str
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);
    
    if (normalizedUser === normalizedCorrect) {
      return true;
    }
    
    if (normalizedUser.includes(normalizedCorrect) && normalizedCorrect.length >= 3) {
      return true;
    }
    
    if (normalizedCorrect.includes(normalizedUser) && normalizedUser.length >= 3) {
      return true;
    }
    
    const synonyms = {
      'tv': ['television', 'tv', 'television set'],
      'pc': ['computer', 'personal computer', 'pc'],
      'phone': ['mobile', 'cellphone', 'telephone', 'smartphone'],
      'bike': ['bicycle', 'motorcycle', 'motorbike'],
      'car': ['automobile', 'vehicle', 'auto']
    };
    
    for (const [key, values] of Object.entries(synonyms)) {
      if (values.includes(normalizedUser) && values.includes(normalizedCorrect)) {
        return true;
      }
    }
    
    return false;
  }
  
  static guessNumber(chatJid, bot) {
    if (!this.canStartGame(chatJid, 'guess')) {
      const activeGame = global.activeGames.get(chatJid);
      const now = Date.now();
      const timeLeft = Math.ceil((20000 - (now - activeGame.startTime)) / 1000);
      return `❌ A ${activeGame.type} game is already active!`;
    }
    
    if (bot && bot.stats) {
      bot.stats.gamesPlayed++;
    }
    
    const number = Math.floor(Math.random() * 100) + 1;
    global.activeGames.set(chatJid, {
      type: 'guess',
      number: number,
      attempts: 0,
      maxAttempts: 7,
      startTime: Date.now(),
      gameMessageId: null,
      lastMessageId: null
    });
    
    return `✧ *NUMBER GUESSING*
┌─⊶
│ Guess a number between 1 and 100.
│ You have 7 attempts.
└─────────────⊶
▸ Reply with a number (1-100) to play!`;
  }

  static processGuess(chatJid, userJid, guess) {
    const game = global.activeGames.get(chatJid);
    if (!game || game.type !== 'guess') return null;
  
    const guessNum = parseInt(guess);
    if (isNaN(guessNum)) {
      return {
        result: "❌ Enter a valid number!",
        won: false,
        gameOver: false
      };
    }
  
    if (guessNum < 1 || guessNum > 100) {
      return {
        result: "❌ Guess a number between 1 and 100!",
        won: false,
        gameOver: false
      };
    }
  
    game.attempts++;
  
    if (guessNum === game.number) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 50, 'guess');
      DataManager.addWin(userJid);
    
      return {
        result: `🎉 *Correct* +50 points!\n▸ Play again: !game guess`,
        won: true,
        gameOver: true
      };
    }
  
    if (game.attempts >= game.maxAttempts) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 10, 'guess');
    
      return {
        result: `❌ *Game Over* +5 points!\nThe number was ${game.number}\n\n▸ Play again: !game guess`,
        won: false,
        gameOver: true
      };
    }
  
    const remaining = game.maxAttempts - game.attempts;
    const hint = guessNum > game.number ? "📉 Too high!" : "📈 Too low!";
  
    return {
      result: `${hint}\nAttempts: ${game.attempts}/${game.maxAttempts}`,
      won: false,
      gameOver: false
    };
  }
  
  static startTrivia(chatJid, bot) {
    if (!this.canStartGame(chatJid, 'trivia')) {
      const activeGame = global.activeGames.get(chatJid);
      const now = Date.now();
      const timeLeft = Math.ceil((20000 - (now - activeGame.startTime)) / 1000);
      return `❌ A ${activeGame.type} game is already active!`;
    }
    
    if (bot && bot.stats) {
      bot.stats.gamesPlayed++;
    }
    
    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    global.activeGames.set(chatJid, {
      type: 'trivia',
      question: question,
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
  
  static processTriviaAnswer(chatJid, userJid, answer) {
    const game = global.activeGames.get(chatJid);
    if (!game || game.type !== 'trivia') return null;
    
    const userAnswer = answer.trim().toUpperCase();
    const correctAnswer = game.question.answer;
    
    if (userAnswer === correctAnswer) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 20, 'trivia');
      DataManager.addWin(userJid);
      return { 
        result: `🎉 *Correct* +20 points!\nPlay again: !game trivia`, 
        won: true,
        gameOver: true,
        mention: game.isGroup ? userJid : null
      };
    } else {
      let feedback = "❌ *Wrong answer* Try again!\n\n";
      
      if (game.hintGiven !== userJid) {
        game.hintGiven = userJid;
        const options = ['A', 'B', 'C', 'D'];
      }
      
      return {
        result: feedback,
        won: false,
        gameOver: false,
        mention: game.isGroup ? userJid : null
      };
    }
  }
  
  static rockPaperScissors(userChoice, bot) {
    if (bot && bot.stats) {
      bot.stats.gamesPlayed++;
    }
    
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    userChoice = userChoice.toLowerCase();
    
    if (!choices.includes(userChoice)) {
      return {
        result: "❌ Invalid subcommand!\n*Usage:* rps[rock/paper/scissors]", 
        won: false,
        gameOver: true
      };
    }
    
    let result = "";
    let won = false;
    
    if (userChoice === botChoice) {
      result = "🤝 *It's a tie!*";
    } else if (
      (userChoice === 'rock' && botChoice === 'scissors') ||
      (userChoice === 'paper' && botChoice === 'rock') ||
      (userChoice === 'scissors' && botChoice === 'paper')
    ) {
      result = "🎉 *You win* ";
      won = true;
    } else {
      result = "❌ *You lose!*";
    }
    
    return {
      result: `✧ *ROCK PAPER SCISSORS*
┌─⊶
│ *You*: ${userChoice}
│ *Bot*: ${botChoice}
└─────────────⊶
${result}`,
      won: won,
      gameOver: true
    };
  }
  
  static startWordScramble(chatJid, bot) {
    if (!this.canStartGame(chatJid, 'wordScramble')) {
      const activeGame = global.activeGames.get(chatJid);
      const now = Date.now();
      const timeLeft = Math.ceil((20000 - (now - activeGame.startTime)) / 1000);
      return `❌ A ${activeGame.type} game is already active!`;
    }
    
    if (bot && bot.stats) {
      bot.stats.gamesPlayed++;
    }
    
    const wordData = scrambleWords[Math.floor(Math.random() * scrambleWords.length)];
    global.activeGames.set(chatJid, {
      type: 'wordScramble',
      word: wordData.word,
      scrambled: wordData.scrambled,
      hint: wordData.hint,
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
  
  static processWordScramble(chatJid, userJid, guess) {
    const game = global.activeGames.get(chatJid);
    if (!game || game.type !== 'wordScramble') return null;
    
    const userGuess = guess.trim().toUpperCase();
    const correctWord = game.word.toUpperCase();
    
    if (userGuess === correctWord) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 30, 'wordScramble');
      DataManager.addWin(userJid);
      return {
        result: `🎉 *CORRECT* +30 points!\nThe word was *${game.word}*\n\n▸ Play again: !game scramble`, 
        won: true,
        gameOver: true,
        mention: game.isGroup ? userJid : null
      };
    } else {
      let hint = "❌ *Wrong* Try again!\n\n";
      
      if (game.attempts === undefined) game.attempts = 0;
      game.attempts++;
      
      if (game.attempts === 1) {
        hint += `First letter: "${game.word.charAt(0).toUpperCase()}"\n`;
      } else if (game.attempts === 2) {
        hint += `Last letter: "${game.word.charAt(game.word.length - 1).toUpperCase()}"\n`;
      }
      
      hint += "▸ Reply with the unscrambled word to try again!";
      
      return {
        result: hint,
        won: false,
        gameOver: false,
        mention: game.isGroup ? userJid : null
      };
    }
  }
  
  static startRiddle(chatJid, bot) {
    if (!this.canStartGame(chatJid, 'riddle')) {
      const activeGame = global.activeGames.get(chatJid);
      const now = Date.now();
      const timeLeft = Math.ceil((20000 - (now - activeGame.startTime)) / 1000);
      return `❌ A ${activeGame.type} game is already active!`;
    }
    
    if (bot && bot.stats) {
      bot.stats.gamesPlayed++;
    }
    
    const riddle = riddles[Math.floor(Math.random() * riddles.length)];
    global.activeGames.set(chatJid, {
      type: 'riddle',
      question: riddle.question,
      answer: riddle.answer,
      gameMessageId: null,
      lastMessageId: null,
      isGroup: chatJid.endsWith('@g.us')
    });
    
    return `✧ *RIDDLE TIME*

${riddle.question}

▸ Reply with your answer!`;
  }
  
  static processRiddle(chatJid, userJid, guess) {
    const game = global.activeGames.get(chatJid);
    if (!game || game.type !== 'riddle') return null;
    
    const userGuess = guess.trim();
    const correctAnswer = game.answer;
    
    const isCorrect = this.isSimilarAnswer(userGuess, correctAnswer);
    
    if (isCorrect) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 25, 'riddle');
      DataManager.addWin(userJid);
      return {
        result: `🎉 *CORRECT* +25 points!\nThe answer is *${game.answer}*\n\n▸ Play again: !game riddle`, 
        won: true,
        gameOver: true,
        mention: game.isGroup ? userJid : null
      };
    } else {
      let hint = "❌ *Wrong* Try again!";
      
      return {
        result: hint,
        won: false,
        gameOver: false,
        mention: game.isGroup ? userJid : null
      };
    }
  }
  
  static startFlagGame(chatJid, bot) {
    if (!this.canStartGame(chatJid, 'flag')) {
      const activeGame = global.activeGames.get(chatJid);
      const now = Date.now();
      const timeLeft = Math.ceil((20000 - (now - activeGame.startTime)) / 1000);
      return `❌ A ${activeGame.type} game is already active!`;
    }
    
    if (bot && bot.stats) {
      bot.stats.gamesPlayed++;
    }
    
    const flagData = countryFlags[Math.floor(Math.random() * countryFlags.length)];
    global.activeGames.set(chatJid, {
      type: 'flag',
      country: flagData.country,
      flag: flagData.flag,
      attempts: 0,
      maxAttempts: 3,
      gameMessageId: null,
      lastMessageId: null
    });
    
    return `✧ *FLAG QUIZ*
┌─⊶
│ Guess the country: ${flagData.flag}
│ You have 3 attempts!
└─────────────⊶
▸ Reply with the country name!`;
  }
  
  static processFlagGuess(chatJid, userJid, guess) {
    const game = global.activeGames.get(chatJid);
    if (!game || game.type !== 'flag') return null;
    
    game.attempts++;
    
    const userGuess = guess.trim().toLowerCase();
    const correctCountry = game.country.toLowerCase();
    
    const isCorrect = this.isSimilarAnswer(userGuess, game.country);
    
    if (isCorrect) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 30, 'flag');
      DataManager.addWin(userJid);
      return {
        result: `✅ *CORRECT* +30 points\nThe country is *${game.country}* ${game.flag}\n\n▸ Play again: !game flag`, 
        won: true,
        gameOver: true
      };
    }
    
    if (game.attempts >= game.maxAttempts) {
      global.activeGames.delete(chatJid);
      DataManager.addPoints(userJid, 5, 'flag');
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
    
    return {
      result: hint,
      won: false,
      gameOver: false
    };
  }
}

module.exports = GameLogic;