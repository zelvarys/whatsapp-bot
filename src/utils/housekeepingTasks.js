const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const botState = require('../models/botStateModel');
const chatbotConversation = require('../services/ai/chatbotConversation');
const lobbyState = require('../utils/lobbyState');
const state = require('../utils/stateHelpers');
const config = require('../config');

let intervals = [];

const SLOW_GAMES = ['hangman', 'riddle', 'wordScramble'];

// Clears any timers left over from a previous call. Without this a
// second start (for example after a failed startup that retried) would
// leave duplicate intervals running side by side.
function clearIntervals() {
  intervals.forEach((id) => clearInterval(id));
  intervals = [];
}

function setupIntervals() {
  clearIntervals();

  intervals.push(setInterval(() => {
    userModel.saveAll();
    gameStatsModel.saveAll();
    botState.save();
    console.log('💾 Auto-saved all data');
  }, 5 * 60 * 1000));

  intervals.push(setInterval(pruneActiveGames, 5 * 60 * 1000));
  intervals.push(setInterval(pruneUsageCounters, 60 * 60 * 1000));
  intervals.push(setInterval(pruneTrackedMessages, 5 * 60 * 1000));
  intervals.push(setInterval(pruneCooldowns, 5 * 60 * 1000));
  intervals.push(setInterval(refreshAllGroupData, 60 * 60 * 1000));

  intervals.push(setInterval(() => {
    const removed = chatbotConversation.pruneOldConversations();
    if (removed > 0) console.log(`🧹 Cleared ${removed} idle chatbot conversations`);
  }, 60 * 60 * 1000));

  intervals.push(setInterval(() => {
    const bot = global.botInstance;
    if (!bot || !bot.sock) return;
    lobbyState.pruneLobbies(bot.sock).catch((err) => {
      console.error('Lobby prune error:', err.message);
    });
  }, config.lobbySettings.pruneIntervalMs));
}

function pruneActiveGames() {
  const now = Date.now();
  let removed = 0;

  for (const [chatJid, game] of global.activeGames.entries()) {
    const isSlow = SLOW_GAMES.includes(game.type);
    const maxIdle = isSlow ? 2 * 60 * 1000 : 5 * 60 * 1000;
    const last = game.lastActivity || game.startTime || 0;

    if (now - last > maxIdle) {
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

function pruneTrackedMessages() {
  const removed = state.sweepTrackedMessages();
  if (removed > 0) console.log(`🧹 Cleared ${removed} expired message IDs`);
}

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
      // Group may have been left or no longer exists.
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
  } catch (err) {
    console.error('Save on shutdown failed:', err.message);
  }

  clearIntervals();

  setTimeout(() => process.exit(0), 500);
}

module.exports = {
  setupIntervals,
  handleShutdown
};