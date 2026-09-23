const config = require('../config');
const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');

// Manages the lifecycle of a lobby, from creation through game end.

const GAME_INFO = {
  bombshell: {
    name: 'BOMBSHELL',
    description: 'Turn-based word chain. Each turn you get a pair of letters and must reply with a valid English word that starts with the first and ends with the second. Miss the 20-second window or break the rule and you are out. Last one standing wins.'
  },
  hotseat: {
    name: 'HOT SEAT',
    description: 'One player at a time is put on the spot with a quick challenge. Answer correctly within 20 seconds to survive. Wrong or too slow and you are eliminated. Last one standing wins.'
  }
};

function createLobby(sender, gameType, host, gameModule) {
  const now = Date.now();

  return {
    chatJid: sender,
    gameType,
    host,
    players: [host],
    minPlayers: gameModule.minPlayers || config.lobbySettings.minPlayers,
    maxPlayers: gameModule.maxPlayers || config.lobbySettings.maxPlayers,
    state: 'waiting',
    deadline: now + config.lobbySettings.joinWindowMs,
    lobbyMessageId: null,
    startedAt: null,
    gameState: null,
    gameModule
  };
}

function buildLobbyText(lobby) {
  const info = GAME_INFO[lobby.gameType] || { name: lobby.gameType, description: '' };
  const secondsLeft = Math.max(0, Math.ceil((lobby.deadline - Date.now()) / 1000));

  const list = lobby.players.length === 0
    ? '  (no players yet)'
    : lobby.players.map((p, i) => `  ${i + 1}. @${p.split('@')[0]}`).join('\n');

  return `✧ *${info.name} — LOBBY OPEN*

▸ ${info.description}

*Players:* ${lobby.players.length}/${lobby.maxPlayers}
*Minimum to start:* ${lobby.minPlayers}
*Closes in:* ${secondsLeft}s

${list}

▸ Reply *join* to enter
▸ Reply *leave* to exit
▸ Host: reply *start* to begin early
▸ Host: reply *cancel* to abort`;
}

async function postLobby(sock, sender, lobby) {
  const text = buildLobbyText(lobby);
  const mentions = lobby.players.slice();

  const sent = await sock.sendMessage(sender, {
    text,
    mentions
  });

  if (sent && sent.key && sent.key.id) {
    lobby.lobbyMessageId = sent.key.id;
  }
}

async function startGame(sock, sender, lobby) {
  if (lobby.state !== 'waiting') return;

  lobby.state = 'running';
  lobby.startedAt = Date.now();

  const init = lobby.gameModule.startGame(lobby);

  const sent = await sock.sendMessage(sender, {
    text: init.text,
    mentions: init.mentions || lobby.players
  });

  if (sent && sent.key && sent.key.id) {
    lobby.gameState = init.state;
    lobby.gameState.gameMessageId = sent.key.id;
    lobby.gameState.lastMessageId = sent.key.id;
  }

  scheduleTurnTimeout(sock, sender, lobby);
}

async function handleGameTurn(sock, msg, sender, userJid, text, lobby) {
  const game = lobby.gameState;
  if (!game) return false;

  if (game.currentPlayer && game.currentPlayer !== userJid) {
    return true;
  }

  const result = lobby.gameModule.handleTurn(game, userJid, text);
  if (!result) return true;

  if (lobby.turnTimeout) {
    clearTimeout(lobby.turnTimeout);
    lobby.turnTimeout = null;
  }

  const sent = await sock.sendMessage(sender, {
    text: result.text,
    mentions: result.mentions || []
  }, { quoted: msg });

  if (sent && sent.key && sent.key.id) {
    game.lastMessageId = sent.key.id;
  }

  if (result.gameOver) {
    await endGame(sender, lobby, result.gameOver);
    return true;
  }

  scheduleTurnTimeout(sock, sender, lobby);
  return true;
}

function scheduleTurnTimeout(sock, sender, lobby) {
  if (lobby.turnTimeout) clearTimeout(lobby.turnTimeout);

  lobby.turnTimeout = setTimeout(async () => {
    if (lobby.state !== 'running') return;

    const result = lobby.gameModule.handleTimeout(lobby.gameState);
    if (!result) return;

    const sent = await sock.sendMessage(sender, {
      text: result.text,
      mentions: result.mentions || []
    });

    if (sent && sent.key && sent.key.id) {
      lobby.gameState.lastMessageId = sent.key.id;
    }

    if (result.gameOver) {
      await endGame(sender, lobby, result.gameOver);
      return;
    }

    scheduleTurnTimeout(sock, sender, lobby);
  }, config.lobbySettings.turnTimeoutMs);
}

async function endGame(sender, lobby, outcome) {
  const { winners, losers } = outcome;

  for (const winner of winners) {
    userModel.addPoints(winner, 60);
    userModel.addWin(winner);
  }

  for (const loser of losers) {
    userModel.addPoints(loser, 5);
  }

  gameStatsModel.increment(lobby.gameType, 60 * winners.length);

  if (lobby.turnTimeout) clearTimeout(lobby.turnTimeout);

  global.gameLobbies.delete(sender);
}

async function pruneLobbies(sock) {
  const now = Date.now();

  for (const [chatJid, lobby] of global.gameLobbies.entries()) {
    if (lobby.state !== 'waiting') continue;

    if (now >= lobby.deadline) {
      if (lobby.players.length < lobby.minPlayers) {
        await sock.sendMessage(chatJid, {
          text: `🛑 Lobby closed — not enough players (${lobby.players.length}/${lobby.minPlayers}).`
        });
        global.gameLobbies.delete(chatJid);
      } else {
        await startGame(sock, chatJid, lobby);
      }
    }
  }
}

module.exports = {
  createLobby,
  buildLobbyText,
  postLobby,
  startGame,
  handleGameTurn,
  endGame,
  pruneLobbies
};