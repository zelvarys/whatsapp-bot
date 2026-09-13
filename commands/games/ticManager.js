const DataManager = require('../../utils/dataManager');

class TicManager {
  constructor(sock) {
    this.sock = sock;
  }
  
  async startGame(sender, userJid, msg, args) {
    if (args.length < 2) {
      await this.sock.sendMessage(sender, {
        text: '❌ Mention a friend to play with!\n*Usage:* !ttt start @mention'
      }, { quoted: msg });
      return;
    }
    
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJids = contextInfo?.mentionedJid;
    
    if (!mentionedJids || mentionedJids.length === 0) {
      await this.sock.sendMessage(sender, {
        text: '❌ Mention a friend to play with!'
      }, { quoted: msg });
      return;
    }
    
    const opponentJid = mentionedJids[0];
    
    if (opponentJid === userJid) {
      await this.sock.sendMessage(sender, {
        text: '❌ You cannot play against yourself!'
      }, { quoted: msg });
      return;
    }
    
    const gameId = `${sender}_${Date.now()}`;
    
    if (!global.tictactoeGames) global.tictactoeGames = new Map();
    
    global.tictactoeGames.set(gameId, {
      player1: userJid,
      player2: opponentJid,
      board: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      currentPlayer: userJid,
      chatJid: sender,
      started: Date.now(),
      lastActivity: Date.now(),
      isBotGame: false
    });
    
    const board = this.formatTicTacToeBoard([' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']);
    
    await this.sock.sendMessage(sender, {
      text: `❌️⭕️ *TIC TAC TOE STARTED!*

Player X: @${userJid.split('@')[0]}
Player O: @${opponentJid.split('@')[0]}

${board}

▸ *Player X's turn!*
▸ Use numbers 1-9 to make your move`,
      mentions: [userJid, opponentJid]
    });
  }
  
  async startBotGame(sender, userJid, msg) {
    const botGameId = `${sender}_${Date.now()}_bot`;
    
    if (!global.tictactoeGames) global.tictactoeGames = new Map();
    
    global.tictactoeGames.set(botGameId, {
      player1: userJid,
      player2: 'bot',
      board: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
      currentPlayer: userJid,
      chatJid: sender,
      started: Date.now(),
      lastActivity: Date.now(),
      isBotGame: true
    });
    
    const botBoard = this.formatTicTacToeBoard([' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']);
    
    await this.sock.sendMessage(sender, {
      text: `❌️⭕️ *TIC TAC TOE vs BOT!*

You are X, Bot is O

${botBoard}

▸ *Your turn!*
▸ Use numbers 1-9 to make your move`
    });
  }
  
  async endGame(sender, userJid, msg) {
    let ended = false;
    try {
      for (const [gameId, game] of global.tictactoeGames.entries()) {
        if ((game.player1 === userJid || game.player2 === userJid) && game.chatJid === sender) {
          global.tictactoeGames.delete(gameId);
          ended = true;
          break;
        }
      }
    } catch {
      await this.sock.sendMessage(sender, {
        text: '❌ No active game found!'
      }, { quoted: msg });
      return
    }
    
    if (ended) {
      await this.sock.sendMessage(sender, {
        text: '✅ Game ended!'
      }, { quoted: msg });
    } else {
      await this.sock.sendMessage(sender, {
        text: '❌ No active game found!'
      }, { quoted: msg });
    }
  }
  
  async showBoard(sender, userJid, msg) {
    let currentGame = null;
    try {
      for (const [gameId, game] of global.tictactoeGames.entries()) {
        if ((game.player1 === userJid || game.player2 === userJid) && game.chatJid === sender) {
          currentGame = game;
          break;
        }
      }
    } catch {
      await this.sock.sendMessage(sender, {
        text: '❌ No active game found!'
      }, { quoted: msg });
      return
    }
    
    if (currentGame) {
      const boardDisplay = this.formatTicTacToeBoard(currentGame.board);
      const currentPlayerName = currentGame.currentPlayer === 'bot' ? 'Bot' : `@${currentGame.currentPlayer.split('@')[0]}`;
      
      await this.sock.sendMessage(sender, {
        text: `❌️⭕️ *CURRENT GAME*\n\n${boardDisplay}\n\n▸ *${currentPlayerName}'s turn*`,
        mentions: currentGame.currentPlayer !== 'bot' ? [currentGame.currentPlayer] : undefined
      });
    } else {
      await this.sock.sendMessage(sender, {
        text: '❌ No active game found!'
      }, { quoted: msg });
    }
  }
  
