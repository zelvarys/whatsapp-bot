const youtubeDownloader = require('./youtubeDownloader');
const instagramDownloader = require('./instagramDownloader');
const tiktokDownloader = require('./tiktokDownloader');
const config = require('../../config');

// Picks the right platform downloader based on the URL.
async function download(url) {
  const trimmed = url.trim();

  if (config.YOUTUBE_REGEX.test(trimmed)) {
    return youtubeDownloader.download(trimmed);
  }

  if (config.INSTAGRAM_REGEX.test(trimmed)) {
    return instagramDownloader.download(trimmed);
  }

  if (config.TIKTOK_REGEX.test(trimmed)) {
    return tiktokDownloader.download(trimmed);
  }

  return {
    success: false,
    error: 'Unsupported platform. Use YouTube, Instagram, or TikTok.'
  };
}

module.exports = { download };