const config = require('../config');
const CommandRouter = require('./commandRouter');
const GameLogic = require('../utils/gameLogic');
const ChatbotManager = require('./chatbotManager');
const MessageProcessor = require('./messageProcessor');

class MessageHandler {
  constructor(sock, bot) {
    this.sock = sock;
    this.bot = bot;
    this.commandRouter = new CommandRouter(sock);
    this.chatbotManager = new ChatbotManager();
    this.messageProcessor = new MessageProcessor(sock);
  }
  
  async handleMessage(msg, stats, isReplyToBot = false) {
    try {
      const sender = msg.key.remoteJid;
      const text = this.extractMessageText(msg);
      const isGroup = sender.endsWith('@g.us');
      const userJid = msg.key.participant || sender;

      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const repliedToMessageId = contextInfo?.stanzaId;
      
      this.messageProcessor.storeChatHistory(sender, userJid, text);
      if (isGroup) {
        await this.messageProcessor.updateGroupData(sender);
      }
      
      if (global.botMode === "private") {
        if (!this.messageProcessor.isOwner(userJid)) {
          await this.handlePrivateModeMessage(sender, text, msg);
          return;
        }
      }
      
      const isTagged = this.messageProcessor.checkMentions(msg, text);
      
      if (text && text.startsWith(config.prefix)) {
        await this.handleCommand(msg, text, sender, userJid, isGroup, stats);
        return;
      }
      
      if (text) {
        const gameHandled = await this.messageProcessor.handleGameReplies(msg, text, sender, userJid, repliedToMessageId);
        if (gameHandled) {
          if (stats && stats.commandsExecuted !== undefined) {
            stats.commandsExecuted++;
          }
          return;
        }
      }
      
      await this.handleChatbotResponses(msg, sender, userJid, text, isGroup, isReplyToBot, isTagged, stats);
      
    } catch (error) {
      console.error('❌ Error in handleMessage:', error);
    }
  }
  
  async handleCommand(msg, text, sender, userJid, isGroup, stats) {
    if (stats && stats.commandsExecuted !== undefined) {
      stats.commandsExecuted++;
    }
    await this.commandRouter.routeCommand(msg, text, sender, userJid, isGroup, this.bot);
  }
  
  async handleChatbotResponses(msg, sender, userJid, text, isGroup, isReplyToBot, isTagged, stats) {
    // Chatbot must be ON for any of this
    if (!global.chatbotState) return;
    
    const isPrivateChat = !isGroup;
    
    // ---- Private chat ----
    if (isPrivateChat) {
      if (!text || !text.trim()) return;
      
      const chatbotResponse = await this.chatbotManager.generateResponse(text, userJid, sender);
      if (chatbotResponse) {
        await this.sock.sendMessage(sender, { text: chatbotResponse }, { quoted: msg });
        if (stats && stats.commandsExecuted !== undefined) stats.commandsExecuted++;
      }
      return;
    }
    
    // ---- Group chat ----
    // Only respond when tagged OR replying to bot
    if (!isTagged && !isReplyToBot) return;
    
    // Handle bare tag: if tagged but no actual message beyond the mention
    if (isTagged && !isReplyToBot) {
      const strippedText = this.messageProcessor.stripMentions(text);
      
      if (!strippedText || strippedText.length === 0) {
        // Bare tag → fixed reply
        await this.sock.sendMessage(sender, {
          text: "Hey boss, how can I help you"
        }, { quoted: msg });
        if (stats && stats.commandsExecuted !== undefined) stats.commandsExecuted++;
        return;
      }
    }
    
    // Tag with message OR reply to bot → chatbot takes over
    const chatbotResponse = await this.chatbotManager.generateResponse(text, userJid, sender);
    if (chatbotResponse) {
      await this.sock.sendMessage(sender, { text: chatbotResponse }, { quoted: msg });
      if (stats && stats.commandsExecuted !== undefined) stats.commandsExecuted++;
    }
  }
  
  async handlePrivateModeMessage(sender, text, msg) {
    if (text && text.startsWith(config.prefix)) {
      await this.sock.sendMessage(sender, {
        text: `❌ Bot is in Private mode!`
      }, { quoted: msg });
    }
  }
  
  extractMessageText(msg) {
    if (msg.message?.conversation) return msg.message.conversation;
    if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
    if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
    if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
    if (msg.message?.documentMessage?.caption) return msg.message.documentMessage.caption;
    return '';
  }
}

module.exports = MessageHandler;