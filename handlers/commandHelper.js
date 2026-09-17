const config = require('../config');
const fs = require('fs');
const DataManager = require('../utils/dataManager');

class CommandHelper {
  constructor(sock) {
    this.sock = sock;
  }
  
  static isOwner(userJid, config) {
    if (!userJid) return false;
    
    const ownerId = '119138735378638';
    const ownerLid = '119138735378638@lid';
    const cleanJid = userJid.split('@')[0];
    
    const isOwnerByJid = (
      cleanJid === ownerId ||
      userJid === ownerLid ||
      userJid.includes(ownerId)
    );
    
    const isOwnerByConfig = config.ownerNumber && (
      userJid.includes(config.ownerNumber) ||
      cleanJid.includes(config.ownerNumber.replace('+', ''))
    );
    
    return isOwnerByJid || isOwnerByConfig;
  }
  
  async handleRepeatCommand(sender, userJid, msg, sock) {
    if (global.userLastCommand && global.userLastCommand.has(userJid)) {
      return global.userLastCommand.get(userJid);
    } else {
      await sock.sendMessage(sender, {
        text: '⚠️ No previous command to repeat!'
      }, { quoted: msg });
      return null;
    }
  }
  
  storeLastCommand(userJid, text) {
    if (!text.startsWith(`${config.prefix}!!`)) {
      if (!global.userLastCommand) global.userLastCommand = new Map();
      global.userLastCommand.set(userJid, text);
    }
  }
  
  checkCooldown(userJid, command) {
    const key = `${userJid}_${command}`;
    const now = Date.now();
    const cooldownTime = 2000;
    
    if (global.userCooldowns && global.userCooldowns.has(key)) {
      const lastUsed = global.userCooldowns.get(key);
      if (now - lastUsed < cooldownTime) return true;
    }
    
    if (!global.userCooldowns) global.userCooldowns = new Map();
    global.userCooldowns.set(key, now);
    return false;
  }
  
