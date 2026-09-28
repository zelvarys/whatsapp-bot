// In-memory state tracking: last command, cooldowns, sent-message IDs,
// and download locks.

const config = require('../config');

const downloadLocks = new Map();
const DOWNLOAD_LOCK_MAX_MS = 120 * 1000;

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

function trackBotMessage(messageId, chatJid, options) {
  global.botMessageIds.add(messageId);

  if (options && options.context && options.context.isGame) {
    global.gameMessageIds.add(messageId);
  }

  setTimeout(() => {
    global.botMessageIds.delete(messageId);
    global.gameMessageIds.delete(messageId);
    global.helpMessageIds.delete(messageId);
  }, config.messageIdTtl);
}

function isBotMessageId(messageId) {
  return (
    global.botMessageIds.has(messageId) ||
    global.gameMessageIds.has(messageId) ||
    global.helpMessageIds.has(messageId)
  );
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
  isBotMessageId,
  isReplyToBot,
  isDownloadLocked,
  lockDownload,
  unlockDownload
};