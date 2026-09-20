const config = require('../../config');
const viewOnceRevealer = require('../../services/media/viewOnceRevealer');

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
    const mediaMsg = {
      message: quoted,
      key: {
        remoteJid: sender,
        fromMe: false,
        id: ctx.stanzaId
      }
    };

    const mediaBuffer = await sock.downloadMediaMessage(mediaMsg);

    await viewOnceRevealer.revealAndSend(sock, sender, mediaBuffer, !!isViewOnceVideo, msg);
  } catch (err) {
    console.error('Reveal command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to reveal media.\nIt may have expired or been deleted.'
    }, { quoted: msg });
  }
}

module.exports = { handle };