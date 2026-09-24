const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execFilePromise = util.promisify(execFile);

const TEMP_DIR = path.join(__dirname, '../../../temp');
const TIMEOUT_MS = 300000;

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function findNewestFile(dir, pattern) {
  const files = fs.readdirSync(dir)
    .filter((f) => pattern.test(f))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  return files.length ? path.join(dir, files[0].f) : null;
}

async function downloadVideo(url) {
  ensureTemp();

  const template = path.join(TEMP_DIR, `yt_${Date.now()}_%(id)s.%(ext)s`);

  const args = [
    '--extractor-args', 'youtube:player_client=tv,mweb,web_safari',
    '--js-runtimes', 'deno',
    '--downloader', 'ffmpeg',
    '-f', 'bv*[height<=720]+ba/b[height<=720]',
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '--no-warnings',
    '-o', template,
    url
  ];

  try {
    await execFilePromise('yt-dlp', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

    const file = findNewestFile(TEMP_DIR, /^yt_.*\.(mp4|mkv|webm)$/);
    if (!file) throw new Error('yt-dlp produced no output file');

    const buffer = fs.readFileSync(file);
    fs.unlinkSync(file);

    return { success: true, buffer, title: 'YouTube Video', type: 'video/mp4' };
  } catch (err) {
    console.error('yt-dlp video error:', err.message);
    return { success: false, error: 'YouTube download failed' };
  }
}

async function downloadAudio(url) {
  ensureTemp();

  const template = path.join(TEMP_DIR, `yt_${Date.now()}_%(id)s.%(ext)s`);

  const args = [
    '--extractor-args', 'youtube:player_client=tv,mweb,web_safari',
    '--js-runtimes', 'deno',
    '--downloader', 'ffmpeg',
    '-x', '--audio-format', 'mp3', '--audio-quality', '128k',
    '--no-playlist',
    '--no-warnings',
    '-o', template,
    url
  ];

  try {
    await execFilePromise('yt-dlp', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

    const file = findNewestFile(TEMP_DIR, /^yt_.*\.mp3$/);
    if (!file) throw new Error('yt-dlp produced no mp3');

    const buffer = fs.readFileSync(file);
    fs.unlinkSync(file);

    return { success: true, buffer, title: 'Downloaded Audio', format: 'mp3' };
  } catch (err) {
    console.error('yt-dlp audio error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadVideo, downloadAudio };