  async handleChatbotCommand(sender, userJid, msg, args, chatbotManager, config) {
    try {
      if (args.length === 0) {
        const status = chatbotManager.getStatus();
        await this.sock.sendMessage(sender, {
          text: `✧ *CHATBOT MODE*
┌─⊶
│ *Status:* ${status.enabled ? '✅ Active' : '❌ Inactive'}
│ *Usage:* ${config.prefix}chatbot on/off
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      const action = args[0].toLowerCase();
      
      if (action === 'on' || action === 'off') {
        if (!chatbotManager.isOwner(userJid)) {
          await this.sock.sendMessage(sender, {
            text: `❌ Only bot owner can toggle chatbot mode!`
          }, { quoted: msg });
          return;
        }
        
        const newState = action === 'on';
        
        if (newState === global.chatbotState) {
          await this.sock.sendMessage(sender, {
            text: `ChatBot is already ${newState ? 'Active ✅' : 'Inactive ❌'}`
          }, { quoted: msg });
          return;
        }
        
        const result = chatbotManager.setChatbotState(newState, userJid);
        
        if (result.success) {
          await this.sock.sendMessage(sender, {
            text: `${result.message}\n${result.enabled ? 'I\'ll start responding to chats!' : 'I\'ll stop responding to chats!'}`
          }, { quoted: msg });
        } else {
          await this.sock.sendMessage(sender, {
            text: `❌ ${result.error}`
          }, { quoted: msg });
        }
      } else {
        await this.sock.sendMessage(sender, {
          text: `❌ Invalid subcommand!\n*Usage:* ${config.prefix}chatbot on/off`
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('Chatbot command error:', error);
      await this.sock.sendMessage(sender, {
        text: `❌ Error: ${error.message}`
      }, { quoted: msg });
    }
  }
  
  async handleTranslateCommand(sender, userJid, msg, args, chatbotManager, config, sock) {
    try {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = contextInfo?.quotedMessage;
      
      if (!quotedMsg) {
        await sock.sendMessage(sender, {
          text: `✧ *TRANSLATION*
┌─⊶
│ Reply with ${config.prefix}translate
│ I'll translate it to English.
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      let textToTranslate = '';
      
      if (quotedMsg.conversation) textToTranslate = quotedMsg.conversation;
      else if (quotedMsg.extendedTextMessage?.text) textToTranslate = quotedMsg.extendedTextMessage.text;
      else if (quotedMsg.imageMessage?.caption) textToTranslate = quotedMsg.imageMessage.caption;
      else if (quotedMsg.videoMessage?.caption) textToTranslate = quotedMsg.videoMessage.caption;
      else if (quotedMsg.documentMessage?.caption) textToTranslate = quotedMsg.documentMessage.caption;
      
      if (!textToTranslate || textToTranslate.trim() === '') {
        await sock.sendMessage(sender, {
          text: '❌ The replied message has no text to translate!'
        }, { quoted: msg });
        return;
      }
      
      if (textToTranslate.length > 1000) {
        textToTranslate = textToTranslate.substring(0, 1000) + '...';
      }
      
      const processingMsg = await sock.sendMessage(sender, {
        text: '🌍 *Translating...*'
      }, { quoted: msg });
      
      const result = await chatbotManager.translateText(textToTranslate, userJid);
      
      if (result.success) {
        await sock.sendMessage(sender, {
          text: `*Original:* ${textToTranslate}\n*English:* ${result.translation}`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(sender, {
          text: `❌ Translation failed: ${result.error}`
        }, { quoted: msg });
      }
      
      try {
        if (processingMsg && processingMsg.key) {
          await sock.sendMessage(sender, { delete: processingMsg.key });
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('Translate command error:', error);
      await sock.sendMessage(sender, {
        text: '❌ Error during translation. Please try again.'
      }, { quoted: msg });
    }
  }
  
  async handleSongCommand(sender, userJid, msg, fullText, sock, config) {
    if (!fullText) {
      await sock.sendMessage(sender, {
        text: `✧ *MUSIC DOWNLOAD*
┌─⊶
│ *Usage:* ${config.prefix}song [name/url]
│ *Example:* ${config.prefix}song say goodbye
└─────────────⊶`
      }, { quoted: msg });
      return;
    }
    
    const query = fullText.trim();
    
    try {
      const processingMsg = await sock.sendMessage(sender, {
        text: `🎵 *Searching ${query.substring(0, 30)}...*`
      }, { quoted: msg });
      
      const MusicDownloader = require('../utils/musicDownloader');
      let result;
      
      if (query.includes('http') || query.includes('youtube')) {
        result = await MusicDownloader.downloadMusic(query);
      } else {
        result = await MusicDownloader.searchAndDownloadMusic(query);
      }
      
      if (result.success) {
        await sock.sendMessage(sender, {
          audio: result.buffer,
          mimetype: 'audio/mpeg',
          fileName: `${result.title.replace(/[^\w\s]/gi, '')}.mp3`,
          caption: `🎵 ${result.title}\n✅ Downloaded`
        }, { quoted: msg });
        
        try {
          if (processingMsg && processingMsg.key) {
            await sock.sendMessage(sender, { delete: processingMsg.key });
          }
        } catch (e) {}
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Song error:', error);
      
      let errorMsg = '❌ Could not download music.';
      if (error.message.includes('not found')) errorMsg = '❌ Song not found. Try different keywords.';
      else if (error.message.includes('timeout')) errorMsg = '❌ Download timed out. Try shorter song.';
      
      await sock.sendMessage(sender, { text: errorMsg }, { quoted: msg });
    }
  }
  
  async handleFeedback(sender, userJid, msg, fullText, config, sock) {
    try {
      if (!fullText) {
        await sock.sendMessage(sender, {
          text: `✧ *FEEDBACK SYSTEM*
┌─⊶
│ *Usage:* ${config.prefix}feedback [message]
│ Send suggestions or bug reports
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      if (fullText.trim().length < 5) {
        await sock.sendMessage(sender, {
          text: '❌ Feedback must be at least 5 characters long!'
        }, { quoted: msg });
        return;
      }
      
      let feedbackText = fullText;
      if (feedbackText.length > 500) feedbackText = feedbackText.substring(0, 500) + '...';
      
      const userName = await this.getDisplayName(userJid);
      
      if (config.ownerNumber) {
        const ownerJid = config.ownerNumber.includes('@') ? config.ownerNumber : config.ownerNumber + '@s.whatsapp.net';
        
        const feedbackMessage = `✧ *NEW FEEDBACK RECEIVED*
╒═══════════════════╕

┌─⊶ *USER INFO*
│ *Name:* ${userName}
│ *User ID:* ${userJid}
└─────────────⊶

┌─⊶ *FEEDBACK*
│ ${feedbackText}
└─────────────⊶

┌─⊶ *METADATA*
│ *Time:* ${new Date().toLocaleString()}
│ *Chat Type:* ${sender.endsWith('@g.us') ? 'Group' : 'Private'}
│ *Group:* ${sender.endsWith('@g.us') ? sender : 'N/A'}
└─────────────⊶

╘═══════════════════╛`;
        
        await sock.sendMessage(ownerJid, { text: feedbackMessage });
      }
      
      await sock.sendMessage(sender, {
        text: 'Thank you for your feedback! I\'ve sent it to my developer. 💖'
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Feedback error:', error);
      await sock.sendMessage(sender, {
        text: '❌ Failed to send feedback. Please try again later.'
      }, { quoted: msg });
    }
  }
  
  async handleDeleteCommand(sender, userJid, msg, sock, reactionManager) {
    try {
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const repliedToId = contextInfo?.stanzaId;
      
      if (!repliedToId) {
        await sock.sendMessage(sender, {
          text: `❌ Reply to the bot's message you want to delete!`
        }, { quoted: msg });
        return;
      }
      
      const isBotMessage = global.botMessageIds.has(repliedToId) ||
                           global.gameMessageIds.has(repliedToId) ||
                           global.helpMessageIds.has(repliedToId);
      
      if (!isBotMessage) {
        await sock.sendMessage(sender, {
          text: '❌ You can only delete messages sent by the bot!'
        }, { quoted: msg });
        return;
      }
      
      if (!CommandHelper.isOwner(userJid, config)) {
        await sock.sendMessage(sender, {
          text: '❌ Only owner can delete bot messages!'
        }, { quoted: msg });
        return;
      }
      
      await sock.sendMessage(sender, { delete: { remoteJid: sender, fromMe: true, id: repliedToId } });
      await reactionManager.reactToMessage(sender, msg.key, '✅');
      
    } catch (error) {
      console.error('Delete command error:', error);
      await reactionManager.reactToMessage(sender, msg.key, '❌');
      await sock.sendMessage(sender, {
        text: '❌ Failed to delete message.'
      }, { quoted: msg });
    }
  }
  
  async handleModeCommand(sender, userJid, msg, args, sock, reactionManager) {
    try {
      if (!CommandHelper.isOwner(userJid, config)) {
        await sock.sendMessage(sender, {
          text: '❌ Only the bot owner can change the mode!'
        }, { quoted: msg });
        return;
      }
      
      if (args.length === 0) {
        await sock.sendMessage(sender, {
          text: `✧ *BOT MODE*
┌─⊶
│ *Current Mode:* ${global.botMode.toUpperCase()}
│ *Usage:* ${config.prefix}mode [public/private]
└─────────────⊶`
        }, { quoted: msg });
        return;
      }
      
      const newMode = args[0].toLowerCase();
      
      if (newMode !== 'public' && newMode !== 'private') {
        await sock.sendMessage(sender, {
          text: '❌ Invalid mode! Use "public" or "private"'
        }, { quoted: msg });
        return;
      }
      
      if (newMode === global.botMode) {
        await sock.sendMessage(sender, {
          text: `❌ Bot is already in ${global.botMode.toUpperCase()} mode!`
        }, { quoted: msg });
        return;
      }
      
      DataManager.setBotMode(newMode);
      
      await sock.sendMessage(sender, {
        text: `✅ Bot mode changed to ${newMode.toUpperCase()}!`
      }, { quoted: msg });
      
      await reactionManager.reactToMessage(sender, msg.key, '✅');
      
    } catch (error) {
      console.error('Mode command error:', error);
      await sock.sendMessage(sender, {
        text: '❌ Error changing bot mode.'
      }, { quoted: msg });
    }
  }
  
  async showOwnerInfo(sender, msg, config, sock) {
    const ownerInfo = `✧ *DEVELOPER INFO*
╒═══════════════════╕

┌─⊶ *ABOUT*
│ *Name:* Osasan Olusola
│ *Nickname:* Incognito
│ *Phone:* +2349065168872
│ *Country:* Nigeria
└─────────────⊶

┌─⊶ *CAREER*
│• Backend Developer
│• Machine Learning Enthusiast
│• Bot Developer
│• Automation Expert
└─────────────⊶

┌─⊶ *SKILLS*
│• JavaScript/Node.js
│• Python
│• Machine Learning
│• API Development
│• Database Management
└─────────────⊶

┌─⊶ *CONTACT*
│ *WhatsApp:* +2349065168872
│ *Email:* me.zelvarys@gmail.com
│ *Github:* github.com/zelvarys
└─────────────⊶

╘═══════════════════╛`;

    if (global.commandCache) {
      global.commandCache.set('owner_info', { response: ownerInfo, timestamp: Date.now() });
    }
    
    await sock.sendMessage(sender, { text: ownerInfo }, { quoted: msg });
  }
  
  buildHelpText(config) {
    return `⨳
▸ *Mode:* ${global.botMode}
▸ *Prefix:* ${config.prefix}
▸ *Dev:* I̶n̶c̶o̶g̶n̶i̶t̶o̶シ︎ꨄ︎

╔═══════ ∘◦ ✧ ◦∘ ═══════╗

┌─⊶ *AI & CREATIVE*
│• ask [question]
│• story [prompt]
│• chatbot on/off
│• translate
│• tts [text]
│• summary [num]
└────────────⊶

┌─⊶ *GAMES & FUN*
│• games
│• game [type]
│• ttt start @friend
│• rps [choice]
└────────────⊶

┌─⊶ *UTILITY TOOLS*
│• compress
│• qrcode [text]
│• reveal
│• sticker
│• pdf [image/text]
│• delete
└────────────⊶

┌─⊶ *USER SYSTEM*
│• profile
│• leaderboard
│• register [name]
│• crypto [coin]
│• feedback
└────────────⊶

┌─⊶ *MEDIA DOWNLOAD*
│• download
│• song [name/url]
│• youtube
│• tiktok
│• instagram
└────────────⊶

┌─⊶ *OWNER ONLY*
│• broadcast
│• eval [script]
│• groups
│• mode [args]
└────────────⊶

┌─⊶ *OTHERS*
│• ping - Bot latency
│• stats - Bot statistics
│• !! - Repeat command
│• dev - Owner info
│• help - Show help menu
└────────────⊶

╘═══════════════════╛`;
  }
  
  async sendHelp(sender, msg, config, sock, fs) {
    const helpText = this.buildHelpText(config);
    const imagePath = './data/bot_image.jpg';
    
    try {
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        
        await sock.sendMessage(sender, {
          image: imageBuffer,
          mimetype: 'image/jpeg',
          caption: helpText,
          jpegThumbnail: null,
          viewOnce: false
        });
      } else {
        await sock.sendMessage(sender, { text: helpText });
      }
    } catch (error) {
      console.error('Error sending help:', error);
      await sock.sendMessage(sender, { text: helpText });
    }
  }
  
  async handlePingCommand(sender, msg, config, sock) {
    const startTime = Date.now();
    let status = "Excellent", emoji = "⚡", responseTime = 0;
    
    try {
      const sentMsg = await sock.sendMessage(sender, {
        text: `🏓 *Pong!* ${config.botName} ${config.version}`
      }, { quoted: msg });
      
      responseTime = (Date.now() - startTime) - 200;
      
      if (responseTime > 1000) { status = "Slow"; emoji = "🐢"; }
      else if (responseTime > 500) { status = "Moderate"; emoji = "⚠️"; }
      else if (responseTime > 200) { status = "Good"; emoji = "✅"; }
      
      await sock.sendMessage(sender, {
        text: `┌─⊶📡 *BOT LATENCY*
│ 🏓 *Ping:* ${responseTime}ms
│ ${emoji} *Status:* ${status}
└─────────────⊶`
      }, { quoted: msg });
      
      try { await sock.sendMessage(sender, { delete: sentMsg.key }); } catch (e) {}
      
    } catch (error) {
      console.error('Error in ping command:', error);
      await sock.sendMessage(sender, {
        text: '❌ Could not measure response time.'
      }, { quoted: msg });
    }
  }
  
  suggestCommand(input, config) {
    const commands = [
      'ask', 'story', 'chatbot', 'translate', 'tts', 'summary',
      'games', 'game', 'tictactoe', 'rps',
      'pdf', 'compress', 'qrcode', 'reveal', 'sticker', 'feedback', 'delete',
      'profile', 'leaderboard', 'register', 'owner', 'crypto', 'mode',
      'download', 'song', 'tiktok', 'groups', 'instagram', 'youtube',
      'ping', 'stats', 'help', 'commands', 'menu'
    ];
    
    const suggestions = [];
    for (const cmd of commands) {
      if (cmd.startsWith(input) || input.includes(cmd) || this.levenshteinDistance(input, cmd) <= 2) {
        suggestions.push(cmd);
      }
    }
    
    return suggestions.slice(0, 3).map(cmd => `${config.prefix}${cmd}`).join(', ');
  }
  
  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
  
  extractPhoneNumber(jid) {
    const phoneWithCountryCode = jid.split('@')[0];
    const digitsOnly = phoneWithCountryCode.replace(/\D/g, '');
    if (digitsOnly.startsWith('234')) return '0' + digitsOnly.substring(3);
    return digitsOnly;
  }
  
  async getDisplayName(jid) {
    try {
      if (global.userData?.[jid]?.username) return global.userData[jid].username;
      try {
        const contact = await this.sock.getContact(jid);
        return contact.pushname || contact.notify || contact.name || this.extractPhoneNumber(jid);
      } catch {
        return this.extractPhoneNumber(jid);
      }
    } catch (error) {
      return this.extractPhoneNumber(jid);
    }
  }
}

module.exports = CommandHelper;