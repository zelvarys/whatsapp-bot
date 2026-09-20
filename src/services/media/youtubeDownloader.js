const ytdl = require('shadowx-ytdl');

// Downloads YouTube video at max 720p. Pure JavaScript — no yt-dlp.
async function download(url) {
  try {
    const info = await ytdl.downloadVideo(url, 720);

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
      title: info.title || 'YouTube Video',
      type: 'video/mp4'
    };
  } catch (err) {
    console.error('YouTube download error:', err.message);
    return { success: false, error: 'YouTube download failed' };
  }
}

module.exports = { download };