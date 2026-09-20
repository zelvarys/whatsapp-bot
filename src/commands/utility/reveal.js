const config = require('../../config');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

// !reveal or !vv — reply to a view-once image/video.
async function handle(sock, msg, sender) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (!quoted) {
    return sock.sendMessage(sender, {
      text: `✧ *REVEAL VIEW-ONCE*
┌─⊶
│ Reply to a view-once image/video
│ with ${config.prefix}reveal or ${config.prefix}vv
└─────────────⊶`
    }, { quoted: msg });
  }

  const isViewOnceImage = quoted.imageMessage?.viewOnce;
  const isViewOnceVideo = quoted.videoMessage?.viewOnce;

  if (!isViewOnceImage && !isViewOnceVideo) {
    return sock.sendMessage(sender, {
      text: '❌ The replied message is not a view-once media'
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
      throw new Error('Downloaded media is empty');
    }

    if (isViewOnceImage) {
      await sock.sendMessage(sender, { image: mediaBuffer }, { quoted: msg });
    } else {
      await sock.sendMessage(sender, { video: mediaBuffer }, { quoted: msg });
    }
  } catch (err) {
    console.error('Reveal command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to reveal media.\nIt may have expired or been deleted.'
    }, { quoted: msg });
  }
}

module.exports = { handle };