const config = require('../config');
const repo = require('./jsonRepository');

// Caches full responses for expensive commands.

function loadAll() {
  const data = repo.readJson(config.commandCachePath, {});
  global.commandCache = new Map(Object.entries(data));
}

function saveAll() {
  const plain = Object.fromEntries(global.commandCache);
  repo.writeJson(config.commandCachePath, plain);
}

function set(key, response) {
  global.commandCache.set(key, {
    response,
    timestamp: Date.now()
  });

  if (global.commandCache.size > 100) {
    const oldest = global.commandCache.keys().next().value;
    global.commandCache.delete(oldest);
  }
}

function get(key) {
  if (!global.commandCache.has(key)) return null;

  const entry = global.commandCache.get(key);
  if (Date.now() - entry.timestamp > config.commandCacheTtl) {
    global.commandCache.delete(key);
    return null;
  }

  return entry.response;
}

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