const ytdlp = require('./ytdlpRunner');

async function downloadMusic(urlOrQuery) {
  try {
    let videoUrl = urlOrQuery;

    // If it's not a URL, search using yt-dlp's built-in search.
    if (!urlOrQuery.includes('http')) {
      videoUrl = `ytsearch1:${urlOrQuery}`;
    }

    const result = await ytdlp.downloadAudio(videoUrl);
    return result;
  } catch (err) {
    console.error('Music download error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadMusic, searchAndDownload: downloadMusic };