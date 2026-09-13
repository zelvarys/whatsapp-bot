const os = require('os');

class SystemMonitor {
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  async getSystemInfo() {
    try {
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        type: os.type(),
        
        nodeVersion: process.version,
        v8Version: process.versions.v8,
        uptime: process.uptime(),
      };
      
      return systemInfo;
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }
  
  async showStats(sender, sock, config, stats, isConnected, onlineSince) {
    const uptime = Date.now() - stats.startTime;
    const uptimeString = this.formatUptime(uptime);
    
    const systemInfo = await this.getSystemInfo();
    
    let statsText = `*✧ BOT STATISTICS*
╒═══════════════════╕

▸ *Name:* ${config.botName}
▸ *Version:* ${config.version}
▸ *Prefix:* ${config.prefix}
▸ *Mode:* ${global.botMode}

┌─⊶ *SYSTEM*
│ *Platform:* ${systemInfo.platform} ${systemInfo.arch}
│ *OS:* ${systemInfo.type}
│ *Node.js:* ${systemInfo.nodeVersion}
│ *V8 Engine:* ${systemInfo.v8Version}
│ *Environment:* Termux
│ *Uptime:* ${Math.floor(systemInfo.uptime)}s
└─────────────⊶

┌─⊶ *ACTIVITY*
│ *Messages:* ${stats.messagesReceived}
│ *Commands Executed:* ${stats.commandsExecuted}
│ *Games Played:* ${stats.gamesPlayed}
│ *Groups Joined:* ${Object.keys(global.groupData).length}
└─────────────⊶

┌─⊶ *STATUS*
│ *Status:* ${isConnected ? 'Connected ✅' : 'Disconnected ❌'}
│ *Online Since:* ${onlineSince ? new Date(onlineSince).toLocaleTimeString() : 'Offline'}
└─────────────⊶

╘═══════════════════╛`;
    
    await sock.sendMessage(sender, { text: statsText });
  }
  
  async broadcastMessage(sock, message, source = 'owner', specificGroups = []) {
    try {
      console.log(`📢 Broadcast from ${source}: ${message.substring(0, 50)}...`);
      
      let groups = Object.keys(global.groupData);
      
      if (specificGroups && specificGroups.length > 0) {
        groups = groups.filter(groupId => specificGroups.includes(groupId));
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const groupId of groups) {
        try {
          await sock.sendMessage(groupId, {
            text: `✧ *BROADCAST MESSAGE*
╒═════════════════════╕

${message}

╘═════════════════════╛
▸ _Message from Developer_`
          });
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to send to ${groupId}:`, error.message);
          failCount++;
        }
      }
      
      return { success: successCount, failed: failCount, total: groups.length };
    } catch (error) {
      console.error('Broadcast error:', error);
      return { success: 0, failed: 0, total: 0, error: error.message };
    }
  }
}

module.exports = SystemMonitor;