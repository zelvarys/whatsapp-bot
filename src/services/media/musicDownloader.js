const ytdlp = require('./ytdlpRunner');

// Accepts either a direct URL or a search query. Search queries are
// forwarded to yt-dlp's ytsearch1: pseudo-URL, which resolves to the
// first YouTube hit.
async function downloadMusic(urlOrQuery) {
  try {
    let videoUrl = urlOrQuery;

    if (!urlOrQuery.includes('http')) {
      videoUrl = `ytsearch1:${urlOrQuery}`;
    }

    return await ytdlp.downloadAudio(videoUrl);
  } catch (err) {
    console.error('Music download error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadMusic, searchAndDownload: downloadMusic };