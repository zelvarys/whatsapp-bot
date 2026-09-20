const config = require('../../config');
const userModel = require('../../models/userModel');
const gameStatsModel = require('../../models/gameStatsModel');
const jidHelpers = require('../../utils/jidHelpers');

// !ttt start @friend | bot | end
// Moves are made by replying to the current board message with 1-9.

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

async function start(sock, msg, sender, userJid, args) {
  if (args.length < 2) {
    return sock.sendMessage(sender, {
      text: '❌ Mention a friend to play with!\n*Usage:* !ttt start @mention'
    }, { quoted: msg });
  }

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (!mentioned || !mentioned.length) {
    return sock.sendMessage(sender, {
      text: '❌ Mention a friend to play with!'
    }, { quoted: msg });
  }

  const opponent = mentioned[0];
  if (opponent === userJid) {
    return sock.sendMessage(sender, {
      text: '❌ You cannot play against yourself!'
    }, { quoted: msg });
  }

  const gameId = `${sender}_${Date.now()}`;

  global.tictactoeGames.set(gameId, {
    player1: userJid,
    player2: opponent,
    board: Array(9).fill(' '),
    currentPlayer: userJid,
    chatJid: sender,
    started: Date.now(),
    lastActivity: Date.now(),
    isBotGame: false,
    gameMessageId: null,
    lastMessageId: null
  });

  const board = formatBoard(Array(9).fill(' '));

  const sent = await sock.sendMessage(sender, {
    text: `❌️⭕️ *TIC TAC TOE STARTED!*

Player X: @${userJid.split('@')[0]}
Player O: @${opponent.split('@')[0]}

${board}

▸ *Player X's turn!*
▸ Reply to this message with 1-9`,
    mentions: [userJid, opponent]
  }, { quoted: msg });

  const g = global.tictactoeGames.get(gameId);
  if (g && sent?.key?.id) {
    g.gameMessageId = sent.key.id;
    g.lastMessageId = sent.key.id;
  }
}

async function startBot(sock, msg, sender, userJid) {
  const gameId = `${sender}_${Date.now()}_bot`;

  global.tictactoeGames.set(gameId, {
    player1: userJid,
    player2: 'bot',
    board: Array(9).fill(' '),
    currentPlayer: userJid,
    chatJid: sender,
    started: Date.now(),
    lastActivity: Date.now(),
    isBotGame: true,
    gameMessageId: null,
    lastMessageId: null
  });

  const board = formatBoard(Array(9).fill(' '));

  const sent = await sock.sendMessage(sender, {
    text: `❌️⭕️ *TIC TAC TOE vs BOT!*

You are X, Bot is O

${board}

▸ *Your turn!*
▸ Reply to this message with 1-9`
  }, { quoted: msg });

  const g = global.tictactoeGames.get(gameId);
  if (g && sent?.key?.id) {
    g.gameMessageId = sent.key.id;
    g.lastMessageId = sent.key.id;
  }
}

async function end(sock, msg, sender, userJid) {
  const found = findGame(sender, userJid);

  if (!found) {
    return sock.sendMessage(sender, { text: '❌ No active game found!' }, { quoted: msg });
  }

  global.tictactoeGames.delete(found.id);
  await sock.sendMessage(sender, { text: '✅ Game ended!' }, { quoted: msg });
}

