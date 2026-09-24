const userModel = require('../../models/userModel');
const gameStatsModel = require('../../models/gameStatsModel');

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function formatBoard(board) {
  const display = board.map((cell, i) => (cell === ' ' ? String(i + 1) : `*${cell}*`));
  return ` ${display[0]} │ ${display[1]} │ ${display[2]}
──────
 ${display[3]} │ ${display[4]} │ ${display[5]}
──────
 ${display[6]} │ ${display[7]} │ ${display[8]}`;
}

function checkWin(board) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] !== ' ' && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function pickRandomStarter(player1, player2) {
  return Math.random() < 0.5 ? player1 : player2;
}

function findGame(chatJid, userJid) {
  if (!global.tictactoeGames || !global.tictactoeGames.size) return null;

  for (const [id, game] of global.tictactoeGames.entries()) {
    if (
      game.chatJid === chatJid &&
      (game.player1 === userJid || game.player2 === userJid)
    ) {
      return { id, game };
    }
  }

  return null;
}

function startPvP(chatJid, userJid, opponent) {
  if (opponent === userJid) {
    return { error: '❌ You cannot play against yourself!' };
  }

  const gameId = `${chatJid}_${Date.now()}`;
  const starter = pickRandomStarter(userJid, opponent);
  const starterSymbol = starter === userJid ? 'X' : 'O';

  global.tictactoeGames.set(gameId, {
    player1: userJid,
    player2: opponent,
    board: Array(9).fill(' '),
    currentPlayer: starter,
    chatJid,
    started: Date.now(),
    lastActivity: Date.now(),
    isBotGame: false,
    gameMessageId: null,
    lastMessageId: null
  });

  const board = formatBoard(Array(9).fill(' '));

  return {
    text: `❌️⭕️ *TIC TAC TOE STARTED!*

Player X: @${userJid.split('@')[0]}
Player O: @${opponent.split('@')[0]}

${board}

🎲 *@${starter.split('@')[0]} (${starterSymbol}) goes first!*
▸ Reply to this message with 1-9`,
    mentions: [userJid, opponent],
    gameId
  };
}

function startVsBot(chatJid, userJid) {
  const gameId = `${chatJid}_${Date.now()}_bot`;
  const starter = pickRandomStarter(userJid, 'bot');
  const starterSymbol = starter === userJid ? 'X' : 'O';

  global.tictactoeGames.set(gameId, {
    player1: userJid,
    player2: 'bot',
    board: Array(9).fill(' '),
    currentPlayer: starter,
    chatJid,
    started: Date.now(),
    lastActivity: Date.now(),
    isBotGame: true,
    gameMessageId: null,
    lastMessageId: null
  });

  const board = formatBoard(Array(9).fill(' '));
  const starterName = starter === 'bot' ? 'Bot' : `@${userJid.split('@')[0]}`;

  return {
    text: `❌️⭕️ *TIC TAC TOE vs BOT!*

You are X, Bot is O

${board}

🎲 *${starterName} (${starterSymbol}) goes first!*`,
    gameId,
    botGoesFirst: starter === 'bot'
  };
}

