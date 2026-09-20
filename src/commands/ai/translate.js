const config = require('../../config');
const translationEngine = require('../../services/ai/translationEngine');

// !translate (reply to a message)
async function handle(sock, msg, sender, userJid, args) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (!quoted) {
    return sock.sendMessage(sender, {
      text: `✧ *TRANSLATION*
┌─⊶
│ Reply with ${config.prefix}translate
│ I'll translate it to English.
└─────────────⊶`
    }, { quoted: msg });
  }

  let textToTranslate = '';

  if (quoted.conversation) textToTranslate = quoted.conversation;
  else if (quoted.extendedTextMessage?.text) textToTranslate = quoted.extendedTextMessage.text;
  else if (quoted.imageMessage?.caption) textToTranslate = quoted.imageMessage.caption;
  else if (quoted.videoMessage?.caption) textToTranslate = quoted.videoMessage.caption;
  else if (quoted.documentMessage?.caption) textToTranslate = quoted.documentMessage.caption;

  if (!textToTranslate || !textToTranslate.trim()) {
    return sock.sendMessage(sender, {
      text: '❌ The replied message has no text to translate!'
    }, { quoted: msg });
  }

  if (textToTranslate.length > 1000) {
    textToTranslate = textToTranslate.substring(0, 1000) + '...';
  }

  const result = await translationEngine.translateToEnglish(textToTranslate, userJid);

  if (result.success) {
    await sock.sendMessage(sender, {
      text: `*Original:* ${textToTranslate}\n*English:* ${result.translation}`
    }, { quoted: msg });
  } else {
    await sock.sendMessage(sender, {
      text: `❌ Translation failed: ${result.error}`
    }, { quoted: msg });
  }
}

module.exports = { handle };