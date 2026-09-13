const axios = require('axios');

class TTSService {
  constructor(sock) {
    this.sock = sock;
  }
  
  async textToSpeech(sender, userJid, msg, fullText, config) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `✧ *TEXT TO SPEECH*
┌─⊶
│ *Usage:* ${config.prefix}tts [text]
│ *Max:* 200 characters
└─────────────⊶`
      }, { quoted: msg });
      return;
    }
    
    if (fullText.length > 200) {
      await this.sock.sendMessage(sender, {
        text: '❌ Text too long! Keep it under 200 characters.'
      }, { quoted: msg });
      return;
    }
    
    try {
      const processingMsg = await this.sock.sendMessage(sender, {
        text: '🎤 *Generating speech...*'
      });
      
      const textToSpeak = fullText;
      const encodedText = encodeURIComponent(textToSpeak);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&ttsspeed=1&q=${encodedText}`;
      
      const response = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://translate.google.com/'
        }
      });
      
      if (response.status === 200) {
        await this.sock.sendMessage(sender, {
          audio: response.data,
          mimetype: 'audio/mpeg',
          ptt: true
        });
        
        try {
          await this.sock.sendMessage(sender, { delete: processingMsg.key });
        } catch (e) {}
      } else {
        throw new Error('TTS service returned error');
      }
      
    } catch (error) {
      console.error('TTS error:', error);
      
      try {
        if (processingMsg && processingMsg.key) {
          await this.sock.sendMessage(sender, { delete: processingMsg.key });
        }
      } catch (e) {}
      
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to generate speech.'
      });
    }
  }
}

module.exports = TTSService;