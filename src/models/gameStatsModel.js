const config = require('../config');
const repo = require('./jsonRepository');

// Aggregate counters per game type. Persisted to config.gameStatisticsPath.

function loadAll() {
  const data = repo.readJson(config.gameStatisticsPath, {});
  global.gameStats = data;
  return Object.keys(data).length;
}

function saveAll() {
  repo.writeJson(config.gameStatisticsPath, global.gameStats);
}

function increment(gameType, points) {
  if (!global.gameStats[gameType]) {
    global.gameStats[gameType] = { totalPlays: 0, totalPoints: 0 };
  }

  global.gameStats[gameType].totalPlays += 1;
  global.gameStats[gameType].totalPoints += points;
  saveAll();
}

function getStats(gameType) {
  return global.gameStats[gameType] || { totalPlays: 0, totalPoints: 0 };
}

function getAll() {
  return global.gameStats;
}

module.exports = {
  loadAll,
  saveAll,
  increment,
  getStats,
  getAll
};