const config = require('../config');
const GameLogic = require('../utils/gameLogic');
const CommandHelper = require('./commandHelper');
const fs = require('fs');

class MessageProcessor {
  constructor(sock) {
    this.sock = sock;
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
  
  extractPhoneNumber(jid) {
    const phoneWithCountryCode = jid.split('@')[0];
    const digitsOnly = phoneWithCountryCode.replace(/\D/g, '');
    if (digitsOnly.startsWith('234')) return '0' + digitsOnly.substring(3);
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
    
    const botUserId = global.botInstance?.botUserId;
    const botNumber = botUserId ? botUserId.split(':')[0].split('@')[0] : null;
    
    let botLid = global.botInstance?.botLid || null;
    
    if (!botLid) {
      try {
        const credsPath = './auth_info/creds.json';
        if (fs.existsSync(credsPath)) {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          if (creds?.me?.lid) {
            botLid = creds.me.lid.split(':')[0].split('@')[0];
            if (global.botInstance) global.botInstance.botLid = botLid;
          }
        }
      } catch (e) {}
    }
    
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentionedJids && mentionedJids.length > 0) {
      isTagged = mentionedJids.some(mentionedJid => {
        const mentionedClean = mentionedJid.split(':')[0].split('@')[0];
        if (botNumber && mentionedClean === botNumber) return true;
        if (botLid && mentionedClean === botLid) return true;
        return false;
      });
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
  
  async handleTaggedMessage(sender, userJid, msg, sock) {
    const responses = [
      "You called? 👀",
      "I'm here! Need something?",
      `Hey @${await this.getDisplayName(userJid)}! Tagged me? 👋`,
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    await sock.sendMessage(sender, { text: response, mentions: [userJid] }, { quoted: msg });
  }
  
  stripMentions(text) {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/@\d+/g, '');
    cleaned = cleaned.replace(/@[\w\s]+?(?=\s|$)/gi, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }
  
  async handleGameReplies(msg, text, sender, userJid, repliedToMessageId) {
    try {
      if (text && /^[1-9]$/.test(text.trim())) {
        const tictactoeHandled = await this.handleTicTacToeReply(sender, userJid, text.trim(), msg, repliedToMessageId);
        if (tictactoeHandled) return { handled: true, reaction: null };
      }
      
      const activeGame = global.activeGames?.get(sender);
      if (!activeGame) return { handled: false, reaction: null };
      
      const gameMessageId = activeGame.gameMessageId;
      const lastMessageId = activeGame.lastMessageId;
      
      const isReplyToGame =
        repliedToMessageId &&
        ((gameMessageId && repliedToMessageId === gameMessageId) ||
         (lastMessageId && repliedToMessageId === lastMessageId));
      
      if (!isReplyToGame) return { handled: false, reaction: null };
      
      const gameReply = await this.handleGameReply(sender, userJid, text.trim(), msg, repliedToMessageId);
      return gameReply;
      
    } catch (error) {
      console.error('Error handling game replies:', error);
      return { handled: false, reaction: null };
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
    if (!global.tictactoeGames || global.tictactoeGames.size === 0) return null;
    for (const [gameId, game] of global.tictactoeGames.entries()) {
      if (game.player1 === userJid || game.player2 === userJid) return game;
    }
    return null;
  }
  
  async handleGameReply(sender, userJid, text, msg, repliedToMessageId) {
    try {
      const game = global.activeGames.get(sender);
      if (!game) return { handled: false, reaction: null };
      
      const gameType = game.type;
      const isReactiveGame = ['trivia', 'riddle', 'wordScramble', 'flag'].includes(gameType);
      
      let result = null;
      let attemptedAnswer = false;
      
      switch (gameType) {
        case 'guess': {
          const guessNum = parseInt(text);
          if (isNaN(guessNum)) return { handled: true, reaction: null };
          attemptedAnswer = true;
          result = GameLogic.processGuess(sender, userJid, text);
          break;
        }
          
        case 'trivia': {
          const answerMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
          const answer = answerMap[text] || text.toUpperCase();
          if (!(['A', 'B', 'C', 'D'].includes(answer) || /^[1-4]$/.test(text))) {
            return { handled: true, reaction: null };
          }
          attemptedAnswer = true;
          result = GameLogic.processTriviaAnswer(sender, userJid, answer);
          break;
        }
          
        case 'wordScramble':
          attemptedAnswer = true;
          result = GameLogic.processWordScramble(sender, userJid, text);
          break;
          
        case 'riddle':
          attemptedAnswer = true;
          result = GameLogic.processRiddle(sender, userJid, text);
          break;
          
        case 'flag':
          attemptedAnswer = true;
          result = GameLogic.processFlagGuess(sender, userJid, text);
          break;
      }
      
      if (!result) return { handled: false, reaction: null };
      
      const sent = await this.sock.sendMessage(sender, {
        text: result.mention ? `${result.result}` : result.result,
        mentions: result.mention ? [result.mention] : undefined
      }, { quoted: msg });
      
      // Update lastMessageId so future replies can chain off the latest bot message
      const stillActive = global.activeGames.get(sender);
      if (stillActive && sent?.key?.id) {
        stillActive.lastMessageId = sent.key.id;
      }
      
      // Determine reaction — ONLY for the 4 reactive games
      let reaction = null;
      if (isReactiveGame && attemptedAnswer) {
        if (result.won) {
          reaction = '✅';
        } else if (!result.gameOver) {
          // Wrong but game continues
          reaction = '❌';
        }
        // If gameOver but !won → game ended without a correct answer
        // (e.g. flag ran out of attempts, riddle ran out of attempts).
        // Don't react in that case — the reply text already says "Game Over".
      }
      
      return { handled: true, reaction };
      
    } catch (error) {
      return { handled: false, reaction: null };
    }
  }
}

module.exports = MessageProcessor;