const config = require('../config');
const fs = require('fs');
const ReactionManager = require('../utils/reactionManager');
const CommandHelper = require('./commandHelper');

class CommandRouter {
  constructor(sock) {
    this.sock = sock;
    this.reactionManager = new ReactionManager(sock);
    this.commandHelper = new CommandHelper(sock);
    
    this.loadCommandClasses();
    
    this.ChatbotManager = require('./chatbotManager');
    this.chatbotManager = new this.ChatbotManager();
  }
  
  loadCommandClasses() {
    try {
      this.aiCommands = new (require('../commands/generative/aiCommands'))(this.sock);
      this.gameCommands = new (require('../commands/games/gameCommands'))(this.sock);
      this.userCommands = new (require('../commands/userCommands'))(this.sock);
      this.ownerCommands = new (require('../commands/ownerCommands'))(this.sock);
      this.utilityCommands = new (require('../commands/utility/utilityCommands'))(this.sock);
      this.mediaCommands = new (require('../commands/mediaCommands'))(this.sock);
    } catch (error) {
      console.error('❌ Error loading command classes:', error);
    }
  }
  
  async routeCommand(msg, text, sender, userJid, isGroup, bot) {
    if (text === `${config.prefix}!!` || text === '!!') {
      const lastCommand = await this.commandHelper.handleRepeatCommand(sender, userJid, msg, this.sock);
      if (!lastCommand) return;
      text = lastCommand;
    }
    
    this.commandHelper.storeLastCommand(userJid, text);
    
    const args = text.slice(config.prefix.length).trim().split(/ +/);
    let command = args.shift().toLowerCase();
    const fullText = text.slice(config.prefix.length + command.length).trim();
    
    if (config.COMMAND_ALIASES && config.COMMAND_ALIASES[command]) {
      command = config.COMMAND_ALIASES[command];
    }
    
    const cacheKey = `${command}_${args.join('_')}`;
    
    const cacheableCommands = ['profile', 'games', 'help', 'commands', 'owner'];
    if (cacheableCommands.includes(command)) {
      if (global.commandCache) {
        const cachedResponse = global.commandCache.get(cacheKey);
        if (cachedResponse && Date.now() - cachedResponse.timestamp < 300000) {
          await this.sock.sendMessage(sender, {
            text: cachedResponse.response
          }, { quoted: msg });
          return;
        }
      }
    }
    
    if (global.botMode === "private") {
      if (!CommandHelper.isOwner(userJid, config)) {
        await this.sock.sendMessage(sender, {
          text: `❌ Bot is in Private mode.`
        }, { quoted: msg });
        return;
      }
    }
    
    if (this.commandHelper.checkCooldown(userJid, command)) {
      return;
    }
    
    const emoji = this.reactionManager.getReactionForCommand(command);
    let reactionApplied = false;
    
    try {
      if (emoji) {
        await this.reactionManager.reactToMessage(sender, msg.key, emoji);
        reactionApplied = true;
      }
      
      await this.routeToHandler(command, sender, userJid, msg, args, fullText, isGroup, bot);
      
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      
      // Replace current reaction with ❌️ (single send = replace)
      await this.reactionManager.reactToMessage(sender, msg.key, '❌');
      reactionApplied = false; // don't remove it in finally
      
      await this.sock.sendMessage(sender, {
        text: "❌ An error occurred while executing the command. Please try again later." 
      }, { quoted: msg });
      
    } finally {
      if (reactionApplied) {
        await this.reactionManager.removeReaction(sender, msg.key);
      }
    }
  }
  
