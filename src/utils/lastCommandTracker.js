// Tracks the most recent command per user, so `!!` can repeat it.

function storeLastCommand(userJid, text, prefix) {
  // Ignore the repeat command itself so `!!` doesn't loop on itself.
  if (text.startsWith(`${prefix}!!`)) return;

  global.userLastCommand.set(userJid, text);
}

function getLastCommand(userJid) {
  return global.userLastCommand.get(userJid) || null;
}

module.exports = { storeLastCommand, getLastCommand };