const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const TEMP_DIR = path.join(__dirname, '../../../temp');
const TIMEOUT_MS = 30000;

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

  const filePath = path.join(TEMP_DIR, `ig_${Date.now()}.mp4`);
  await execPromise(`yt-dlp -o "${filePath}" "${url}"`, { timeout: 120000 });

  if (!fs.existsSync(filePath)) throw new Error('No output file');

  const buffer = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);

  return { success: true, buffer, title: 'Instagram Media', type: 'video/mp4' };
}

async function tryVercel(url) {
  const form = new URLSearchParams();
  form.append('url', url);

  const response = await axios.post(
    'https://instagram-downloader-api.vercel.app/download',
    form,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
      },
      timeout: TIMEOUT_MS
    }
  );

  if (!response.data || !response.data.media) throw new Error('No media');

  const mediaUrl = Array.isArray(response.data.media)
    ? response.data.media[0]
    : response.data.media;

  const media = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    timeout: TIMEOUT_MS
  });

  return {
    success: true,
    buffer: Buffer.from(media.data),
    title: 'Instagram Media',
    type: response.data.type || 'video'
  };
}

async function tryDavidCyril(url) {
  const api = `https://api.davidcyril.com/api/download/instagram?url=${encodeURIComponent(url)}`;
  const response = await axios.get(api, { timeout: TIMEOUT_MS });

  if (!response.data || !response.data.mediaUrl) throw new Error('No media');

  const media = await axios.get(response.data.mediaUrl, {
    responseType: 'arraybuffer',
    timeout: TIMEOUT_MS
  });

  return {
    success: true,
    buffer: Buffer.from(media.data),
    title: response.data.title || 'Instagram Media'
  };
}

async function download(url) {
  const attempts = [
    { name: 'yt-dlp', fn: () => downloadWithYtDlp(url) },
    { name: 'vercel', fn: () => tryVercel(url) },
    { name: 'davidcyril', fn: () => tryDavidCyril(url) }
  ];

  for (const attempt of attempts) {
    try {
      return await attempt.fn();
    } catch (err) {
      console.log(`Instagram download attempt "${attempt.name}" failed:`, err.message);
    }
  }

  return { success: false, error: 'All download methods failed' };
}

module.exports = { download };