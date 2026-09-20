const youtubeDownloader = require('./youtubeDownloader');
const tiktokDownloader = require('./tiktokDownloader');
const facebookDownloader = require('./facebookDownloader');
const config = require('../../config');

// Picks the right platform downloader based on the URL.
async function download(url) {
  const trimmed = url.trim();

  if (config.youtubeRegex.test(trimmed)) {
    return youtubeDownloader.download(trimmed);
  }

  if (config.tiktokRegex.test(trimmed)) {
    return tiktokDownloader.download(trimmed);
  }

  if (config.facebookRegex.test(trimmed)) {
    return facebookDownloader.download(trimmed);
  }

  return {
    success: false,
    error: 'Unsupported platform. Use YouTube, TikTok, or Facebook.'
  };
}

module.exports = { download };