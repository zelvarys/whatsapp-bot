const config = require('../../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const compressor = require('../../services/media/mediaCompressor');
const { formatBytes } = require('../../utils/byteFormatter');

// !compress — reply to an image or video to compress it.
async function handle(sock, msg, sender) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  const hasMedia =
    msg.message?.imageMessage ||
    msg.message?.videoMessage ||
    (quoted && (quoted.imageMessage || quoted.videoMessage));

  if (!hasMedia) {
    return sock.sendMessage(sender, {
      text: `✧ *FILE COMPRESSOR*
┌─⊶ *Usage:*
│ Reply to any image/video with
│ ${config.prefix}compress
└─────────────⊶
▸ Reduces size by 50-80%`
    }, { quoted: msg });
  }

  const isImage = msg.message?.imageMessage || (quoted && quoted.imageMessage);
  const isVideo = msg.message?.videoMessage || (quoted && quoted.videoMessage);

  try {
    let originalBuffer;

    if (quoted) {
      originalBuffer = await downloadMediaMessage(
        {
          key: {
            remoteJid: sender,
            fromMe: false,
            id: ctx.stanzaId,
            participant: ctx.participant
          },
          message: quoted
        },
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage
        }
      );
    } else {
      originalBuffer = await downloadMediaMessage(
        {
          key: msg.key,
          message: msg.message
        },
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage
        }
      );
    }

    const originalSize = originalBuffer.length;

    const compressedBuffer = isImage
      ? await compressor.compressImage(originalBuffer)
      : await compressor.compressVideo(originalBuffer);

    const compressedSize = compressedBuffer.length;

    const caption = `✅ *${isImage ? 'Image' : 'Video'} Compressed!*

*Original:* ${formatBytes(originalSize)}
*Final size:* ${formatBytes(compressedSize)}`;

    await sock.sendMessage(sender, {
      [isImage ? 'image' : 'video']: compressedBuffer,
      caption
    }, { quoted: msg });
  } catch (err) {
    console.error('Compress command error:', err.message);

    const hint = err.message.includes('ffmpeg')
      ? '\n*Install FFmpeg in Termux*'
      : '';

    await sock.sendMessage(sender, {
      text: `❌ Compression failed!${hint}`
    }, { quoted: msg });
  }
}

module.exports = { handle };