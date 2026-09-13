const config = require('../config');

class LinkProtection {
  static containsLink(text) {
    if (!text) return false;
    
    const falsePositives = [
      'example.com',
      'test.com',
      'localhost',
      '127.0.0.1',
      '192.168.',
      '10.',
      '172.16.',
      'mailto:',
      'tel:',
      '.png', '.jpg', '.jpeg', '.gif',
      '.pdf', '.doc', '.txt', '.mp3', '.mp4'
    ];
    
    const lowerText = text.toLowerCase();
    for (const fp of falsePositives) {
      if (lowerText.includes(fp)) {
        return false;
      }
    }
    
    for (const pattern of config.LINK_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            if (match.length < 8 || 
                match.includes('...') || 
                match.endsWith('.') && match.length < 10) {
              continue;
            }
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  static async checkLink(text, userJid, chatJid, sock) {
    if (!text) return { hasLink: false };
    
    const groupId = chatJid;
    if (!global.groupSettings[groupId] || !global.groupSettings[groupId].linkProtect) {
      return { hasLink: false };
    }
    
    if (this.containsLink(text)) {
      try {
        const metadata = await sock.groupMetadata(chatJid);
        const participant = metadata.participants.find(p => p.id === userJid);
        const isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
        
        if (!isAdmin) {
          return {
            hasLink: true,
            action: 'delete',
            reason: 'Only admins can send links'
          };
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        return { hasLink: false };
      }
    }
    
    return { hasLink: false };
  }
}

module.exports = LinkProtection;