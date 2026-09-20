// !stats — handled by systemStats via the router.
// Kept as a thin wrapper so the router has a consistent interface.

const systemStats = require('../../system/systemStats');

async function handle(sock, sender) {
  const bot = global.botInstance;
  if (!bot) {
    return sock.sendMessage(sender, {
      text: '📊 Bot statistics temporarily unavailable.'
    });
  }

  await systemStats.showStats(
    sender,
    sock,
    bot.stats,
    bot.isConnected,
    bot.onlineSince
  );
}

module.exports = { handle };