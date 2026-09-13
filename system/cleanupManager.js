const DataManager = require('../utils/dataManager');

class CleanupManager {
  setupIntervals() {
    setInterval(() => {
      DataManager.saveAllData();
      console.log('💾 Auto-saved all data');
    }, 5 * 60 * 1000);
    
    setInterval(() => {
      this.cleanupActiveGames();
    }, 300000);
    
    setInterval(() => {
      this.cleanupOldUsageData();
    }, 3600000);
    
    setInterval(() => {
      this.cleanupOldMessageIds();
    }, 30 * 60 * 1000);
    
    setInterval(() => {
      this.cleanupCommandCache();
    }, 60 * 60 * 1000);
  }
  
  cleanupActiveGames() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [chatJid, game] of global.activeGames.entries()) {
      if (game.startTime && now - game.startTime > 300000) {
        global.activeGames.delete(chatJid);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired games`);
    }
  }
  
  cleanupOldUsageData() {
    const today = DataManager.getCurrentDate();
    let cleared = 0;
    
    for (const [key, value] of global.aiUsage.entries()) {
      if (!key.endsWith(today)) {
        global.aiUsage.delete(key);
        cleared++;
      }
    }
    
    for (const [key, value] of global.imageUsage.entries()) {
      if (!key.endsWith(today)) {
        global.imageUsage.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} old usage records`);
    }
  }
  
  cleanupOldMessageIds() {
    if (global.botMessageIds.size > 5000) {
      const array = Array.from(global.botMessageIds);
      const toRemove = array.slice(0, 1000);
      toRemove.forEach(id => global.botMessageIds.delete(id));
    }
    
    if (global.gameMessageIds.size > 1000) {
      const array = Array.from(global.gameMessageIds);
      const toRemove = array.slice(0, 500);
      toRemove.forEach(id => global.gameMessageIds.delete(id));
    }
  }
  
  cleanupCommandCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, data] of global.commandCache.entries()) {
      if (now - data.timestamp > 24 * 60 * 60 * 1000) {
        global.commandCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleared ${cleaned} old command cache entries`);
      DataManager.saveCommandCache();
    }
  }
  
  handleShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Saving data and shutting down gracefully...`);
    DataManager.saveAllData();
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

module.exports = CleanupManager;