const config = require('../config');
const lobbyState = require('../utils/lobbyState');

// Handles all messages relevant to an active lobby in a chat.

async function routeLobby(sock, msg, text, sender, userJid, repliedToMessageId) {
  const lobby = global.gameLobbies.get(sender);
  if (!lobby) return false;

  const trimmed = text.trim().toLowerCase();
  const isReplyToLobby = repliedToMessageId && repliedToMessageId === lobby.lobbyMessageId;

  // Cancellation and leave/join only valid before the game starts.
  if (lobby.state === 'waiting') {
    if (isReplyToLobby && trimmed === 'join') {
      await handleJoin(sock, msg, sender, userJid, lobby);
      return true;
    }

    if (isReplyToLobby && trimmed === 'leave') {
      await handleLeave(sock, msg, sender, userJid, lobby);
      return true;
    }

    if (isReplyToLobby && trimmed === 'start') {
      await handleStart(sock, msg, sender, userJid, lobby);
      return true;
    }

    if (isReplyToLobby && trimmed === 'cancel') {
      await handleCancel(sock, msg, sender, userJid, lobby);
      return true;
    }
  }

  // In-game messages: any reply to the game's own message chain.
  if (lobby.state === 'running') {
    const game = lobby.gameState;
    if (!game) return false;

    const isReplyToGame = repliedToMessageId &&
      (repliedToMessageId === game.gameMessageId || repliedToMessageId === game.lastMessageId);

    if (!isReplyToGame) return false;

    return await lobbyState.handleGameTurn(sock, msg, sender, userJid, text.trim(), lobby);
  }

  return false;
}

async function handleJoin(sock, msg, sender, userJid, lobby) {
  if (lobby.players.includes(userJid)) {
    await sock.sendMessage(sender, {
      text: `❌ You're already in the lobby.`
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

  await sock.sendMessage(sender, {
    text: `✅ Joined! (${lobby.players.length}/${lobby.maxPlayers})\nMinimum to start: ${lobby.minPlayers}`
  }, { quoted: msg });

  // Auto-start when reaching min AND everyone in the lobby has joined
  if (lobby.players.length >= lobby.maxPlayers) {
    await lobbyState.startGame(sock, sender, lobby);
  }
}

async function handleLeave(sock, msg, sender, userJid, lobby) {
  const index = lobby.players.indexOf(userJid);
  if (index === -1) {
    await sock.sendMessage(sender, {
      text: `❌ You're not in the lobby.`
    }, { quoted: msg });
    return;
  }

  lobby.players.splice(index, 1);

  if (lobby.players.length === 0) {
    global.gameLobbies.delete(sender);
    await sock.sendMessage(sender, {
      text: `🚪 Lobby closed — everyone left.`
    }, { quoted: msg });
    return;
  }

  await sock.sendMessage(sender, {
    text: `👋 Left. (${lobby.players.length}/${lobby.maxPlayers})`
  }, { quoted: msg });
}

async function handleStart(sock, msg, sender, userJid, lobby) {
  if (userJid !== lobby.host) {
    await sock.sendMessage(sender, {
      text: `❌ Only the host can force-start.`
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
      text: `❌ Only the host can cancel.`
    }, { quoted: msg });
    return;
  }

  global.gameLobbies.delete(sender);

  await sock.sendMessage(sender, {
    text: `🛑 Lobby cancelled by host.`
  }, { quoted: msg });
}

module.exports = { routeLobby };