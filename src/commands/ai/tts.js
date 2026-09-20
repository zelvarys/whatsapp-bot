const config = require('../../config');
const ttsEngine = require('../../services/media/textToSpeechEngine');

// !tts <text>
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *TEXT TO SPEECH*
┌─⊶
│ *Usage:* ${config.prefix}tts [text]
│ *Max:* ${config.ttsMaxLength} characters
└─────────────⊶`
    }, { quoted: msg });
  }

  if (fullText.length > config.ttsMaxLength) {
    return sock.sendMessage(sender, {
      text: `❌ Text too long! Keep it under ${config.ttsMaxLength} characters.`
    }, { quoted: msg });
  }

  try {
    const voiceNote = await ttsEngine.generateVoiceNote(fullText);

    await sock.sendMessage(sender, {
      audio: voiceNote,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: msg });
  } catch (err) {
    console.error('TTS command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to generate speech.'
    }, { quoted: msg });
  }
}

module.exports = { handle };