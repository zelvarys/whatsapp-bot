const getFBInfo = require('@renpwn/fb-downloader');

// Downloads Facebook video (SD quality, generally within 720p).
async function download(url) {
  try {
    const info = await getFBInfo(url);

    if (!info) {
      throw new Error('No info returned');
    }

    // Prefer SD to stay within the 720p cap.
    const videoUrl = info.sd || info.hd;

    if (!videoUrl) {
      throw new Error('No downloadable URL');
    }

    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      success: true,
      buffer,
      title: info.title || 'Facebook Video',
      type: 'video/mp4'
    };
  } catch (err) {
    console.error('Facebook download error:', err.message);
    return { success: false, error: 'Facebook download failed' };
  }
}

module.exports = { download };