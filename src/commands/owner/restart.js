const userModel = require('../../models/userModel');
const gameStatsModel = require('../../models/gameStatsModel');
const botState = require('../../models/botStateModel');
const cacheModel = require('../../models/commandCacheModel');
const afkTracker = require('../../utils/afkTracker');

// !restart — soft restart. Saves state and exits.
// Assumes the process is supervised (PM2, systemd, etc.) so it comes back up.
async function handle(sock, msg, sender) {
  await sock.sendMessage(sender, {
    text: '🔄 Saving data and restarting...'
  }, { quoted: msg });

  try {
    userModel.saveAll();
    gameStatsModel.saveAll();
    botState.save();
    cacheModel.saveAll();
    afkTracker.saveAll();
  } catch (err) {
    console.error('Save on restart failed:', err.message);
  }

  setTimeout(() => process.exit(0), 500);
}

module.exports = { handle };