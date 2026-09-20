const youtubeDownloader = require('../../services/media/youtubeDownloader');
const downloadCommand = require('./download');

// !youtube <url> — alias for the universal downloader.
async function handle(sock, msg, sender, userJid, fullText) {
  return downloadCommand.handle(sock, msg, sender, userJid, fullText);
}

module.exports = { handle };