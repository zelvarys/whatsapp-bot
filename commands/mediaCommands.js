const config = require('../config');
const MediaDownloader = require('../utils/mediaDownloader');

class MediaCommands {
  constructor(sock) {
    this.sock = sock;
  }
  
  async downloadMedia(sender, userJid, msg, fullText) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `❌ Please provide a URL!\n*Usage:* ${config.prefix}download [url]`
      }, { quoted: msg });
      return;
    }
    
    const url = fullText.trim();
    
    try {
      const result = await MediaDownloader.downloadMedia(url);
      
      if (!result.success) {
        throw new Error(result.error || 'Download failed');
      }
      
      await this.sock.sendMessage(sender, {
        video: result.buffer,
        caption: `┌─⊶✧ *Downloaded Media*
│ ${result.title ? `*Title:* ${result.title.slice(0,20) + '...'}\n` : ''}${result.author ? `*Author:* ${result.author}\n` : ''}
└─────────────⊶
▸ _Downloaded via ${config.botName}_`,
        mimetype: 'video/mp4'
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Download error:', error);
      await this.sock.sendMessage(sender, {
        text: `❌ Download failed! Try a different link or platform.`
      }, { quoted: msg });
    }
  }
  
  async downloadYouTube(sender, userJid, msg, fullText) {
    await this.downloadMedia(sender, userJid, msg, fullText);
  }
  
  async downloadInstagram(sender, userJid, msg, fullText) {
    await this.downloadMedia(sender, userJid, msg, fullText);
  }
  
  async downloadTikTok(sender, userJid, msg, fullText) {
    await this.downloadMedia(sender, userJid, msg, fullText);
  }
}

module.exports = MediaCommands;