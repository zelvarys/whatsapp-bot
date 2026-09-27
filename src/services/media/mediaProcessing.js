const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const QRCode = require('qrcode');
const config = require('../../config');

const TEMP_DIR = path.join(__dirname, '../../../temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// -------------------- Sticker --------------------

async function createSticker(mediaBuffer, isVideo) {
  ensureTemp();

  const stamp = Date.now();
  const inputExt = isVideo ? 'mp4' : 'jpg';
  const inputPath = path.join(TEMP_DIR, `sticker_input_${stamp}.${inputExt}`);
  const outputPath = path.join(TEMP_DIR, `sticker_output_${stamp}.webp`);

  fs.writeFileSync(inputPath, mediaBuffer);

  try {
    await new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputPath);

      if (isVideo) cmd.inputOptions(['-frames:v 1']);

      cmd
        .outputOptions([
          '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
          '-lossless', '0',
          '-quality', '75',
          '-compression_level', '6'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return fs.readFileSync(outputPath);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
}

// -------------------- Compression --------------------

async function compressImage(inputBuffer) {
  ensureTemp();

  const stamp = Date.now();
  const inputPath = path.join(TEMP_DIR, `img_in_${stamp}.jpg`);
  const outputPath = path.join(TEMP_DIR, `img_out_${stamp}.jpg`);

  fs.writeFileSync(inputPath, inputBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions(['-q:v 30', '-compression_level 6'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return fs.readFileSync(outputPath);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
}

async function compressVideo(inputBuffer) {
  ensureTemp();

  const stamp = Date.now();
  const inputPath = path.join(TEMP_DIR, `vid_in_${stamp}.mp4`);
  const outputPath = path.join(TEMP_DIR, `vid_out_${stamp}.mp4`);

  fs.writeFileSync(inputPath, inputBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-crf 28', '-preset faster', '-vf scale=640:-2'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return fs.readFileSync(outputPath);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
}

// -------------------- View-once reveal --------------------

async function revealAndSend(sock, chatJid, mediaBuffer, isVideo, quotedMsg) {
  if (isVideo) {
    return sock.sendMessage(chatJid, { video: mediaBuffer }, { quoted: quotedMsg });
  }
  return sock.sendMessage(chatJid, { image: mediaBuffer }, { quoted: quotedMsg });
}

// -------------------- QR code --------------------

async function generateQrCode(text) {
  return QRCode.toBuffer(text, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

module.exports = {
  createSticker,
  compressImage,
  compressVideo,
  revealAndSend,
  generateQrCode
};