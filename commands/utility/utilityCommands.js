const config = require('../../config');
const fs = require('fs');
const PDFGenerator = require('./pdfGenerator');
const FileProcessor = require('./fileProcessor');
const QRGenerator = require('./qrGenerator');
const TTSService = require('./ttsService');

class UtilityCommands {
  constructor(sock) {
    this.sock = sock;
    this.pdfGenerator = new PDFGenerator(sock);
    this.fileProcessor = new FileProcessor(sock);
    this.qrGenerator = new QRGenerator(sock);
    this.ttsService = new TTSService(sock);
  }
  
  async createSticker(sender, userJid, msg) {
    await this.fileProcessor.createSticker(sender, userJid, msg, config);
  }
  
  async pdf(sender, userJid, msg, args, fullText) {
    try {
      if (args.length === 0) {
        await this.sock.sendMessage(sender, {
          text: `✧ *PDF GENERATOR*
┌─⊶ *Usage:*
│• pdf image (reply)
│• pdf text [your text]
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      const type = args[0].toLowerCase();
      
      if (type === 'image') {
        await this.pdfGenerator.imageToPdf(sender, userJid, msg, config);
      } else if (type === 'text') {
        const text = args.slice(1).join(' ');
        if (!text) {
          await this.sock.sendMessage(sender, {
            text: '❌ Please provide text!'
          }, { quoted: msg });
          return;
        }
        await this.pdfGenerator.textToPdf(sender, userJid, msg, text, config);
      } else {
        await this.sock.sendMessage(sender, {
          text: '❌ Invalid type! Use "image" or "text"'
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('PDF command error:', error);
      await this.sock.sendMessage(sender, {
        text: `❌ Error creating PDF: ${error.message}`
      }, { quoted: msg });
    }
  }
  
  async compressFile(sender, userJid, msg) {
    await this.fileProcessor.compressFile(sender, userJid, msg, config);
  }
  
  async generateQRCode(sender, userJid, msg, fullText) {
    await this.qrGenerator.generateQRCode(sender, userJid, msg, fullText, config);
  }
  
  async revealViewOnce(sender, userJid, msg) {
    await this.fileProcessor.revealViewOnce(sender, userJid, msg, config);
  }
  
  async textToSpeech(sender, userJid, msg, fullText) {
    await this.ttsService.textToSpeech(sender, userJid, msg, fullText, config);
  }
  
  async summarizeMessages(sender, userJid, msg, args) {
    try {
      let limit = args[0] ? parseInt(args[0]) : 20;
      
      if (!global.chatHistory || !global.chatHistory[sender]) {
        await this.sock.sendMessage(sender, {
          text: '❌ No chat history found.'
        }, { quoted: msg });
        return;
      }
      
      const messages = global.chatHistory[sender].slice(-limit);
      
      if (messages.length < 3) {
        await this.sock.sendMessage(sender, {
          text: `❌ Only ${messages.length} messages. Need at least 3.`
        }, { quoted: msg });
        return;
      }
      
      const conversation = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      
      const AIService = require('../../utils/generative/aiService');
      const summary = await AIService.getGeminiAIResponse(
        `Summarize this chat conversation in 3-5 key points:\n\n${conversation}`,
        userJid
      );
      
      await this.sock.sendMessage(sender, {
        text: `✧ *CHAT SUMMARY* (${messages.length} messages)
╒═════════════════════╕

${summary}

╘═════════════════════╛
▸ _Powered by ${config.botName}_`
      });
      
    } catch (error) {
      console.error('Summary error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to summarize.'
      }, { quoted: msg });
    }
  }
}

module.exports = UtilityCommands;