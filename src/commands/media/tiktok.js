const downloadCommand = require('./download');

// !tiktok <url> — alias for the universal downloader.
async function handle(sock, msg, sender, userJid, fullText) {
  return downloadCommand.handle(sock, msg, sender, userJid, fullText);
}

module.exports = { handle };