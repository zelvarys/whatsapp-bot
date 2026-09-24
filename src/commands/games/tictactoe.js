const config = require('../../config');
const engine = require('../../services/games/tictactoeEngine');

async function start(sock, msg, sender, userJid, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

  if (!mentioned || !mentioned.length) {
    return sock.sendMessage(sender, {
      text: '❌ Mention a friend to play with!\n*Usage:* !ttt start @mention'
    }, { quoted: msg });
  }

  const result = engine.startPvP(sender, userJid, mentioned[0]);
  if (result.error) {
    return sock.sendMessage(sender, { text: result.error }, { quoted: msg });
  }

  const sent = await sock.sendMessage(sender, {
    text: result.text,
    mentions: result.mentions
  }, { quoted: msg });

  const g = global.tictactoeGames.get(result.gameId);
  if (g && sent?.key?.id) {
    g.gameMessageId = sent.key.id;
    g.lastMessageId = sent.key.id;
  }
}

async function startBot(sock, msg, sender, userJid) {
  const result = engine.startVsBot(sender, userJid);

  const sent = await sock.sendMessage(sender, { text: result.text }, { quoted: msg });

  const g = global.tictactoeGames.get(result.gameId);
  if (g && sent?.key?.id) {
    g.gameMessageId = sent.key.id;
    g.lastMessageId = sent.key.id;
  }

  if (result.botGoesFirst) {
    setTimeout(() => runBotMove(sock, result.gameId, g, sender), 2000);
  }
}

async function runBotMove(sock, gameId, game, sender) {
  const result = engine.processBotMove(gameId, game);
  if (!result) return;

  const sent = await sock.sendMessage(sender, { text: result.text });
  if (sent?.key?.id && !result.gameOver) game.lastMessageId = sent.key.id;
}

async function end(sock, msg, sender, userJid) {
  const result = engine.end(sender, userJid);
  if (result.error) {
    return sock.sendMessage(sender, { text: result.error }, { quoted: msg });
  }
  await sock.sendMessage(sender, { text: result.text }, { quoted: msg });
}

async function makeMove(sock, sender, userJid, msg, args) {
  if (!engine.isValidMovePosition(args[0])) {
    return sock.sendMessage(sender, {
      text: '❌ Invalid move! Use numbers 1-9'
    }, { quoted: msg });
  }

  const found = engine.getGame(sender, userJid);
  if (!found) {
    return sock.sendMessage(sender, {
      text: '❌ No active game found!\nStart one with !ttt start @friend'
    }, { quoted: msg });
  }

  const { id, game } = found;
  const position = parseInt(args[0]);

  if (game.currentPlayer !== userJid) {
    return sock.sendMessage(sender, { text: '❌ Not your turn!' }, { quoted: msg });
  }

  if (game.board[position - 1] !== ' ') {
    return sock.sendMessage(sender, { text: '❌ Position already taken!' }, { quoted: msg });
  }

  const result = engine.processMove(sender, userJid, position, id, game);

  const sent = await sock.sendMessage(sender, {
    text: result.text,
    mentions: result.mentions
  }, { quoted: msg });

  if (sent?.key?.id) game.lastMessageId = sent.key.id;

  if (result.botTurn) {
    setTimeout(() => runBotMove(sock, id, game, sender), 2000);
  }
}

async function handleReply(sock, sender, userJid, msg, text) {
  await makeMove(sock, sender, userJid, msg, [text]);
}

function ownsReply(sender, userJid, repliedToMessageId) {
  return engine.ownsReply(sender, userJid, repliedToMessageId);
}

module.exports = {
  start,
  startBot,
  end,
  makeMove,
  handleReply,
  ownsReply
};