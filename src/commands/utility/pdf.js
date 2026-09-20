const config = require('../../config');
const pdfConverter = require('../../services/media/pdfConverter');

// !pdf image — reply to an image
// !pdf text <content> — convert plain text
async function handle(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *PDF GENERATOR*
┌─⊶ *Usage:*
│• pdf image (reply to an image)
│• pdf text [your text]
└─────────────⊶`
    }, { quoted: msg });
  }

  const type = args[0].toLowerCase();

  if (type === 'image') {
    return imageToPdf(sock, msg, sender);
  }

  if (type === 'text') {
    const text = args.slice(1).join(' ');
    if (!text) {
      return sock.sendMessage(sender, {
        text: '❌ Please provide text!'
      }, { quoted: msg });
    }
    return textToPdf(sock, msg, sender, text);
  }

  return sock.sendMessage(sender, {
    text: '❌ Invalid type! Use "image" or "text"'
  }, { quoted: msg });
}

async function imageToPdf(sock, msg, sender) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  const hasImage = msg.message?.imageMessage || (quoted && quoted.imageMessage);

  if (!hasImage) {
    return sock.sendMessage(sender, {
      text: '❌ Reply to an image!'
    }, { quoted: msg });
  }

  try {
    const toDownload = quoted ? { message: quoted } : msg;
    const imageBuffer = await sock.downloadMediaMessage(toDownload);

    if (!imageBuffer || !imageBuffer.length) {
      throw new Error('Empty image');
    }

    const pdfBuffer = await pdfConverter.imageToPdf(imageBuffer);

    await sock.sendMessage(sender, {
      document: pdfBuffer,
      fileName: `image_${Date.now()}.pdf`,
      mimetype: 'application/pdf'
    }, { quoted: msg });
  } catch (err) {
    console.error('PDF image error:', err.message);
    await sock.sendMessage(sender, {
      text: `❌ Conversion failed: ${err.message}`
    }, { quoted: msg });
  }
}

async function textToPdf(sock, msg, sender, text) {
  try {
    const pdfBuffer = await pdfConverter.textToPdf(text);

    await sock.sendMessage(sender, {
      document: pdfBuffer,
      fileName: `text_${Date.now()}.pdf`,
      mimetype: 'application/pdf'
    }, { quoted: msg });
  } catch (err) {
    console.error('PDF text error:', err.message);
    await sock.sendMessage(sender, {
      text: `❌ Error creating PDF: ${err.message}`
    }, { quoted: msg });
  }
}

module.exports = { handle };