const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const botState = require('../models/botStateModel');
const cache = require('../models/commandCacheModel');
const chatbotConversation = require('../services/ai/chatbotConversation');
const config = require('../config');

// Runs periodic housekeeping: saves, prunes expired state, drops
// stale games, refreshes group data, and clears old cooldowns.

let intervals = [];

function setupIntervals() {
  intervals.push(setInterval(() => {
    userModel.saveAll();
    gameStatsModel.saveAll();
    botState.save();
    cache.saveAll();
    console.log('💾 Auto-saved all data');
  }, 5 * 60 * 1000));

  intervals.push(setInterval(pruneActiveGames, 5 * 60 * 1000));

  intervals.push(setInterval(pruneUsageCounters, 60 * 60 * 1000));

  intervals.push(setInterval(pruneMessageIds, 30 * 60 * 1000));

  intervals.push(setInterval(() => {
    const removed = cache.pruneExpired();
    if (removed > 0) console.log(`🧹 Cleared ${removed} stale cache entries`);
  }, 60 * 60 * 1000));

  intervals.push(setInterval(() => {
    const removed = chatbotConversation.pruneOldConversations();
    if (removed > 0) console.log(`🧹 Cleared ${removed} idle chatbot conversations`);
  }, 60 * 60 * 1000));

  intervals.push(setInterval(pruneCooldowns, 5 * 60 * 1000));

  intervals.push(setInterval(refreshAllGroupData, 60 * 60 * 1000));
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

// Removes cooldown entries older than 5 minutes so the map doesn't grow forever.
function pruneCooldowns() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  let removed = 0;

  for (const [key, timestamp] of global.userCooldowns.entries()) {
    if (timestamp < cutoff) {
      global.userCooldowns.delete(key);
      removed++;
    }
  }

  if (removed > 0) console.log(`🧹 Cleared ${removed} expired cooldown entries`);
}

// Refreshes participant lists for all known groups once per hour.
async function refreshAllGroupData() {
  const bot = global.botInstance;
  if (!bot || !bot.sock || !bot.isConnected) return;

  let refreshed = 0;

  for (const groupJid of Object.keys(global.groupData)) {
    try {
      const meta = await bot.sock.groupMetadata(groupJid);
      global.groupData[groupJid].name = meta.subject;
      global.groupData[groupJid].participants = meta.participants;
      global.groupData[groupJid].lastFetched = Date.now();
      refreshed++;
    } catch (err) {
      // Group may have been left or the bot lost access
    }
  }

  if (refreshed > 0) console.log(`🔄 Refreshed data for ${refreshed} groups`);
}

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