async function makeMove(sock, sender, userJid, msg, args) {
  const position = parseInt(args[0]);

  if (isNaN(position) || position < 1 || position > 9) {
    return sock.sendMessage(sender, { text: '❌ Invalid move! Use numbers 1-9' }, { quoted: msg });
  }

  const found = findGame(sender, userJid);
  if (!found) {
    return sock.sendMessage(sender, {
      text: '❌ No active game found!\nStart one with !ttt start @friend'
    }, { quoted: msg });
  }

  const { id, game } = found;

  if (game.currentPlayer !== userJid) {
    return sock.sendMessage(sender, { text: '❌ Not your turn!' }, { quoted: msg });
  }

  const index = position - 1;
  if (game.board[index] !== ' ') {
    return sock.sendMessage(sender, { text: '❌ Position already taken!' }, { quoted: msg });
  }

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

    await sock.sendMessage(sender, {
      text: `❌⭕ *GAME OVER!*\n\n${boardText}\n\n${winMessage}`
    });

    global.tictactoeGames.delete(id);
    return;
  }

  if (!game.board.includes(' ')) {
    await sock.sendMessage(sender, {
      text: `❌️⭕️ *GAME OVER!*\n\n${boardText}\n\n🤝 *It's a draw!*`
    });
    global.tictactoeGames.delete(id);
    return;
  }

  game.currentPlayer = game.currentPlayer === game.player1 ? game.player2 : game.player1;

  const nextName = game.currentPlayer === 'bot'
    ? 'Bot'
    : `@${game.currentPlayer.split('@')[0]}`;

  if (game.currentPlayer === 'bot') {
    const sent = await sock.sendMessage(sender, {
      text: `❌️⭕️ *YOUR MOVE*\n\n${boardText}\n\n▸ *Bot's turn...*`
    });

    if (sent?.key?.id) game.lastMessageId = sent.key.id;

    setTimeout(() => makeBotMove(sock, id, game, sender), 2000);
  } else {
    const sent = await sock.sendMessage(sender, {
      text: `❌️⭕️ *NEXT MOVE*\n\n${boardText}\n\n▸ *${nextName}'s turn!*\n▸ Reply with 1-9`,
      mentions: game.currentPlayer !== 'bot' ? [game.currentPlayer] : undefined
    });

    if (sent?.key?.id) game.lastMessageId = sent.key.id;
  }
}

async function makeBotMove(sock, gameId, game, sender) {
  const available = [];
  for (let i = 0; i < 9; i++) if (game.board[i] === ' ') available.push(i);
  if (!available.length) return;

  // 1. Try winning move
  let move = -1;
  for (const pos of available) {
    const test = [...game.board];
    test[pos] = 'O';
    if (checkWin(test) === 'O') { move = pos; break; }
  }

  // 2. Try blocking move
  if (move === -1) {
    for (const pos of available) {
      const test = [...game.board];
      test[pos] = 'X';
      if (checkWin(test) === 'X') { move = pos; break; }
    }
  }

  // 3. Random move
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

    await sock.sendMessage(sender, {
      text: `❌️⭕️ *GAME OVER!*\n\n${boardText}\n\n${msg}`
    });
    global.tictactoeGames.delete(gameId);
    return;
  }

  if (!game.board.includes(' ')) {
    await sock.sendMessage(sender, {
      text: `❌️⭕️ *GAME OVER!*\n\n${boardText}\n\n🤝 *It's a draw!*`
    });
    global.tictactoeGames.delete(gameId);
    return;
  }

  game.currentPlayer = game.player1;

  const sent = await sock.sendMessage(sender, {
    text: `❌️⭕️ *BOT MOVED*\n\n${boardText}\n\n▸ *Your turn!*\n▸ Reply with 1-9`
  });

  if (sent?.key?.id) game.lastMessageId = sent.key.id;
}

// Called by the router when a user replies to a tictactoe board message.
async function handleReply(sock, sender, userJid, msg, text) {
  await makeMove(sock, sender, userJid, msg, [text]);
}

// Called by the router when the game has an active match and returns
// whether the reply belongs to this game's message chain.
function ownsReply(sender, userJid, repliedToMessageId) {
  const found = findGame(sender, userJid);
  if (!found) return false;

  const { game } = found;
  return (
    repliedToMessageId &&
    (repliedToMessageId === game.gameMessageId || repliedToMessageId === game.lastMessageId)
  );
}

module.exports = {
  start,
  startBot,
  end,
  makeMove,
  handleReply,
  ownsReply
};