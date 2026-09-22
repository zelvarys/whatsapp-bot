const config = require('../config');
const repo = require('../models/jsonRepository');

// Tracks AFK (away-from-keyboard) users. Persisted to data/afk.json.
// Shape: { "<jid>": { reason, since } }

function loadAll() {
  const data = repo.readJson(config.afkStatePath, {});
  global.afkUsers = new Map(Object.entries(data));
}

function saveAll() {
  const plain = Object.fromEntries(global.afkUsers);
  repo.writeJson(config.afkStatePath, plain);
}

function setAfk(userJid, reason) {
  global.afkUsers.set(userJid, {
    reason: reason || 'AFK',
    since: Date.now()
  });
  saveAll();
}

function clearAfk(userJid) {
  if (!global.afkUsers.has(userJid)) return false;
  global.afkUsers.delete(userJid);
  saveAll();
  return true;
}

function isAfk(userJid) {
  return global.afkUsers.has(userJid);
}

function getAfk(userJid) {
  return global.afkUsers.get(userJid) || null;
}

// Formats the AFK notice that gets sent when someone tags an AFK user.
function formatAfkNotice(userJid) {
  const entry = global.afkUsers.get(userJid);
  if (!entry) return null;

  const seconds = Math.floor((Date.now() - entry.since) / 1000);

  let duration;
  if (seconds < 60) duration = `${seconds}s`;
  else if (seconds < 3600) duration = `${Math.floor(seconds / 60)}m`;
  else if (seconds < 86400) duration = `${Math.floor(seconds / 3600)}h`;
  else duration = `${Math.floor(seconds / 86400)}d`;

  return `💤 @${userJid.split('@')[0]} is AFK (${duration})\n▸ ${entry.reason}`;
}

// Called by periodic cleanup. Removes entries older than 24 hours.
function pruneOldAfk() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let removed = 0;

  for (const [userJid, entry] of global.afkUsers.entries()) {
    if (entry.since < cutoff) {
      global.afkUsers.delete(userJid);
      removed++;
    }
  }

  if (removed > 0) saveAll();
  return removed;
}

module.exports = {
  loadAll,
  saveAll,
  setAfk,
  clearAfk,
  isAfk,
  getAfk,
  formatAfkNotice,
  pruneOldAfk
};