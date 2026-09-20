const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Generates a voice note. Google's translate TTS returns MP3,
// which WhatsApp doesn't like as a PTT. We convert to OGG/Opus.

const TEMP_DIR = path.join(__dirname, '../../../temp');

function buildTtsUrl(text) {
  const encoded = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&ttsspeed=1&q=${encoded}`;
}

async function fetchMp3(text) {
  const response = await axios.get(buildTtsUrl(text), {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
      Accept: '*/*'
    }
  });

  if (response.status !== 200 || !response.data) {
    throw new Error('TTS service returned no data');
  }

  return Buffer.from(response.data);
}

async function convertToOggOpus(mp3Buffer) {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const stamp = Date.now();
  const mp3Path = path.join(TEMP_DIR, `tts_${stamp}.mp3`);
  const oggPath = path.join(TEMP_DIR, `tts_${stamp}.ogg`);

  fs.writeFileSync(mp3Path, mp3Buffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(mp3Path)
        .audioCodec('libopus')
        .format('ogg')
        .outputOptions([
          '-avoid_negative_ts', 'make_zero',
          '-ac', '1',
          '-ar', '48000',
          '-b:a', '64k'
        ])
        .output(oggPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return fs.readFileSync(oggPath);
  } finally {
    try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch {}
    try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
  }
}

async function generateVoiceNote(text) {
  const mp3 = await fetchMp3(text);
  const ogg = await convertToOggOpus(mp3);
  return ogg;
}

module.exports = { generateVoiceNote };