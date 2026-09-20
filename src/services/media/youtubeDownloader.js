const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Downloads YouTube videos. Tries yt-dlp first (best quality),
// then a sequence of public APIs.

const TEMP_DIR = path.join(__dirname, '../../../temp');
const MAX_HEIGHT = 720;
const YTDLP_TIMEOUT_MS = 120000;
const API_TIMEOUT_MS = 30000;

async function hasYtDlp() {
  try {
    await execPromise('which yt-dlp');
    return true;
  } catch {
    return false;
  }
}

async function downloadWithYtDlp(url) {
  if (!(await hasYtDlp())) throw new Error('yt-dlp not installed');

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const filePath = path.join(TEMP_DIR, `video_${Date.now()}.mp4`);

  const infoCmd = `yt-dlp --get-title "${url}"`;
  const info = await execPromise(infoCmd);
  const title = info.stdout.split('\n')[0] || 'Downloaded Video';

  const downloadCmd = `yt-dlp -f "best[height<=${MAX_HEIGHT}]" --merge-output-format mp4 --output "${filePath}" "${url}"`;
  await execPromise(downloadCmd, { timeout: YTDLP_TIMEOUT_MS });

  if (!fs.existsSync(filePath)) throw new Error('yt-dlp did not produce a file');

  const buffer = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);

  return {
    success: true,
    buffer,
    title,
    type: 'video/mp4'
  };
}

async function tryY2Mate(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^"&?\/\s]{11})/);
  if (!match) throw new Error('Invalid YouTube URL');

  const videoId = match[1];
  const form = new URLSearchParams();
  form.append('url', `https://www.youtube.com/watch?v=${videoId}`);

  const response = await axios.post('https://api.y2mate.guru/api/convert', form, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    },
    timeout: API_TIMEOUT_MS
  });

  if (!response.data || !response.data.url) throw new Error('y2mate returned no URL');

  const video = await axios.get(response.data.url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: 100 * 1024 * 1024
  });

  return {
    success: true,
    buffer: Buffer.from(video.data),
    title: response.data.title || 'YouTube Video',
    author: response.data.author || 'Unknown'
  };
}

async function tryVercelApi(url) {
  const api = `https://video-downloader-api.vercel.app/download?url=${encodeURIComponent(url)}`;
  const response = await axios.get(api, { timeout: API_TIMEOUT_MS });

  if (!response.data || !response.data.downloadUrl) throw new Error('No URL');

  const video = await axios.get(response.data.downloadUrl, {
    responseType: 'arraybuffer',
    timeout: 60000
  });

  return {
    success: true,
    buffer: Buffer.from(video.data),
    title: response.data.title || 'YouTube Video'
  };
}

async function tryDavidCyril(url) {
  const api = `https://api.davidcyril.com/api/download/youtube?url=${encodeURIComponent(url)}`;
  const response = await axios.get(api, { timeout: API_TIMEOUT_MS });

  if (!response.data || !response.data.videoUrl) throw new Error('No URL');

  const video = await axios.get(response.data.videoUrl, {
    responseType: 'arraybuffer',
    timeout: 60000
  });

  return {
    success: true,
    buffer: Buffer.from(video.data),
    title: response.data.title || 'YouTube Video'
  };
}

async function download(url) {
  const attempts = [
    { name: 'yt-dlp', fn: () => downloadWithYtDlp(url) },
    { name: 'y2mate', fn: () => tryY2Mate(url) },
    { name: 'vercel', fn: () => tryVercelApi(url) },
    { name: 'davidcyril', fn: () => tryDavidCyril(url) }
  ];

  for (const attempt of attempts) {
    try {
      return await attempt.fn();
    } catch (err) {
      console.log(`YouTube download attempt "${attempt.name}" failed:`, err.message);
    }
  }

  return { success: false, error: 'All download methods failed' };
}

module.exports = { download };