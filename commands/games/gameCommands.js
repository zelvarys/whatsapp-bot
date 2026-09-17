const config = require('../../config');
const GameLogic = require('../../utils/gameLogic');
const DataManager = require('../../utils/dataManager');
const GameHelpers = require('./gameHelpers');
const TicManager = require('./ticManager');

class GameCommands {
  constructor(sock) {
    this.sock = sock;
    this.gameHelpers = new GameHelpers(sock);
    this.ticManager = new TicManager(sock);
  }
  
  async showGames(sender, msg) {
    const gamesList = `✧ *AVAILABLE GAMES*
╒═══════════════════╕

┌─⊶ *MAIN GAMES*
│• game guess
│• game trivia
│• game riddle
│• game flag
│• game scramble
└─────────────⊶

┌─⊶ *TIC TAC TOE*
│• ttt start @friend
│• ttt bot - versus AI
│• ttt end - End game
└─────────────⊶

┌─⊶ *OTHER GAMES*
│• rps [choice]
└─────────────⊶

╘═══════════════════╛`;
    
    await this.sock.sendMessage(sender, {
      text: gamesList
    }, { quoted: msg });
  }
  
  async startGame(sender, msg, args, bot) {
    if (args.length === 0) {
      await this.sock.sendMessage(sender, {
        text: `❌ Specify a game type!\n*Usage:* ${config.prefix}game trivia`
      }, { quoted: msg });
      return;
    }
    
    const gameType = args[0].toLowerCase();
    
    switch (gameType) {
      case 'guess':
        const guessGame = GameLogic.guessNumber(sender, bot);
        await this.sock.sendMessage(sender, {
          text: guessGame,
          context: { isGame: true }
        }, { quoted: msg });
        break;
        
      case 'trivia':
        const triviaGame = GameLogic.startTrivia(sender, bot);
        await this.sock.sendMessage(sender, {
          text: triviaGame,
          context: { isGame: true }
        }, { quoted: msg });
        break;
        
      case 'scramble':
        const scrambleGame = GameLogic.startWordScramble(sender, bot);
        await this.sock.sendMessage(sender, {
          text: scrambleGame,
          context: { isGame: true }
        }, { quoted: msg });
        break;
        
      case 'riddle':
        const riddleGame = GameLogic.startRiddle(sender, bot);
        await this.sock.sendMessage(sender, {
          text: riddleGame,
          context: { isGame: true }
        }, { quoted: msg });
        break;
        
      case 'flag':
        const flagGame = GameLogic.startFlagGame(sender, bot);
        await this.sock.sendMessage(sender, {
          text: flagGame,
          context: { isGame: true }
        }, { quoted: msg });
        break;
        
      default:
        await this.sock.sendMessage(sender, {
          text: `❌ Unknown game type!\n Use ${config.prefix}games to see available games`
        }, { quoted: msg });
    }
  }
  
  async guess(sender, userJid, msg, args) {
    const guessNum = args[0];
    if (!guessNum) {
      await this.sock.sendMessage(sender, {
        text: `❌ Provide a number!\nUsage: ${config.prefix}guess [number]`
      }, { quoted: msg });
      return;
    }
    
    const result = GameLogic.processGuess(sender, userJid, guessNum);
    if (result) {
      await this.sock.sendMessage(sender, {
        text: result.result
      }, { quoted: msg });
    }
  }
  
  async answer(sender, userJid, msg, args) {
    const answer = args[0];
    if (!answer) {
      await this.sock.sendMessage(sender, {
        text: `❌ Provide an answer!\n*Usage:* ${config.prefix}answer [A/B/C/D]`
      }, { quoted: msg });
      return;
    }
    
    const result = GameLogic.processTriviaAnswer(sender, userJid, answer);
    if (result) {
      await this.sock.sendMessage(sender, {
        text: result.result,
        mentions: result.mention ? [result.mention] : undefined
      }, { quoted: msg });
    }
  }
  
  async rps(sender, userJid, msg, args) {
    const choice = args[0];
    if (!choice) {
      await this.sock.sendMessage(sender, {
        text: `❌ Provide a choice!\n*Usage:* ${config.prefix}rps [rock/paper/scissors]`
      }, { quoted: msg });
      return;
    }
    
    const result = GameLogic.rockPaperScissors(choice, this.sock);
    
    if (result.won) {
      DataManager.addPoints(userJid, 15, 'rps');
      DataManager.addWin(userJid);
      result.result += ` +15 points!`;
    }
    
    await this.sock.sendMessage(sender, {
      text: result.result
    }, { quoted: msg });
  }
  
  async tictactoe(sender, userJid, msg, args) {
    if (args.length === 0) {
      await this.sock.sendMessage(sender, {
        text: `✧ *TIC TAC TOE*
┌─⊶
│• ttt start @friend
│• ttt bot - versus AI
│• ttt end - End game
└─────────────⊶`
      }, { quoted: msg });
      return;
    }
    
    const action = args[0].toLowerCase();
    
    switch (action) {
      case 'start':
        await this.ticManager.startGame(sender, userJid, msg, args);
        break;
        
      case 'bot':
        await this.ticManager.startBotGame(sender, userJid, msg);
        break;
        
      case 'end':
        await this.ticManager.endGame(sender, userJid, msg);
        break;
        
      default:
        await this.sock.sendMessage(sender, {
          text: '❌ Invalid action!\n*Use:* start, bot, or end'
        }, { quoted: msg });
    }
  }
  
  async makeMove(sender, userJid, msg, args) {
    await this.ticManager.makeMove(sender, userJid, msg, args);
  }
}

module.exports = GameCommands;