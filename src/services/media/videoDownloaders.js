const axios = require('axios');
const ytdl = require('shadowx-ytdl');
const { download: ttdl } = require('@silent-tech-offc/ttdl');
const getFBInfo = require('@renpwn/fb-downloader');
const config = require('../../config');

// All video downloaders in one file. Each returns { success, buffer, title }.

async function youtube(url) {
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

async function tiktok(url) {
  try {
    const resolvedUrl = await expandTikTokShortUrl(url);

    const info = await ttdl(resolvedUrl);
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

async function expandTikTokShortUrl(url) {
  if (!url.includes('vt.tiktok.com') && !url.includes('vm.tiktok.com')) {
    return url;
  }

  try {
    const response = await axios.head(url, {
      maxRedirects: 0,
      timeout: 10000,
      validateStatus: (status) => status >= 300 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
      }
    });

    if (response.headers.location) return response.headers.location;
  } catch (err) {
    // Try GET fallback
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
      }
    });

    const finalUrl = response.request?.res?.responseUrl;
    if (finalUrl) return finalUrl;
  } catch (err) {
    // Fall through
  }

  return url;
}

async function facebook(url) {
  try {
    const info = await getFBInfo(url);

    if (!info) {
      throw new Error('No info returned');
    }

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

async function universal(url) {
  const trimmed = url.trim();

  if (config.youtubeRegex.test(trimmed)) {
    return youtube(trimmed);
  }

  if (config.tiktokRegex.test(trimmed)) {
    return tiktok(trimmed);
  }

  if (config.facebookRegex.test(trimmed)) {
    return facebook(trimmed);
  }

  return {
    success: false,
    error: 'Unsupported platform. Use YouTube, TikTok, or Facebook.'
  };
}

module.exports = { youtube, tiktok, facebook, universal };