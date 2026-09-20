const fs = require('fs');
const path = require('path');

// Loads JSON files from /content once and caches them.
// Call `clear()` to force a reload — useful if content is edited live.

const CONTENT_DIR = path.join(__dirname, '../../content');
const cache = new Map();

function load(name) {
  if (cache.has(name)) return cache.get(name);

  const filePath = path.join(CONTENT_DIR, `${name}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Content file not found: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  cache.set(name, data);
  return data;
}

function clear() {
  cache.clear();
}

module.exports = { load, clear };