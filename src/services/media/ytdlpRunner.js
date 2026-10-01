const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const execFilePromise = util.promisify(execFile);

const TEMP_DIR = path.join(__dirname, '../../../temp');
const TIMEOUT_MS = 300000;

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Every invocation gets its own folder. Without this, two simultaneous
// downloads would race each other in the shared temp directory and one
// could return the other's file.
function makeWorkDir() {
  ensureTemp();
  const token = crypto.randomBytes(6).toString('hex');
  const dir = path.join(TEMP_DIR, `yt_${Date.now()}_${token}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Nothing to do — OS will clean up eventually.
  }
}

function findOutput(dir, extension) {
  const entries = fs.readdirSync(dir);
  const match = entries.find((f) => f.endsWith(extension));
  return match ? path.join(dir, match) : null;
}

async function downloadVideo(url) {
  const workDir = makeWorkDir();
  const template = path.join(workDir, 'video.%(ext)s');

  const args = [
    '--extractor-args', 'youtube:player_client=tv,mweb,web_safari',
    '--js-runtimes', 'deno',
    '-f', 'bv*[height<=720]+ba/b[height<=720]',
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '--no-warnings',
    '-o', template,
    url
  ];

  try {
    await execFilePromise('yt-dlp', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

    const file = findOutput(workDir, '.mp4') || findOutput(workDir, '.mkv') || findOutput(workDir, '.webm');
    if (!file) throw new Error('yt-dlp produced no output file');

    const buffer = fs.readFileSync(file);

    return { success: true, buffer, title: 'YouTube Video', type: 'video/mp4' };
  } catch (err) {
    console.error('yt-dlp video error:', err.message);
    return { success: false, error: 'YouTube download failed' };
  } finally {
    cleanupDir(workDir);
  }
}

async function downloadAudio(url) {
  const workDir = makeWorkDir();
  const template = path.join(workDir, 'audio.%(ext)s');

  const args = [
    '--extractor-args', 'youtube:player_client=tv,mweb,web_safari',
    '--js-runtimes', 'deno',
    '-x', '--audio-format', 'mp3', '--audio-quality', '128k',
    '--no-playlist',
    '--no-warnings',
    '-o', template,
    url
  ];

  try {
    await execFilePromise('yt-dlp', args, { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });

    const file = findOutput(workDir, '.mp3');
    if (!file) throw new Error('yt-dlp produced no mp3');

    const buffer = fs.readFileSync(file);

    return { success: true, buffer, title: 'Downloaded Audio', format: 'mp3' };
  } catch (err) {
    console.error('yt-dlp audio error:', err.message);
    return { success: false, error: 'Music download failed' };
  } finally {
    cleanupDir(workDir);
  }
}

module.exports = { downloadVideo, downloadAudio };