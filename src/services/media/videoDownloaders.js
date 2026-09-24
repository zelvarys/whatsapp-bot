const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const { download: ttdl } = require('@silent-tech-offc/ttdl');
const getFBInfo = require('@renpwn/fb-downloader');
const config = require('../../config');

// -------------------- YouTube --------------------

async function youtube(url) {
  try {
    const info = await ytdl.getInfo(url);

    // 720p cap, prefer mp4 with audio.
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: (f) => f.hasVideo && f.hasAudio && f.height && f.height <= 720
    }) || ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: 'audioandvideo'
    });

    if (!format) {
      throw new Error('No suitable format found');
    }

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      ytdl.downloadFromInfo(info, { format })
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });

    return {
      success: true,
      buffer,
      title: info.videoDetails?.title || 'YouTube Video',
      author: info.videoDetails?.author?.name || 'Unknown',
      type: 'video/mp4'
    };
  } catch (err) {
    console.error('YouTube download error:', err.message);
    return { success: false, error: 'YouTube download failed' };
  }
}

// -------------------- TikTok --------------------

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

// -------------------- Facebook --------------------

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

// -------------------- Universal dispatcher --------------------

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