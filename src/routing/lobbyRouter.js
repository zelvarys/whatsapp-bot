const lobbyState = require('../utils/lobbyState');
const jid = require('../utils/jidHelpers');

async function routeLobby(sock, msg, text, sender, userJid) {
  const lobby = global.gameLobbies.get(sender);
  if (!lobby) return false;

  const trimmed = text.trim().toLowerCase();

  // Keywords that only apply while the lobby is still open.
  if (lobby.state === 'waiting') {
    if (trimmed === 'join') {
      await handleJoin(sock, msg, sender, userJid, lobby);
      return true;
    }

    if (trimmed === 'leave') {
      await handleLeave(sock, msg, sender, userJid, lobby);
      return true;
    }

    if (trimmed === 'start') {
      await handleStart(sock, msg, sender, userJid, lobby);
      return true;
    }

    if (trimmed === 'cancel') {
      await handleCancel(sock, msg, sender, userJid, lobby);
      return true;
    }
  }

  // In-game: any reply to the game's message chain.
  if (lobby.state === 'running') {
    const game = lobby.gameState;
    if (!game) return false;

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const repliedToId = ctx?.stanzaId;

    const isReplyToGame = repliedToId &&
      (repliedToId === game.gameMessageId || repliedToId === game.lastMessageId);

    // Accept direct replies to the current turn message. Ignore other messages.
    if (!isReplyToGame) return false;

    return await lobbyState.handleGameTurn(sock, msg, sender, userJid, text.trim(), lobby);
  }

  return false;
}

async function handleJoin(sock, msg, sender, userJid, lobby) {
  if (lobby.players.includes(userJid)) {
    await sock.sendMessage(sender, {
      text: '❌ You are already in the lobby.'
    }, { quoted: msg });
    return;
  }

  if (lobby.players.length >= lobby.maxPlayers) {
    await sock.sendMessage(sender, {
      text: `❌ Lobby is full (${lobby.maxPlayers}/${lobby.maxPlayers}).`
    }, { quoted: msg });
    return;
  }

  lobby.players.push(userJid);

  await lobbyState.postJoinUpdate(sock, sender, lobby);

  // Auto-start if the lobby is now full.
  if (lobby.players.length >= lobby.maxPlayers) {
    await lobbyState.startGame(sock, sender, lobby);
  }
}

async function handleLeave(sock, msg, sender, userJid, lobby) {
  const index = lobby.players.indexOf(userJid);
  if (index === -1) {
    await sock.sendMessage(sender, {
      text: '❌ You are not in the lobby.'
    }, { quoted: msg });
    return;
  }

  lobby.players.splice(index, 1);

  if (lobby.players.length === 0) {
    global.gameLobbies.delete(sender);
    await sock.sendMessage(sender, {
      text: '🚪 Lobby closed — everyone left.'
    }, { quoted: msg });
    return;
  }

  await lobbyState.postLeaveUpdate(sock, sender, lobby, userJid);
}

async function handleStart(sock, msg, sender, userJid, lobby) {
  if (userJid !== lobby.host) {
    await sock.sendMessage(sender, {
      text: '❌ Only the host can start the game.'
    }, { quoted: msg });
    return;
  }

  if (lobby.players.length < lobby.minPlayers) {
    await sock.sendMessage(sender, {
      text: `❌ Need at least ${lobby.minPlayers} players. Currently: ${lobby.players.length}.`
    }, { quoted: msg });
    return;
  }

  await lobbyState.startGame(sock, sender, lobby);
}

async function handleCancel(sock, msg, sender, userJid, lobby) {
  if (userJid !== lobby.host) {
    await sock.sendMessage(sender, {
      text: '❌ Only the host can cancel.'
    }, { quoted: msg });
    return;
  }

  if (lobby.turnTimeout) clearTimeout(lobby.turnTimeout);
  global.gameLobbies.delete(sender);

  await sock.sendMessage(sender, {
    text: '🛑 Lobby cancelled by host.'
  }, { quoted: msg });
}

module.exports = { routeLobby };