const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Converts an image or video buffer into a WebP sticker.
// Videos use only the first frame.

const TEMP_DIR = path.join(__dirname, '../../../temp');

async function createSticker(mediaBuffer, isVideo) {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

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

module.exports = { createSticker };