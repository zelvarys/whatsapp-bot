const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const TEMP_DIR = path.join(__dirname, '../../../temp');
const YTDLP_TIMEOUT_MS = 180000;
const API_TIMEOUT_MS = 15000;

async function hasYtDlp() {
  try {
    await execPromise('which yt-dlp');
    return true;
  } catch {
    return false;
  }
}

async function downloadWithYtDlp(query) {
  if (!(await hasYtDlp())) throw new Error('yt-dlp not installed');
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const filePath = path.join(TEMP_DIR, `audio_${Date.now()}.mp3`);

  const source = query.includes('http')
    ? query
    : `ytsearch1:${query}`;

  const cmd = `yt-dlp -x --audio-format mp3 --audio-quality 128k -o "${filePath}" "${source}"`;
  await execPromise(cmd, { timeout: YTDLP_TIMEOUT_MS });

  if (!fs.existsSync(filePath)) throw new Error('No output file');

  const buffer = fs.readFileSync(filePath);
  fs.unlinkSync(filePath);

  return {
    success: true,
    buffer,
    title: query,
    format: 'mp3'
  };
}

async function trySimpleApis(query) {
  const endpoints = [
    `https://api.davidcyril.com/api/download/youtube?url=${encodeURIComponent(query)}`
  ];

  for (const api of endpoints) {
    try {
      const response = await axios.get(api, { timeout: API_TIMEOUT_MS });
      const data = response.data;

      let downloadUrl = null;
      let title = 'Downloaded Music';

      if (data.videoUrl) {
        downloadUrl = data.videoUrl;
        title = data.title || title;
      } else if (data.link) {
        downloadUrl = data.link;
        title = data.title || title;
      } else if (data.downloadUrl) {
        downloadUrl = data.downloadUrl;
        title = data.title || title;
      }

      if (!downloadUrl) continue;

      const audio = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });

      return {
        success: true,
        buffer: Buffer.from(audio.data),
        title,
        format: 'mp3'
      };
    } catch (err) {
      continue;
    }
  }

  throw new Error('No API returned a download URL');
}

async function searchAndDownload(query) {
  try {
    return await downloadWithYtDlp(query);
  } catch (err) {
    console.log('yt-dlp failed, trying APIs:', err.message);
  }

  try {
    return await trySimpleApis(query);
  } catch (err) {
    console.log('APIs failed:', err.message);
  }

  return { success: false, error: 'Download failed' };
}

async function downloadMusic(urlOrQuery) {
  if (urlOrQuery.includes('http')) {
    try {
      return await downloadWithYtDlp(urlOrQuery);
    } catch (err) {
      console.log('Direct URL download failed:', err.message);
    }
  }

  return searchAndDownload(urlOrQuery);
}

module.exports = { downloadMusic, searchAndDownload };