  async makeMove(sender, userJid, msg, args) {
    const position = parseInt(args[0]);
    
    if (isNaN(position) || position < 1 || position > 9) {
      await this.sock.sendMessage(sender, {
        text: '❌ Invalid move! Use numbers 1-9'
      }, { quoted: msg });
      return;
    }
    
    let gameId = null;
    let game = null;
    
    for (const [id, g] of global.tictactoeGames.entries()) {
      if ((g.player1 === userJid || g.player2 === userJid) && g.chatJid === sender) {
        gameId = id;
        game = g;
        break;
      }
    }
    
    if (!game) {
      await this.sock.sendMessage(sender, {
        text: '❌ No active game found!\nStart one with !ttt start @friend'
      }, { quoted: msg });
      return;
    }
    
    if (game.currentPlayer !== userJid) {
      await this.sock.sendMessage(sender, {
        text: '❌ Not your turn!'
      }, { quoted: msg });
      return;
    }
    
    const index = position - 1;
    
    if (game.board[index] !== ' ') {
      await this.sock.sendMessage(sender, {
        text: '❌ Position already taken!'
      }, { quoted: msg });
      return;
    }
    
    const symbol = game.player1 === userJid ? 'X' : 'O';
    game.board[index] = symbol;
    game.lastActivity = Date.now();
    
    const winner = this.checkTicTacToeWin(game.board);
    
    if (winner) {
      const boardDisplay = this.formatTicTacToeBoard(game.board);
      
      let winMessage = '';
      let winnerJid = null;
      
      if (winner === 'X') {
        winMessage = `🎉 *Player X wins!*`;
        winnerJid = game.player1;
      } else if (winner === 'O') {
        winMessage = `🎉 *Player O wins!*`;
        winnerJid = game.player2;
      }
      
      if (winnerJid && winnerJid !== 'bot') {
        DataManager.addPoints(winnerJid, 50, 'tictactoe');
        DataManager.addWin(winnerJid);
        winMessage += `\nWinner got 50 points!`;
      }
      
      await this.sock.sendMessage(sender, {
        text: `❌⭕ *GAME OVER!*\n\n${boardDisplay}\n\n${winMessage}`
      });
      
      global.tictactoeGames.delete(gameId);
      return;
    }
    
    if (!game.board.includes(' ')) {
      const boardDisplay = this.formatTicTacToeBoard(game.board);
      
      await this.sock.sendMessage(sender, {
        text: `❌️⭕️ *GAME OVER!*\n\n${boardDisplay}\n\n🤝 *It\'s a draw!*`
      });
      
      global.tictactoeGames.delete(gameId);
      return;
    }
    
    game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;
    
    const boardDisplay = this.formatTicTacToeBoard(game.board);
    const currentPlayerName = game.currentPlayer === 'bot' ? 'Bot' : `@${game.currentPlayer.split('@')[0]}`;
    
    let nextTurnMessage = `▸ *${currentPlayerName}'s turn!*\n▸ Use numbers 1-9 to make your move`;
    
    if (game.currentPlayer === 'bot') {
      await this.sock.sendMessage(sender, {
        text: `❌️⭕️ *YOUR MOVE*\n\n${boardDisplay}\n\n${nextTurnMessage}`,
        mentions: game.currentPlayer !== 'bot' ? [game.currentPlayer] : undefined
      });
      
      setTimeout(async () => {
        await this.makeBotMove(gameId, game, sender);
      }, 2000);
    } else {
      await this.sock.sendMessage(sender, {
        text: `❌️⭕️ *NEXT MOVE*\n\n${boardDisplay}\n\n${nextTurnMessage}`,
        mentions: game.currentPlayer !== 'bot' ? [game.currentPlayer] : undefined
      });
    }
  }
  
  async makeBotMove(gameId, game, sender) {
    const availablePositions = [];
    for (let i = 0; i < 9; i++) {
      if (game.board[i] === ' ') {
        availablePositions.push(i);
      }
    }
    
    if (availablePositions.length === 0) return;
    
    let moveIndex = -1;
    for (const pos of availablePositions) {
      const testBoard = [...game.board];
      testBoard[pos] = 'O';
      if (this.checkTicTacToeWin(testBoard) === 'O') {
        moveIndex = pos;
        break;
      }
    }
    
    if (moveIndex === -1) {
      for (const pos of availablePositions) {
        const testBoard = [...game.board];
        testBoard[pos] = 'X';
        if (this.checkTicTacToeWin(testBoard) === 'X') {
          moveIndex = pos;
          break;
        }
      }
    }
    
    if (moveIndex === -1) {
      moveIndex = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    }
    
    game.board[moveIndex] = 'O';
    game.lastActivity = Date.now();
    
    const winner = this.checkTicTacToeWin(game.board);
    
    if (winner) {
      const boardDisplay = this.formatTicTacToeBoard(game.board);
      
      let winMessage = '';
      if (winner === 'X') {
        winMessage = `🎉 *You win against the bot!*`;
        DataManager.addPoints(game.player1, 50, 'tictactoe');
        DataManager.addWin(game.player1);
      } else if (winner === 'O') {
        winMessage = `*Bot wins!* Better luck next time!`;
      }
      
      await this.sock.sendMessage(sender, {
        text: `❌️⭕️ *GAME OVER!*\n\n${boardDisplay}\n\n${winMessage}`
      });
      
      global.tictactoeGames.delete(gameId);
      return;
    }
    
    if (!game.board.includes(' ')) {
      const boardDisplay = this.formatTicTacToeBoard(game.board);
      
      await this.sock.sendMessage(sender, {
        text: `❌️⭕️ *GAME OVER!*\n\n${boardDisplay}\n\n🤝 *It\'s a draw!*`
      });
      
      global.tictactoeGames.delete(gameId);
      return;
    }
    
    game.currentPlayer = game.player1;
    const boardDisplay = this.formatTicTacToeBoard(game.board);
    
    await this.sock.sendMessage(sender, {
      text: `❌️⭕️ *BOT MOVED*\n\n${boardDisplay}\n\n▸ *Your turn!*\n▸ Use numbers 1-9 to make your move`
    });
  }
  
  checkTicTacToeWin(board) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] !== ' ' && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    
    return null;
  }
  
  formatTicTacToeBoard(board) {
    const displayBoard = board.map((cell, index) => {
      if (cell === ' ') {
        return (index + 1).toString();
      } else {
        return `*${cell}*`;
      }
    });
    
    return ` ${displayBoard[0]} │ ${displayBoard[1]} │ ${displayBoard[2]}
──────
 ${displayBoard[3]} │ ${displayBoard[4]} │ ${displayBoard[5]}
──────
 ${displayBoard[6]} │ ${displayBoard[7]} │ ${displayBoard[8]}`;
  }
}

module.exports = TicManager;