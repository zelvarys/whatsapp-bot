const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Compresses images and videos. Image path uses JPEG quality,
// video path re-encodes with libx264 at reduced resolution.

const TEMP_DIR = path.join(__dirname, '../../../temp');

async function compressImage(inputBuffer) {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

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
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

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

module.exports = { compressImage, compressVideo };