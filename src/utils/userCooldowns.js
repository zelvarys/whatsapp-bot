const config = require('../config');

// Per-user, per-command cooldown tracking.
// Backed by global.userCooldowns which is initialized at startup.

function checkCooldown(userJid, command) {
  const key = `${userJid}_${command}`;
  const now = Date.now();

  if (global.userCooldowns.has(key)) {
    const lastUsed = global.userCooldowns.get(key);
    if (now - lastUsed < config.COMMAND_COOLDOWN) {
      return true;
    }
  }

  global.userCooldowns.set(key, now);
  return false;
}

module.exports = { checkCooldown };