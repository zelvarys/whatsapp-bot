class ReactionManager {
  constructor(sock) {
    this.sock = sock;
    
    // Command → emoji map. `null` means no reaction.
    this.commandReactions = {
      // AI & Creative
      'ask': '💬',
      'chat': '💬',
      'story': '✍️',
      'write': '✍️',
      'translate': '💬',
      'tr': '💬',
      'summary': '💬',
      'summarize': '💬',
      'tts': null,
      'chatbot': null,
      
      // Utility
      'reveal': '🔍',
      'vv': '🔍',
      'compress': '📥',
      'pdf': '📥',
      'sticker': '💟',
      's': '💟',
      'qrcode': null,
      'qr': null,
      'delete': null,
      'del': null,
      
      // User system
      'profile': null,
      'leaderboard': null,
      'top': null,
      'lb': null,
      'register': null,
      'crypto': '🪙',
      'price': '🪙',
      'feedback': '💬',
      
      // Games — no reactions on start
      'games': null,
      'game': null,
      'rps': null,
      'tictactoe': null,
      'ttt': null,
      
      // Media
      'song': '🎵',
      'music': '🎵',
      'download': '📥',
      'dl': '📥',
      'youtube': '📥',
      'yt': '📥',
      'instagram': '📥',
      'ig': '📥',
      'tiktok': '📥',
      'tt': '📥',
      
      // Owner
      'broadcast': '🔊',
      'eval': null,
      'groups': null,
      'mode': null,
      
      // Others
      'owner': null,
      'dev': null,
      'info': null,
      'help': null,
      'h': null,
      'commands': null,
      'menu': null,
      'ping': null,
      'stats': null
    };
  }
  
  getReactionForCommand(command) {
    if (!command) return null;
    const key = command.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(this.commandReactions, key)) {
      return this.commandReactions[key];
    }
    return null;
  }
  
  async reactToMessage(chatId, messageKey, emoji) {
    if (!emoji) return;
    try {
      await this.sock.sendMessage(chatId, {
        react: { text: emoji, key: messageKey }
      });
    } catch (error) {
      // Silent fail — reactions are cosmetic
    }
  }
  
  async removeReaction(chatId, messageKey) {
    try {
      await this.sock.sendMessage(chatId, {
        react: { text: '', key: messageKey }
      });
    } catch (error) {
      // Silent fail
    }
  }
}

module.exports = ReactionManager;