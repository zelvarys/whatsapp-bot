const config = require('../config');

class ReactionManager {
  constructor(sock) {
    this.sock = sock;
    this.reactionEmojis = {
      processing: '🔍',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      downloading: '📥',
      uploading: '📤',
      searching: '🔎',
      generating: '⚡',
      thinking: '🤔',
      playing: '🎮',
      music: '🎵',
      image: '🖼️',
      video: '🎥',
      document: '📄',
      sticker: '💟',
      game: '🎯'
    };
  }
  
  async reactToMessage(chatId, messageKey, emoji) {
    try {
      await this.sock.sendReaction(chatId, messageKey, emoji);
      console.log(`✅ Reacted with ${emoji} to message`);
    } catch (error) {
      try {
        await this.sock.sendMessage(chatId, {
          react: {
            text: emoji,
            key: messageKey
          }
        });
      } catch (fallbackError) {
        console.error('Fallback reaction failed:', fallbackError);
      }
    }
  }
  
  getReactionForCommand(command, status = 'processing') {
    const commandReactions = {
      'ask': 'thinking',
      'chat': 'thinking',
      'image': 'generating',
      'img': 'generating',
      'imagine': 'generating',
      'generate': 'generating',
      'song': 'music',
      'music': 'music',
      'download': 'downloading',
      'dl': 'downloading',
      'youtube': 'downloading',
      'yt': 'downloading',
      'instagram': 'downloading',
      'ig': 'downloading',
      'tiktok': 'downloading',
      'tt': 'downloading',
      'game': 'playing',
      'games': 'playing',
      'tictactoe': 'game',
      'ttt': 'game',
      'rps': 'game',
      'pdf': 'document',
      'compress': 'processing',
      'qrcode': 'generating',
      'qr': 'generating',
      'sticker': 'sticker',
      's': 'sticker',
      'translate': 'processing',
      'tr': 'processing',
      'crypto': 'searching',
      'price': 'searching',
      'profile': 'searching',
      'leaderboard': 'searching',
      'lb': 'searching',
      'ping': 'processing',
      'stats': 'searching',
      'help': 'processing',
      'commands': 'processing',
      'menu': 'processing',
      'feedback': 'processing'
    };
    
    const reactionType = commandReactions[command] || 'processing';
    return this.reactionEmojis[status === 'processing' ? reactionType : status];
  }
}

module.exports = ReactionManager;