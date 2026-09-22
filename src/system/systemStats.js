const os = require('os');
const config = require('../config');
const { formatUptime } = require('../utils/formatHelpers');

function collectSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    type: os.type(),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    processUptimeSeconds: Math.floor(process.uptime())
  };
}

async function showStats(sender, sock, stats, isConnected, onlineSince) {
  const uptimeMs = Date.now() - stats.startTime;
  const sys = collectSystemInfo();

  const text = `*✧ BOT STATISTICS*
╒═══════════════════╕

▸ *Name:* ${config.botName}
▸ *Version:* ${config.botVersion}
▸ *Prefix:* ${config.prefix}
▸ *Mode:* ${global.botMode}

┌─⊶ *SYSTEM*
│ *Platform:* ${sys.platform} ${sys.arch}
│ *OS:* ${sys.type}
│ *Node.js:* ${sys.nodeVersion}
│ *V8 Engine:* ${sys.v8Version}
│ *Environment:* Termux
│ *Process Uptime:* ${sys.processUptimeSeconds}s
└─────────────⊶

┌─⊶ *ACTIVITY*
│ *Messages:* ${stats.messagesReceived}
│ *Commands Executed:* ${stats.commandsExecuted}
│ *Games Played:* ${stats.gamesPlayed}
│ *Groups Joined:* ${Object.keys(global.groupData).length}
│ *Uptime:* ${formatUptime(uptimeMs)}
└─────────────⊶

┌─⊶ *STATUS*
│ *Status:* ${isConnected ? 'Connected ✅' : 'Disconnected ❌'}
│ *Online Since:* ${onlineSince ? new Date(onlineSince).toLocaleTimeString() : 'Offline'}
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text });
}

function isHealthy(stats, isConnected) {
  if (!isConnected) return false;
  if (!stats) return false;
  return true;
}

module.exports = { showStats, isHealthy, collectSystemInfo };