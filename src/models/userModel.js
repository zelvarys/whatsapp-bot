const config = require('../config');
const repo = require('./jsonRepository');

// In-memory store of all users. Persisted to config.userProfilesPath.
//
// gamesPlayed is only incremented when a user actually takes part in a
// game, not on every point award. addPoints is called for individual
// turns (a correct hangman letter, a trivia answer) and must not touch
// participation counters. addWin increments both gamesWon and
// gamesPlayed, because a win is by definition a game played.

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
      lastActive: new Date().toISOString()
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

// Awards points and XP. Does not touch gamesPlayed — participation is
// recorded separately via recordParticipation or addWin.
function addPoints(jid, points) {
  const user = getUser(jid);
  user.points += points;
  user.xp += points;
  user.totalPoints += points;

  const oldLevel = user.level;
  user.level = Math.floor(user.xp / 100) + 1;

  saveAll();

  return {
    oldLevel,
    newLevel: user.level,
    leveledUp: user.level > oldLevel
  };
}

// Records that a user played a game without winning it.
function recordParticipation(jid) {
  const user = getUser(jid);
  user.gamesPlayed += 1;
  saveAll();
  return user.gamesPlayed;
}

// Records a win. A win implies a game was played, so both counters move.
function addWin(jid) {
  const user = getUser(jid);
  user.gamesWon += 1;
  user.gamesPlayed += 1;
  saveAll();
  return user.gamesWon;
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
  recordParticipation,
  addWin,
  getLeaderboard,
  getUserRank,
  getDisplayName,
  getAllCount
};