const lobbyState = require('../../utils/lobbyState');
const bombshellEngine = require('../../services/games/bombshellEngine');
const clusterEngine = require('../../services/games/clusterEngine');

// Lobbies and solo games are independent. A solo game running in the
// same chat does not block a lobby, and vice versa. This is intentional
// so a group can keep a chill trivia going while a lobby fills up.

async function bombshell(sock, msg, sender, userJid) {
  const existing = global.gameLobbies.get(sender);
  if (existing) {
    return sock.sendMessage(sender, {
      text: `❌ A ${existing.gameType} lobby is already open in this chat.`
    }, { quoted: msg });
  }

  const lobby = lobbyState.createLobby(sender, 'bombshell', userJid, bombshellEngine);
  global.gameLobbies.set(sender, lobby);

  await lobbyState.postLobby(sock, sender, lobby);
}

async function cluster(sock, msg, sender, userJid) {
  const existing = global.gameLobbies.get(sender);
  if (existing) {
    return sock.sendMessage(sender, {
      text: `❌ A ${existing.gameType} lobby is already open in this chat.`
    }, { quoted: msg });
  }

  const lobby = lobbyState.createLobby(sender, 'cluster', userJid, clusterEngine);
  global.gameLobbies.set(sender, lobby);

  await lobbyState.postLobby(sock, sender, lobby);
}

module.exports = {
  bombshell,
  cluster
};