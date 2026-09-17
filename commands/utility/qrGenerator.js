const QRCode = require('qrcode');

class QRGenerator {
  constructor(sock) {
    this.sock = sock;
  }
  
  async generateQRCode(sender, userJid, msg, fullText, config) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `✧ *QR CODE GENERATOR*
┌─⊶ *Examples:*
│ ${config.prefix}qrcode https://google.com
│ ${config.prefix}qrcode Hello World
└─────────────⊶
▸ *Usage:* ${config.prefix}qrcode [text/url]`
      }, { quoted: msg });
      return;
    }
    
    try {
      const processingMsg = await this.sock.sendMessage(sender, {
        text: '🔳 *Generating QR code...*'
      });
      
      const qrBuffer = await QRCode.toBuffer(fullText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      await this.sock.sendMessage(sender, {
        image: qrBuffer,
        caption: `*Content:* ${fullText.substring(0, 100)}${fullText.length > 100 ? '...' : ''}`
      }, { quoted: msg });
      
      try {
        await this.sock.sendMessage(sender, { delete: processingMsg.key });
      } catch (e) {}
      
    } catch (error) {
      console.error('QR Code error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to generate QR code'
      });
    }
  }
}

module.exports = QRGenerator;