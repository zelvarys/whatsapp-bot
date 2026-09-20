const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const botState = require('../models/botStateModel');
const cache = require('../models/commandCacheModel');
const chatbotConversation = require('../services/ai/chatbotConversation');

// Runs periodic housekeeping: saves, prunes expired state, drops
// stale games, and clears old message ID tracking.

let intervals = [];

function setupIntervals() {
  // Save all persisted models every 5 minutes.
  intervals.push(setInterval(() => {
    userModel.saveAll();
    gameStatsModel.saveAll();
    botState.save();
    cache.saveAll();
    console.log('💾 Auto-saved all data');
  }, 5 * 60 * 1000));

  // Drop games that started more than 5 minutes ago.
  intervals.push(setInterval(pruneActiveGames, 5 * 60 * 1000));

  // Clear AI/image usage counters from previous days.
  intervals.push(setInterval(pruneUsageCounters, 60 * 60 * 1000));

  // Trim message ID tracking sets.
  intervals.push(setInterval(pruneMessageIds, 30 * 60 * 1000));

  // Drop command cache entries older than 24 hours.
  intervals.push(setInterval(() => {
    const removed = cache.pruneExpired();
    if (removed > 0) console.log(`🧹 Cleared ${removed} stale cache entries`);
  }, 60 * 60 * 1000));

  // Clear chatbot conversations that have been idle for over an hour.
  intervals.push(setInterval(() => {
    const removed = chatbotConversation.pruneOldConversations();
    if (removed > 0) console.log(`🧹 Cleared ${removed} idle chatbot conversations`);
  }, 60 * 60 * 1000));
}

function pruneActiveGames() {
  const now = Date.now();
  let removed = 0;

  for (const [chatJid, game] of global.activeGames.entries()) {
    if (game.startTime && now - game.startTime > 5 * 60 * 1000) {
      global.activeGames.delete(chatJid);
      removed++;
    }
  }

  if (removed > 0) console.log(`🧹 Cleaned up ${removed} expired games`);
}

function pruneUsageCounters() {
  const today = new Date().toISOString().split('T')[0];
  let removed = 0;

  for (const key of global.aiUsage.keys()) {
    if (!key.endsWith(today)) {
      global.aiUsage.delete(key);
      removed++;
    }
  }

  if (removed > 0) console.log(`🧹 Cleared ${removed} old usage records`);
}

function pruneMessageIds() {
  if (global.botMessageIds.size > 5000) {
    const ids = Array.from(global.botMessageIds).slice(0, 1000);
    ids.forEach((id) => global.botMessageIds.delete(id));
  }

  if (global.gameMessageIds.size > 1000) {
    const ids = Array.from(global.gameMessageIds).slice(0, 500);
    ids.forEach((id) => global.gameMessageIds.delete(id));
  }
}

// Called on SIGINT / SIGTERM so the last state changes are not lost.
function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Saving data before shutdown...`);

  try {
    userModel.saveAll();
    gameStatsModel.saveAll();
    botState.save();
    cache.saveAll();
  } catch (err) {
    console.error('Save on shutdown failed:', err.message);
  }

  intervals.forEach((id) => clearInterval(id));
  intervals = [];

  setTimeout(() => process.exit(0), 500);
}

module.exports = {
  setupIntervals,
  handleShutdown
};