const ytdl = require('shadowx-ytdl');

// Downloads YouTube audio as MP3. Pure JavaScript — no yt-dlp.
async function downloadMusic(urlOrQuery) {
  try {
    let videoUrl = urlOrQuery;

    // If the input is not a URL, search YouTube for the first match.
    if (!urlOrQuery.includes('http')) {
      const search = await ytdl.searchYouTube(urlOrQuery);

      if (!search || !search.results || !search.results.length) {
        throw new Error('No search results');
      }

      videoUrl = search.results[0].url;
    }

    const info = await ytdl.downloadAudio(videoUrl, 128);

    if (!info || !info.download || !info.download.downloadUrl) {
      throw new Error('No download URL returned');
    }

    const response = await fetch(info.download.downloadUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      success: true,
      buffer,
      title: info.title || urlOrQuery,
      format: 'mp3'
    };
  } catch (err) {
    console.error('Music download error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadMusic, searchAndDownload: downloadMusic };