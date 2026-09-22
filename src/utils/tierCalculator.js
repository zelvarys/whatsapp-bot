const config = require('../config');

// Returns the tier object for a given level.
// Tiers are ordered highest-to-lowest in config.tiers, so the
// first entry whose minLevel is <= level wins.
function getTier(level) {
  for (const tier of config.tiers) {
    if (level >= tier.minLevel) return tier;
  }
  return config.tiers[config.tiers.length - 1];
}

// Convenience: just the name.
function getTierName(level) {
  return getTier(level).name;
}

// Progress info for the profile command.
function getLevelProgress(xp) {
  const progress = xp % 100;
  const nextLevelXp = 100 - progress;
  const bars = 16;
  const filled = Math.floor((progress / 100) * bars);

  let bar = '';
  for (let i = 0; i < bars; i++) {
    bar += i < filled ? '█' : '░';
  }

  return { progress, nextLevelXp, bar };
}

module.exports = { getTier, getTierName, getLevelProgress };