  async routeToHandler(command, sender, userJid, msg, args, fullText, isGroup, bot) {
    switch (command) {
      case 'ask':
      case 'chat':
        await this.aiCommands.ask(sender, userJid, msg, fullText);
        break;
        
      case 'story':
      case 'write':
        await this.aiCommands.write(sender, userJid, msg, fullText);
        break;
        
      case 'chatbot':
        await this.commandHelper.handleChatbotCommand(sender, userJid, msg, args, this.chatbotManager, config, this.sock);
        break;
        
      case 'translate':
      case 'tr':
        await this.commandHelper.handleTranslateCommand(sender, userJid, msg, args, this.chatbotManager, config, this.sock);
        break;
        
      case 'song':
      case 'music':
        await this.commandHelper.handleSongCommand(sender, userJid, msg, fullText, this.sock, config);
        break;
        
      case 'tts':
        await this.utilityCommands.textToSpeech(sender, userJid, msg, fullText);
        break;
        
      case 'summary':
      case 'summarize':
        await this.utilityCommands.summarizeMessages(sender, userJid, msg, args);
        break;
        
      case 'games':
        await this.gameCommands.showGames(sender, msg);
        break;
        
      case 'game':
        await this.gameCommands.startGame(sender, msg, args, bot);
        break;
        
      case 'rps':
        await this.gameCommands.rps(sender, userJid, msg, args);
        break;
        
      case 'tictactoe':
      case 'ttt':
        await this.gameCommands.tictactoe(sender, userJid, msg, args);
        break;
        
      case 'profile':
        await this.userCommands.profile(sender, userJid, msg);
        break;
        
      case 'leaderboard':
      case 'top':
      case 'lb':
        await this.userCommands.leaderboard(sender, msg, args);
        break;
        
      case 'register':
        await this.userCommands.register(sender, userJid, msg, args);
        break;
        
      case 'crypto':
      case 'price':
        await this.userCommands.cryptoPrice(sender, userJid, msg, args);
        break;
        
      case 'feedback':
        await this.commandHelper.handleFeedback(sender, userJid, msg, fullText, config, this.sock);
        break;
        
      case 'pdf':
        await this.utilityCommands.pdf(sender, userJid, msg, args, fullText);
        break;
        
      case 'compress':
        await this.utilityCommands.compressFile(sender, userJid, msg);
        break;
        
      case 'qrcode':
      case 'qr':
        await this.utilityCommands.generateQRCode(sender, userJid, msg, fullText);
        break;
        
      case 'reveal':
      case 'vv':
        await this.utilityCommands.revealViewOnce(sender, userJid, msg);
        break;
        
      case 'sticker':
      case 's':
        await this.utilityCommands.createSticker(sender, userJid, msg);
        break;
        
      case 'download':
      case 'dl':
        await this.mediaCommands.downloadMedia(sender, userJid, msg, fullText);
        break;
        
      case 'yt':
      case 'youtube':
        await this.mediaCommands.downloadYouTube(sender, userJid, msg, fullText);
        break;
        
      case 'ig':
      case 'instagram':
        await this.mediaCommands.downloadInstagram(sender, userJid, msg, fullText);
        break;
        
      case 'tiktok':
      case 'tt':
        await this.mediaCommands.downloadTikTok(sender, userJid, msg, fullText);
        break;
        
      case 'owner':
      case 'dev':
      case 'info':
        await this.commandHelper.showOwnerInfo(sender, msg, config, this.sock);
        break;
        
      case 'broadcast':
      case 'eval':
      case 'groups':
        await this.handleOwnerCommand(command, sender, userJid, msg, args, fullText);
        break;
        
      case 'delete':
      case 'del':
        await this.commandHelper.handleDeleteCommand(sender, userJid, msg, this.sock, this.reactionManager);
        break;
        
      case 'mode':
        await this.commandHelper.handleModeCommand(sender, userJid, msg, args, this.sock, this.reactionManager);
        break;
        
      case 'help':
      case 'h':
      case 'commands':
      case 'menu':
        await this.commandHelper.sendHelp(sender, msg, config, this.sock, fs);
        break;
        
      case 'ping':
        await this.commandHelper.handlePingCommand(sender, msg, config, this.sock);
        break;
        
      case 'stats':
        if (bot) {
          await bot.showStats(sender);
        } else {
          await this.sock.sendMessage(sender, {
            text: "📊 Bot statistics temporarily unavailable."
          }, { quoted: msg });
        }
        break;
        
      default:
        await this.handleUnknownCommand(sender, msg, command, config);
    }
  }
  
  async handleOwnerCommand(commandType, sender, userJid, msg, args, fullText) {
    if (!CommandHelper.isOwner(userJid, config)) {
      await this.sock.sendMessage(sender, {
        text: '❌ This command is only available to the bot owner!'
      }, { quoted: msg });
      return;
    }
    
    switch (commandType) {
      case 'broadcast':
        await this.ownerCommands.broadcast(sender, userJid, msg, args, fullText);
        break;
        
      case 'eval':
        await this.ownerCommands.evalCode(sender, userJid, msg, args, fullText);
        break;
        
      case 'groups':
        await this.ownerCommands.groups(sender, userJid, msg);
        break;
    }
  }
  
  async handleUnknownCommand(sender, msg, command, config) {
    await this.sock.sendMessage(sender, {
      text: `❌ Unknown command!\nType ${config.prefix}menu to view all available commands.\n\n▸ Did you mean: ${this.commandHelper.suggestCommand(command, config) || '!help'}` 
    }, { quoted: msg });
  }
}

module.exports = CommandRouter;