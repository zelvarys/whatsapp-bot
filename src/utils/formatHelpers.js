// Byte, uptime, and tier formatting helpers.

const config = require('../config');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getTier(level) {
  for (const tier of config.tiers) {
    if (level >= tier.minLevel) return tier;
  }
  return config.tiers[config.tiers.length - 1];
}

function getTierName(level) {
  return getTier(level).name;
}

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

module.exports = {
  formatBytes,
  formatUptime,
  getTier,
  getTierName,
  getLevelProgress
};