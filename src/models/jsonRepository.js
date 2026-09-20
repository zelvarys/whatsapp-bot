const fs = require('fs');
const path = require('path');

// Generic JSON file read/write with atomic-ish writes.
// Every model uses this instead of touching fs directly.

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to read ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Write to a temp file first, then rename, so a crash mid-write
    // doesn't leave a half-written JSON file behind.
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`❌ Failed to write ${filePath}:`, err.message);
  }
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

module.exports = {
  readJson,
  writeJson,
  exists
};