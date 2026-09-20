const config = require('../config');
const repo = require('./jsonRepository');

// Aggregate counters per game type. Persisted to GAME_STATISTICS_PATH.
// Shape:
//   {
//     "<gameType>": { totalPlays, totalPoints }
//   }

function loadAll() {
  const data = repo.readJson(config.GAME_STATISTICS_PATH, {});
  global.gameStats = data;
  return Object.keys(data).length;
}

function saveAll() {
  repo.writeJson(config.GAME_STATISTICS_PATH, global.gameStats);
}

// Called whenever a game round ends (win or loss). Adds to plays and points.
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