const { download: ttdl } = require('@silent-tech-offc/ttdl');

// Downloads TikTok video (no watermark). 
async function download(url) {
  try {
    const info = await ttdl(url);
    const videoUrl = info.videoNoWatermark || info.videoWatermark;

    if (!videoUrl) {
      throw new Error('No video URL in response');
    }

    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      success: true,
      buffer,
      title: info.title || 'TikTok Video',
      author: info.author || 'TikTok User',
      type: 'video/mp4'
    };
  } catch (err) {
    console.error('TikTok download error:', err.message);
    return { success: false, error: 'TikTok download failed' };
  }
}

module.exports = { download };