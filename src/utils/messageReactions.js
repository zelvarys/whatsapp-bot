const config = require('../config');

// Applies and removes emoji reactions on messages.
// Reactions are cosmetic — failures are swallowed.

async function applyReaction(sock, chatId, messageKey, emoji) {
  if (!emoji) return;

  try {
    await sock.sendMessage(chatId, {
      react: { text: emoji, key: messageKey }
    });
  } catch (err) {
    // Silent — reactions are cosmetic
  }
}

async function removeReaction(sock, chatId, messageKey) {
  try {
    await sock.sendMessage(chatId, {
      react: { text: '', key: messageKey }
    });
  } catch (err) {
    // Silent
  }
}

// Returns the emoji configured for a command, or null.
function getReactionForCommand(command) {
  if (!command) return null;
  return config.COMMAND_REACTIONS[command] ?? null;
}

module.exports = {
  applyReaction,
  removeReaction,
  getReactionForCommand
};