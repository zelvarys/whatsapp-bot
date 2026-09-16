const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

class FileProcessor {
  constructor(sock) {
    this.sock = sock;
  }
  
  async createSticker(sender, userJid, msg, config) {
    try {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        await this.sock.sendMessage(sender, {
          text: `✧ *STICKER MAKER*
┌─⊶
│ Reply to an image or video with
│ ${config.prefix}sticker or ${config.prefix}s
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      const isImage = quotedMsg.imageMessage;
      const isVideo = quotedMsg.videoMessage;
      
      if (!isImage && !isVideo) {
        await this.sock.sendMessage(sender, {
          text: '❌ Please reply to an image or video!'
        }, { quoted: msg });
        return;
      }
      
      const processingMsg = await this.sock.sendMessage(sender, {
        text: '🎨 *Creating sticker...*'
      });
      
      const messageToDownload = { message: quotedMsg };
      const downloadedData = await this.sock.downloadMediaMessage(messageToDownload);
      
      const mediaBuffer = await this.ensureBuffer(downloadedData);
      
      if (!mediaBuffer || mediaBuffer.length === 0) {
        throw new Error('Downloaded media is empty');
      }
      
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const tempInputPath = path.join(tempDir, `sticker_input_${timestamp}.${isImage ? 'jpg' : 'mp4'}`);
      const tempOutputPath = path.join(tempDir, `sticker_output_${timestamp}.webp`);
      
      fs.writeFileSync(tempInputPath, mediaBuffer);
      
      await new Promise((resolve, reject) => {
        const command = ffmpeg(tempInputPath);
        
        if (isVideo) {
          command.inputOptions(['-frames:v 1']);
        }
        
        command
          .outputOptions([
            '-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512',
            '-lossless', '0',
            '-quality', '75',
            '-compression_level', '6'
          ])
          .output(tempOutputPath)
          .on('end', resolve)
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .run();
      });
      
      const stickerBuffer = fs.readFileSync(tempOutputPath);
      
      try {
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      await this.sock.sendMessage(sender, {
        sticker: stickerBuffer,
        stickerInfo: {
          pack: "Incognito Bot",
          author: "Incognito Bot",
          keepScale: true,
          cropPosition: "center"
        }
      }, { quoted: msg });
      
      try {
        if (processingMsg && processingMsg.key) {
          await this.sock.sendMessage(sender, { delete: processingMsg.key });
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('Sticker creation error:', error);
      
      try {
        if (processingMsg && processingMsg.key) {
          await this.sock.sendMessage(sender, { delete: processingMsg.key });
        }
      } catch (e) {}
      
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to create sticker.'
      }, { quoted: msg });
    }
  }
  
  async compressFile(sender, userJid, msg, config) {
    let processingMsg;
    try {
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const hasMedia = msg.message?.imageMessage || 
                      msg.message?.videoMessage ||
                      (quotedMsg && (quotedMsg.imageMessage || quotedMsg.videoMessage));
      
      if (!hasMedia) {
        await this.sock.sendMessage(sender, {
          text: `✧ *FILE COMPRESSOR*
┌─⊶ *Usage:*
│ Reply to any image/video with
│ !compress
└─────────────⊶
▸  Reduces size by 50-80%`
        }, { quoted: msg });
        return;
      }
      
      const isImage = msg.message?.imageMessage || (quotedMsg && quotedMsg.imageMessage);
      const isVideo = msg.message?.videoMessage || (quotedMsg && quotedMsg.videoMessage);
      
      processingMsg = await this.sock.sendMessage(sender, {
        text: `🗜️ *Compressing ${isImage ? 'image' : 'video'}...*`
      });
      
      const messageToDownload = quotedMsg ? { message: quotedMsg } : msg;
      const downloadedData = await this.sock.downloadMediaMessage(messageToDownload);
      
      const originalBuffer = await this.ensureBuffer(downloadedData);
      const originalSize = originalBuffer.length;
      
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const timestamp = Date.now();
      const tempInputPath = path.join(tempDir, `input_${timestamp}.${isImage ? 'jpg' : 'mp4'}`);
      const tempOutputPath = path.join(tempDir, `output_${timestamp}.${isImage ? 'jpg' : 'mp4'}`);
      
      fs.writeFileSync(tempInputPath, originalBuffer);
      
      let compressedBuffer;
      
      if (isImage) {
        await new Promise((resolve, reject) => {
          ffmpeg(tempInputPath)
            .outputOptions(['-q:v 30', '-compression_level 6'])
            .output(tempOutputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });
      } else {
        await new Promise((resolve, reject) => {
          ffmpeg(tempInputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions(['-crf 28', '-preset faster', '-vf scale=640:-2'])
            .output(tempOutputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });
      }
      
      compressedBuffer = fs.readFileSync(tempOutputPath);
      const compressedSize = compressedBuffer.length;
      
      const savedBytes = originalSize - compressedSize;
      const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);
      
      try {
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      let resultMessage = `✅ *${isImage ? 'Image' : 'Video'} Compressed!*
┌─⊶
│ *Original:* ${this.formatBytes(originalSize)}
│ *Final:* ${this.formatBytes(compressedSize)}
└─────────────⊶`;
      
      await this.sock.sendMessage(sender, {
        [isImage ? 'image' : 'video']: compressedBuffer,
        caption: resultMessage
      });
      
    } catch (error) {
      console.error('Compression error:', error);
      
      let errorMsg = '❌ Compression failed! ';
      if (error.message.includes('ffmpeg')) {
        errorMsg += '\n *Install FFmpeg in Termux*';
      } else {
        errorMsg += `\nError: ${error.message}`;
      }
      
      await this.sock.sendMessage(sender, { text: errorMsg });
    } finally {
      try {
        if (processingMsg && processingMsg.key) {
          await this.sock.sendMessage(sender, { delete: processingMsg.key });
        }
      } catch (e) {
        console.error('Error deleting message:', e);
      }
    }
  }
  
  async revealViewOnce(sender, userJid, msg, config) {
    try {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        await this.sock.sendMessage(sender, {
          text: `✧ *REVEAL VIEW-ONCE*
┌─⊶
│ Reply to a view-once image or video
│ with ${config.prefix}reveal or ${config.prefix}vv
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      const isViewOnceImage = quotedMsg.imageMessage?.viewOnce;
      const isViewOnceVideo = quotedMsg.videoMessage?.viewOnce;
      
      if (!isViewOnceImage && !isViewOnceVideo) {
        await this.sock.sendMessage(sender, {
          text: '❌ The replied message is not a view-once media'
        }, { quoted: msg });
        return;
      }
      
      const processingMsg = await this.sock.sendMessage(sender, {
        text: '🔍 *Revealing view-once media...*'
      });
      
      const mediaMsg = {
        message: quotedMsg,
        key: {
          remoteJid: sender,
          fromMe: false,
          id: contextInfo.stanzaId
        }
      };
      
      const downloadedData = await this.sock.downloadMediaMessage(mediaMsg);
      const mediaBuffer = await this.ensureBuffer(downloadedData);
      
      if (isViewOnceImage) {
        await this.sock.sendMessage(sender, {
          image: mediaBuffer,
          caption: '✅️ *View-Once Image Revealed*'
        });
      } else if (isViewOnceVideo) {
        await this.sock.sendMessage(sender, {
          video: mediaBuffer,
          caption: '✅️ *View-Once Video Revealed*'
        });
      }
      
      try {
        await this.sock.sendMessage(sender, { delete: processingMsg.key });
      } catch (e) {}
      
    } catch (error) {
      console.error('Reveal error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to reveal media.\nIt may have expired or been deleted.'
      }, { quoted: msg });
    }
  }
  
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  async ensureBuffer(data) {
    if (Buffer.isBuffer(data)) {
      return data;
    } else if (data && typeof data.pipe === 'function') {
      return await this.streamToBuffer(data);
    } else if (typeof data === 'string') {
      return Buffer.from(data);
    }
    throw new Error('Unsupported data type');
  }
  
  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}

module.exports = FileProcessor;