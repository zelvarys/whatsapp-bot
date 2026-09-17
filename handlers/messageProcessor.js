const config = require('../config');
const GameLogic = require('../utils/gameLogic');
const CommandHelper = require('./commandHelper');

class MessageProcessor {
  constructor(sock) {
    this.sock = sock;
  }
  
  async getDisplayName(jid) {
    try {
      if (global.userData?.[jid]?.username) {
        return global.userData[jid].username;
      }
      
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
  
  extractPhoneNumber(jid) {
    const phoneWithCountryCode = jid.split('@')[0];
    const digitsOnly = phoneWithCountryCode.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('234')) {
      return '0' + digitsOnly.substring(3);
    }
    return digitsOnly;
  }
  
  isOwner(userJid) {
    return CommandHelper.isOwner(userJid, config);
  }
  
  storeChatHistory(sender, userJid, text) {
    if (text && text.trim() !== '') {
      try {
        if (!global.chatHistory) global.chatHistory = {};
        if (!global.chatHistory[sender]) global.chatHistory[sender] = [];
        
        global.chatHistory[sender].push({
          sender: userJid,
          text: text,
          timestamp: Date.now()
        });
        
        if (global.chatHistory[sender].length > 50) {
          global.chatHistory[sender].shift();
        }
      } catch (e) {}
    }
  }
  
  async updateGroupData(sender) {
    try {
      if (!global.groupData) global.groupData = {};
      
      if (!global.groupData[sender]) {
        const groupInfo = await this.sock.groupMetadata(sender);
        global.groupData[sender] = {
          name: groupInfo.subject,
          participants: groupInfo.participants,
          lastActivity: new Date()
        };
      } else {
        global.groupData[sender].lastActivity = new Date();
      }
    } catch (e) {
      if (!global.groupData[sender]) {
        global.groupData[sender] = {
          name: 'Unknown Group',
          participants: [],
          lastActivity: new Date()
        };
      } else {
        global.groupData[sender].lastActivity = new Date();
      }
    }
  }
  
  checkMentions(msg, text) {
    let isTagged = false;
    
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      const mentionedJids = msg.message.extendedTextMessage.contextInfo.mentionedJid;
      const botUserId = global.botInstance?.botUserId;
      
      if (botUserId) {
        isTagged = mentionedJids.some(mentionedJid => {
          const mentionedClean = mentionedJid.split(':')[0];
          const botClean = botUserId.split(':')[0];
          return mentionedClean === botClean || mentionedJid.includes(botClean);
        });
      }
    }
    
    if (!isTagged && text) {
      const textLower = text.toLowerCase();
      if (textLower.includes('@incognito') || textLower.includes('@bot') || 
          textLower.includes(`@${config.botName.toLowerCase()}`)) {
        isTagged = true;
      }
    }
    
    return isTagged;
  }
  
  async handleLinkViolation(sender, userJid, msg, sock) {
    try {
      await sock.sendMessage(sender, { delete: msg.key });
      await sock.sendMessage(sender, {
        text: `⚠️ *LINK PROTECTION*
┌─⊶
│ @${await this.getDisplayName(userJid)} sent a link.
│ Only admins can send links.
└─────────────⊶`,
        mentions: [userJid]
      }, { quoted: msg });
    } catch (error) {
      console.error('Error in handleLinkViolation:', error);
    }
  }
  
  async handleTaggedMessage(sender, userJid, msg, sock) {
    const responses = [
      "You called? 👀",
      "I'm here! Need something?",
      `Hey @${await this.getDisplayName(userJid)}! Tagged me? 👋`,
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    await sock.sendMessage(sender, { text: response, mentions: [userJid] }, { quoted: msg });
  }
  
  async handleAutoResponses(msg, text, sender, sock) {
    if (!config.AUTO_RESPONSES) return false;
    
    const textLower = text.toLowerCase().trim();
    
    for (const [keyword, response] of Object.entries(config.AUTO_RESPONSES)) {
      const keywordLower = keyword.toLowerCase();
      
      const isMatch = (
        textLower === keywordLower ||
        textLower.includes(` ${keywordLower} `) ||
        textLower.startsWith(`${keywordLower} `) ||
        textLower.endsWith(` ${keywordLower}`)
      );
      
      if (isMatch) {
        await sock.sendMessage(sender, { text: response }, { quoted: msg });
        return true;
      }
    }
    
    return false;
  }
  
  async handleGameReplies(msg, text, sender, userJid, repliedToMessageId) {
    try {
      if (text && /^[1-9]$/.test(text.trim())) {
        const tictactoeHandled = await this.handleTicTacToeReply(sender, userJid, text.trim(), msg, repliedToMessageId);
        if (tictactoeHandled) return true;
      }
      
      const gameReply = await this.handleGameReply(sender, userJid, text.trim(), msg, repliedToMessageId);
      return gameReply.handled;
      
    } catch (error) {
      console.error('Error handling game replies:', error);
      return false;
    }
  }
  
  async handleTicTacToeReply(sender, userJid, text, msg, repliedToMessageId) {
    try {
      const game = this.findUserTicTacToeGame(userJid);
      if (!game) return false;
      
      if (game.chatJid !== sender) return false;
      
      const TicTacToeCommands = require('../commands/games/gameCommands');
      const tictactoeCmd = new TicTacToeCommands(this.sock);
      
      await tictactoeCmd.makeMove(sender, userJid, msg, [text]);
      return true;
      
    } catch (error) {
      return false;
    }
  }
  
  findUserTicTacToeGame(userJid) {
    if (!global.tictactoeGames || global.tictactoeGames.size === 0) {
      return null;
    }
    
    for (const [gameId, game] of global.tictactoeGames.entries()) {
      if (game.player1 === userJid || game.player2 === userJid) {
        return game;
      }
    }
    return null;
  }
  
  async handleGameReply(sender, userJid, text, msg, repliedToMessageId) {
    try {
      if (global.activeGames && global.activeGames.has(sender)) {
        const game = global.activeGames.get(sender);
        
        let result = null;
        
        switch (game.type) {
          case 'guess':
            const guessNum = parseInt(text);
            if (!isNaN(guessNum)) {
              result = GameLogic.processGuess(sender, userJid, text);
            } else {
              return { handled: true };
            }
            break;
            
          case 'trivia':
            const answerMap = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'};
            const answer = answerMap[text] || text.toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(answer) || /^[1-4]$/.test(text)) {
              result = GameLogic.processTriviaAnswer(sender, userJid, answer);
            } else {
              return { handled: true };
            }
            break;
            
          case 'wordScramble':
            result = GameLogic.processWordScramble(sender, userJid, text);
            break;
            
          case 'riddle':
            result = GameLogic.processRiddle(sender, userJid, text);
            break;
            
          case 'flag':
            result = GameLogic.processFlagGuess(sender, userJid, text);
            break;
        }
        
        if (result) {
          await this.sock.sendMessage(sender, { 
            text: result.mention ? `${result.result}` : result.result,
            mentions: result.mention ? [result.mention] : undefined
          }, { quoted: msg });
          
          return { handled: true };
        }
      }
      
      return { handled: false };
    } catch (error) {
      return { handled: false };
    }
  }
}

module.exports = MessageProcessor;