const config = require('../../config');
const qrCodeGenerator = require('../../services/external/qrCodeGenerator');

// !qrcode <text>
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *QR CODE GENERATOR*
┌─⊶ *Examples:*
│ ${config.prefix}qrcode https://google.com
│ ${config.prefix}qrcode Hello World
└─────────────⊶
▸ *Usage:* ${config.prefix}qrcode [text/url]`
    }, { quoted: msg });
  }

  try {
    const qrBuffer = await qrCodeGenerator.generate(fullText);

    await sock.sendMessage(sender, {
      image: qrBuffer,
      caption: `*Content:* ${fullText.substring(0, 100)}${fullText.length > 100 ? '...' : ''}`
    }, { quoted: msg });
  } catch (err) {
    console.error('QRCode command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to generate QR code'
    }, { quoted: msg });
  }
}

module.exports = { handle };