const config = require('../../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const stickerProcessor = require('../../services/media/stickerProcessor');

// !sticker or !s — reply to an image or video.
async function handle(sock, msg, sender) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (!quoted) {
    return sock.sendMessage(sender, {
      text: `✧ *STICKER MAKER*
┌─⊶
│ Reply to an image or video with
│ ${config.prefix}sticker or ${config.prefix}s
└─────────────⊶`
    }, { quoted: msg });
  }

  const isImage = quoted.imageMessage;
  const isVideo = quoted.videoMessage;

  if (!isImage && !isVideo) {
    return sock.sendMessage(sender, {
      text: '❌ Please reply to an image or video!'
    }, { quoted: msg });
  }

  try {
    const mediaBuffer = await downloadMediaMessage(
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

    if (!mediaBuffer || !mediaBuffer.length) {
      throw new Error('Empty media');
    }

    const stickerBuffer = await stickerProcessor.createSticker(mediaBuffer, !!isVideo);

    await sock.sendMessage(sender, {
      sticker: stickerBuffer,
      stickerInfo: {
        pack: 'Incognito Bot',
        author: 'Incognito Bot',
        keepScale: true,
        cropPosition: 'center'
      }
    }, { quoted: msg });
  } catch (err) {
    console.error('Sticker command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to create sticker.'
    }, { quoted: msg });
  }
}

module.exports = { handle };