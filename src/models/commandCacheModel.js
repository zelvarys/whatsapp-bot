const config = require('../config');
const repo = require('./jsonRepository');

// Caches full responses for expensive commands.
// Persisted to COMMAND_CACHE_PATH.
// Shape: { "<key>": { response, timestamp } }

function loadAll() {
  const data = repo.readJson(config.COMMAND_CACHE_PATH, {});
  global.commandCache = new Map(Object.entries(data));
}

function saveAll() {
  const plain = Object.fromEntries(global.commandCache);
  repo.writeJson(config.COMMAND_CACHE_PATH, plain);
}

function set(key, response) {
  global.commandCache.set(key, {
    response,
    timestamp: Date.now()
  });

  // Cap size so the cache file doesn't grow forever.
  if (global.commandCache.size > 100) {
    const oldest = global.commandCache.keys().next().value;
    global.commandCache.delete(oldest);
  }
}

// Returns the cached response or null if missing or expired.
function get(key) {
  if (!global.commandCache.has(key)) return null;

  const entry = global.commandCache.get(key);
  if (Date.now() - entry.timestamp > config.COMMAND_CACHE_TTL) {
    global.commandCache.delete(key);
    return null;
  }

  return entry.response;
}

// Called by the periodic cleanup task.
function pruneExpired() {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of global.commandCache.entries()) {
    if (now - entry.timestamp > 24 * 60 * 60 * 1000) {
      global.commandCache.delete(key);
      removed++;
    }
  }

  if (removed > 0) saveAll();
  return removed;
}

module.exports = {
  loadAll,
  saveAll,
  set,
  get,
  pruneExpired
};