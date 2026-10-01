// In-memory state tracking: last command, cooldowns, sent-message IDs,
// and download locks.
//
// Message ID tracking exists so the delete command and the "reply to bot"
// detector can recognise messages the bot itself sent. IDs expire via a
// periodic sweep driven by housekeepingTasks; scheduling one timer per
// message would leave thousands of pending timers in the loop on a busy
// bot.

const config = require('../config');

const downloadLocks = new Map();
const DOWNLOAD_LOCK_MAX_MS = 120 * 1000;

const TRACKED_MESSAGE_TTL_MS = config.messageIdTtl;

// Map of messageId -> insertion timestamp, used to expire entries.
const trackedMessages = new Map();

function storeLastCommand(userJid, text, prefix) {
  if (text.startsWith(`${prefix}!!`)) return;
  global.userLastCommand.set(userJid, text);
}

function getLastCommand(userJid) {
  return global.userLastCommand.get(userJid) || null;
}

function checkCooldown(userJid, command) {
  const key = `${userJid}_${command}`;
  const now = Date.now();

  if (global.userCooldowns.has(key)) {
    const lastUsed = global.userCooldowns.get(key);
    if (now - lastUsed < config.commandCooldown) {
      return true;
    }
  }

  global.userCooldowns.set(key, now);
  return false;
}

// Records a bot-sent message ID. The third argument is the options object
// passed to sock.sendMessage. Game engines and lobby code mark their own
// message IDs separately, so nothing here needs to distinguish them.
function trackBotMessage(messageId) {
  global.botMessageIds.add(messageId);
  trackedMessages.set(messageId, Date.now());
}

// Removes IDs older than the TTL. Called periodically by housekeeping.
function sweepTrackedMessages() {
  const cutoff = Date.now() - TRACKED_MESSAGE_TTL_MS;
  let removed = 0;

  for (const [messageId, timestamp] of trackedMessages.entries()) {
    if (timestamp < cutoff) {
      trackedMessages.delete(messageId);
      global.botMessageIds.delete(messageId);
      removed++;
    }
  }

  return removed;
}

function isBotMessageId(messageId) {
  return global.botMessageIds.has(messageId);
}

function isReplyToBot(msg) {
  if (!global.botInstance || !global.botInstance.botUserId) return false;

  const chatJid = msg.key.remoteJid;
  if (!chatJid.endsWith('@g.us')) return true;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx) return false;

  return isBotMessageId(ctx.stanzaId);
}

function isDownloadLocked(userJid, command, argument) {
  const key = `${userJid}_${command}_${argument.toLowerCase()}`;
  const entry = downloadLocks.get(key);
  if (!entry) return false;

  if (Date.now() - entry.startedAt > DOWNLOAD_LOCK_MAX_MS) {
    downloadLocks.delete(key);
    return false;
  }

  return true;
}

function lockDownload(userJid, command, argument) {
  const key = `${userJid}_${command}_${argument.toLowerCase()}`;
  downloadLocks.set(key, { startedAt: Date.now() });
}

function unlockDownload(userJid, command, argument) {
  const key = `${userJid}_${command}_${argument.toLowerCase()}`;
  downloadLocks.delete(key);
}

module.exports = {
  storeLastCommand,
  getLastCommand,
  checkCooldown,
  trackBotMessage,
  sweepTrackedMessages,
  isBotMessageId,
  isReplyToBot,
  isDownloadLocked,
  lockDownload,
  unlockDownload
};