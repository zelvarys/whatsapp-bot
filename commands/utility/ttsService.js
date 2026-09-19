const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

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
    
    const tempDir = './temp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const timestamp = Date.now();
    const mp3Path = path.join(tempDir, `tts_${timestamp}.mp3`);
    const oggPath = path.join(tempDir, `tts_${timestamp}.ogg`);
    
    try {
      const encodedText = encodeURIComponent(fullText);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&ttsspeed=1&q=${encodedText}`;
      
      const response = await axios.get(ttsUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
          'Accept': '*/*'
        }
      });
      
      if (response.status !== 200 || !response.data) {
        throw new Error('TTS service returned error');
      }
      
      fs.writeFileSync(mp3Path, Buffer.from(response.data));
      
      await new Promise((resolve, reject) => {
        ffmpeg(mp3Path)
          .audioCodec('libopus')
          .format('ogg')
          .outputOptions([
            '-avoid_negative_ts', 'make_zero',
            '-ac', '1',
            '-ar', '48000',
            '-b:a', '64k'
          ])
          .output(oggPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      const oggBuffer = fs.readFileSync(oggPath);
      
      await this.sock.sendMessage(sender, {
        audio: oggBuffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: msg });
      
    } catch (error) {
      console.error('TTS error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to generate speech.'
      }, { quoted: msg });
    } finally {
      try { if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path); } catch {}
      try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
    }
  }
}

module.exports = TTSService;