const fs = require('fs');
const path = require('path');
const config = require('../config');

class DataManager {
  static loadAllData() {
    this.loadUserData();
    this.loadGameStats();
    this.loadGroupSettings();
    this.loadCommandCache();
    console.log('All data loaded successfully ✅');
  }
  
  static saveAllData() {
    this.saveUserData();
    this.saveGameStats();
    this.saveGroupSettings();
    this.saveCommandCache();
  }
  
  static loadUserData() {
    try {
      if (fs.existsSync(config.USER_DATA_PATH)) {
        const data = fs.readFileSync(config.USER_DATA_PATH, 'utf8');
        global.userData = JSON.parse(data);
        console.log(`Loaded user data for ${Object.keys(global.userData).length} users ✅`);
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      global.userData = {};
    }
  }
  
  static saveUserData() {
    try {
      fs.writeFileSync(config.USER_DATA_PATH, JSON.stringify(global.userData, null, 2));
    } catch (error) {
      console.error('❌ Error saving user data:', error);
    }
  }
  
  static getUserData(userJid) {
    if (!global.userData[userJid]) {
      const phoneNumber = userJid.split('@')[0];
      const userHash = Math.abs(phoneNumber.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0)) % 10000;
      
      global.userData[userJid] = {
        points: 0,
        xp: 0,
        level: 1,
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        joinDate: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        achievements: [],
        username: `user_${userHash}`,
        dailyClaims: 0,
        totalDays: 0
      };
      this.saveUserData();
    }
    return global.userData[userJid];
  }
  
  static updateUserData(userJid, update) {
    const user = this.getUserData(userJid);
    Object.assign(user, update);
    user.lastActive = new Date().toISOString();
    this.saveUserData();
  }
  
  static addPoints(userJid, points, gameType) {
    const user = this.getUserData(userJid);
    user.points += points;
    user.xp += points;
    user.totalPoints += points;
    user.gamesPlayed += 1;
    
    if (!global.gameStats) global.gameStats = {};
    if (!global.gameStats[gameType]) {
      global.gameStats[gameType] = { totalPlays: 0, totalPoints: 0 };
    }
    global.gameStats[gameType].totalPlays += 1;
    global.gameStats[gameType].totalPoints += points;
    this.saveGameStats();
    
    const oldLevel = user.level;
    user.level = Math.floor(user.xp / 100) + 1;
    
    this.checkAchievements(userJid);
    this.saveUserData();
    
    return { oldLevel, newLevel: user.level, leveledUp: user.level > oldLevel };
  }
  
  static addWin(userJid) {
    const user = this.getUserData(userJid);
    user.gamesWon += 1;
    this.saveUserData();
    console.log(`🏆 Win recorded for ${userJid}: ${user.gamesWon} total wins`);
    return user.gamesWon;
  }
  
  static checkAchievements(userJid) {
    const user = this.getUserData(userJid);
    const achievements = [];
    
    if (user.level >= 100 && !user.achievements.includes('Grandmaster')) {
      achievements.push({ name: 'Grandmaster', reward: 1000 });
      user.achievements.push('Grandmaster');
      user.points += 1000;
    }
    
    if (user.gamesWon >= 250 && !user.achievements.includes('Legendary Victor')) {
      achievements.push({ name: 'Legendary Victor', reward: 1500 });
      user.achievements.push('Legendary Victor');
      user.points += 1500;
    }
    
    if (user.totalPoints >= 10000 && !user.achievements.includes('Ultimate Wealth')) {
      achievements.push({ name: 'Ultimate Wealth', reward: 2000 });
      user.achievements.push('Ultimate Wealth');
      user.points += 2000;
    }
    
    if (user.dailyClaims >= 365 && !user.achievements.includes('Year of Dedication')) {
      achievements.push({ name: 'Year of Dedication', reward: 2500 });
      user.achievements.push('Year of Dedication');
      user.points += 2500;
    }
    
    if (achievements.length > 0) {
      this.saveUserData();
    }
    
    return achievements;
  }
  
  static getLeaderboard(limit = 10) {
    const users = Object.entries(global.userData)
      .map(([jid, data]) => ({
        jid,
        ...data,
        displayName: data.username || `user_${Math.abs(jid.split('@')[0].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 10000}`
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
    
    return users;
  }
  
  static getUserRank(userJid) {
    const sorted = Object.entries(global.userData)
      .sort((a, b) => b[1].points - a[1].points);
    
    const rank = sorted.findIndex(([jid]) => jid === userJid) + 1;
    return rank || sorted.length + 1;
  }
  
  static getDisplayName(userJid) {
    const user = this.getUserData(userJid);
    return user.username;
  }
  
  static loadGameStats() {
    try {
      if (fs.existsSync(config.GAME_DATA_PATH)) {
        const data = fs.readFileSync(config.GAME_DATA_PATH, 'utf8');
        global.gameStats = JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Error loading game stats:', error);
      global.gameStats = {};
    }
  }
  
  static saveGameStats() {
    try {
      fs.writeFileSync(config.GAME_DATA_PATH, JSON.stringify(global.gameStats, null, 2));
    } catch (error) {
      console.error('❌ Error saving game stats:', error);
    }
  }
  
  static loadGroupSettings() {
    try {
      if (fs.existsSync(config.GROUP_SETTINGS_PATH)) {
        const data = fs.readFileSync(config.GROUP_SETTINGS_PATH, 'utf8');
        global.groupSettings = JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Error loading group settings:', error);
      global.groupSettings = {};
    }
  }
  
  static saveGroupSettings() {
    try {
      fs.writeFileSync(config.GROUP_SETTINGS_PATH, JSON.stringify(global.groupSettings, null, 2));
    } catch (error) {
      console.error('❌ Error saving group settings:', error);
    }
  }
  
  static getGroupSettings(chatJid) {
    if (!global.groupSettings[chatJid]) {
      global.groupSettings[chatJid] = {
        linkProtect: false
      };
    }
    return global.groupSettings[chatJid];
  }
  
  static updateGroupSettings(chatJid, settings) {
    const current = this.getGroupSettings(chatJid);
    global.groupSettings[chatJid] = { ...current, ...settings };
    this.saveGroupSettings();
  }
  
  static loadCommandCache() {
    try {
      if (fs.existsSync(config.CACHE_DATA_PATH)) {
        const data = fs.readFileSync(config.CACHE_DATA_PATH, 'utf8');
        const parsed = JSON.parse(data);
        global.commandCache = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('❌ Error loading command cache:', error);
      global.commandCache = new Map();
    }
  }
  
  static saveCommandCache() {
    try {
      const data = Object.fromEntries(global.commandCache);
      fs.writeFileSync(config.CACHE_DATA_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Error saving command cache:', error);
    }
  }
  
  static addToCache(key, response) {
    global.commandCache.set(key, {
      response: response,
      timestamp: Date.now()
    });
    
    if (global.commandCache.size > 100) {
      const oldestKey = Array.from(global.commandCache.keys())[0];
      global.commandCache.delete(oldestKey);
    }
  }
  
  static getFromCache(key) {
    if (!global.commandCache.has(key)) return null;
    
    const cached = global.commandCache.get(key);
    if (Date.now() - cached.timestamp > 300000) {
      global.commandCache.delete(key);
      return null;
    }
    
    return cached.response;
  }
  
  static getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }
  
  static getCurrentTime() {
    return Date.now();
  }
  
  static formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  static formatTime(time) {
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

module.exports = DataManager;