function processMove(chatJid, userJid, position, gameId, game) {
  const index = position - 1;

  const symbol = game.player1 === userJid ? 'X' : 'O';
  game.board[index] = symbol;
  game.lastActivity = Date.now();

  const winner = checkWin(game.board);
  const boardText = formatBoard(game.board);

  if (winner) {
    let winMessage = '';
    let winnerJid = null;

    if (winner === 'X') {
      winMessage = '🎉 *Player X wins!*';
      winnerJid = game.player1;
    } else if (winner === 'O') {
      winMessage = '🎉 *Player O wins!*';
      winnerJid = game.player2;
    }

    if (winnerJid && winnerJid !== 'bot') {
      userModel.addPoints(winnerJid, 50);
      userModel.addWin(winnerJid);
      gameStatsModel.increment('tictactoe', 50);
      winMessage += '\nWinner got 50 points!';
    }

    global.tictactoeGames.delete(gameId);

    return {
      text: `❌⭕ *GAME OVER!*\n\n${boardText}\n\n${winMessage}`,
      gameOver: true
    };
  }

  if (!game.board.includes(' ')) {
    global.tictactoeGames.delete(gameId);
    return {
      text: `❌️⭕️ *GAME OVER!*\n\n${boardText}\n\n🤝 *It's a draw!*`,
      gameOver: true
    };
  }

  game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;

  const nextName = game.currentPlayer === 'bot'
    ? 'Bot'
    : `@${game.currentPlayer.split('@')[0]}`;

  if (game.currentPlayer === 'bot') {
    return {
      text: `❌️⭕️ *YOUR MOVE*\n\n${boardText}\n\n▸ *Bot's turn...*`,
      botTurn: true,
      gameOver: false
    };
  }

  return {
    text: `❌️⭕️ *NEXT MOVE*\n\n${boardText}\n\n▸ *${nextName}'s turn!*\n▸ Reply with 1-9`,
    mentions: [game.currentPlayer],
    gameOver: false
  };
}

function processBotMove(gameId, game) {
  const available = [];
  for (let i = 0; i < 9; i++) if (game.board[i] === ' ') available.push(i);
  if (!available.length) return null;

  let move = -1;
  for (const pos of available) {
    const test = [...game.board];
    test[pos] = 'O';
    if (checkWin(test) === 'O') { move = pos; break; }
  }

  if (move === -1) {
    for (const pos of available) {
      const test = [...game.board];
      test[pos] = 'X';
      if (checkWin(test) === 'X') { move = pos; break; }
    }
  }

  if (move === -1) {
    move = available[Math.floor(Math.random() * available.length)];
  }

  game.board[move] = 'O';
  game.lastActivity = Date.now();

  const winner = checkWin(game.board);
  const boardText = formatBoard(game.board);

  if (winner) {
    let msg = '';
    if (winner === 'X') {
      msg = '🎉 *You win against the bot!*';
      userModel.addPoints(game.player1, 50);
      userModel.addWin(game.player1);
      gameStatsModel.increment('tictactoe', 50);
    } else if (winner === 'O') {
      msg = '*Bot wins!* Better luck next time!';
    }

    global.tictactoeGames.delete(gameId);

    return {
      text: `❌️⭕️ *GAME OVER!*\n\n${boardText}\n\n${msg}`,
      gameOver: true
    };
  }

  if (!game.board.includes(' ')) {
    global.tictactoeGames.delete(gameId);
    return {
      text: `❌️⭕️ *GAME OVER!*\n\n${boardText}\n\n🤝 *It's a draw!*`,
      gameOver: true
    };
  }

  game.currentPlayer = game.player1;
  return {
    text: `❌️⭕️ *BOT MOVED*\n\n${boardText}\n\n▸ *Your turn!*\n▸ Reply with 1-9`,
    gameOver: false
  };
}

function end(chatJid, userJid) {
  const found = findGame(chatJid, userJid);
  if (!found) return { error: '❌ No active game found!' };
  global.tictactoeGames.delete(found.id);
  return { text: '✅ Game ended!' };
}

function ownsReply(chatJid, userJid, repliedToMessageId) {
  const found = findGame(chatJid, userJid);
  if (!found) return false;
  const { game } = found;
  return (
    repliedToMessageId &&
    (repliedToMessageId === game.gameMessageId || repliedToMessageId === game.lastMessageId)
  );
}

function getGame(chatJid, userJid) {
  return findGame(chatJid, userJid);
}

function isValidMovePosition(text) {
  const position = parseInt(text);
  return !isNaN(position) && position >= 1 && position <= 9;
}

module.exports = {
  startPvP,
  startVsBot,
  processMove,
  processBotMove,
  end,
  ownsReply,
  getGame,
  isValidMovePosition,
  formatBoard,
  checkWin
};