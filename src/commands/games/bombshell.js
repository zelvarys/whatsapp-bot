const lobbyState = require('../../utils/lobbyState');
const engine = require('../../services/games/bombshellEngine');

async function handle(sock, msg, sender, userJid) {
  const existing = global.gameLobbies.get(sender);
  if (existing) {
    return sock.sendMessage(sender, {
      text: `❌ A ${existing.gameType} lobby is already open in this chat.`
    }, { quoted: msg });
  }

  const lobby = lobbyState.createLobby(sender, 'bombshell', userJid, engine);
  global.gameLobbies.set(sender, lobby);

  await lobbyState.postLobby(sock, sender, lobby);
}

module.exports = { handle };