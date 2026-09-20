const config = require('../config');
const repo = require('./jsonRepository');

// In-memory store of all users. Persisted to config.userProfilesPath.

function loadAll() {
  const data = repo.readJson(config.userProfilesPath, {});
  global.userData = data;
  return Object.keys(data).length;
}

function saveAll() {
  repo.writeJson(config.userProfilesPath, global.userData);
}

function defaultUsername(jid) {
  const digits = jid.split('@')[0].split(':')[0];
  const hash = Math.abs(
    digits.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % 10000;

  return `user_${hash}`;
}

function getUser(jid) {
  if (!global.userData[jid]) {
    global.userData[jid] = {
      username: defaultUsername(jid),
      points: 0,
      xp: 0,
      level: 1,
      gamesPlayed: 0,
      gamesWon: 0,
      totalPoints: 0,
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      achievements: []
    };
    saveAll();
  }

  return global.userData[jid];
}

function updateUser(jid, patch) {
  const user = getUser(jid);
  Object.assign(user, patch);
  user.lastActive = new Date().toISOString();
  saveAll();
}

function addPoints(jid, points) {
  const user = getUser(jid);
  user.points += points;
  user.xp += points;
  user.totalPoints += points;
  user.gamesPlayed += 1;

  const oldLevel = user.level;
  user.level = Math.floor(user.xp / 100) + 1;

  checkAchievements(jid);
  saveAll();

  return {
    oldLevel,
    newLevel: user.level,
    leveledUp: user.level > oldLevel
  };
}

function addWin(jid) {
  const user = getUser(jid);
  user.gamesWon += 1;
  saveAll();
  return user.gamesWon;
}

function checkAchievements(jid) {
  const user = getUser(jid);
  const gained = [];

  if (user.level >= 100 && !user.achievements.includes('Grandmaster')) {
    user.achievements.push('Grandmaster');
    user.points += 1000;
    gained.push('Grandmaster');
  }

  if (user.gamesWon >= 250 && !user.achievements.includes('Legendary Victor')) {
    user.achievements.push('Legendary Victor');
    user.points += 1500;
    gained.push('Legendary Victor');
  }

  if (user.totalPoints >= 10000 && !user.achievements.includes('Ultimate Wealth')) {
    user.achievements.push('Ultimate Wealth');
    user.points += 2000;
    gained.push('Ultimate Wealth');
  }

  if (user.dailyClaims >= 365 && !user.achievements.includes('Year of Dedication')) {
    user.achievements.push('Year of Dedication');
    user.points += 2500;
    gained.push('Year of Dedication');
  }

  return gained;
}

function getLeaderboard(limit = 10) {
  return Object.entries(global.userData)
    .map(([jid, data]) => ({ jid, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

function getUserRank(jid) {
  const sorted = Object.entries(global.userData)
    .sort((a, b) => b[1].points - a[1].points);

  const index = sorted.findIndex(([id]) => id === jid);
  return index >= 0 ? index + 1 : sorted.length + 1;
}

function getDisplayName(jid) {
  return getUser(jid).username;
}

function getAllCount() {
  return Object.keys(global.userData).length;
}

module.exports = {
  loadAll,
  saveAll,
  getUser,
  updateUser,
  addPoints,
  addWin,
  getLeaderboard,
  getUserRank,
  getDisplayName,
  getAllCount
};