const config = require('../config');
const DataManager = require('../utils/dataManager');

class AdminCommands {
  constructor(sock) {
    this.sock = sock;
  }
  
  async isAdmin(sender, userJid) {
    try {
      const metadata = await this.sock.groupMetadata(sender);
      const participant = metadata.participants.find(p => p.id === userJid);
      return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (error) {
      return false;
    }
  }
  
  async tagAll(sender, userJid, isGroup, text, msg) {
    if (!isGroup) {
      await this.sock.sendMessage(sender, {
        text: '❌ This command only works in groups!'
      }, { quoted: msg });
      return;
    }
    
    if (!await this.isAdmin(sender, userJid)) {
      await this.sock.sendMessage(sender, {
        text: '❌ Only admins can use this command!'
      }, { quoted: msg });
      return;
    }
    
    try {
      const metadata = await this.sock.groupMetadata(sender);
      const mentions = metadata.participants.map(p => p.id);
      const message = text ? `✧ *ANNOUNCEMENT*\n\n${text}\n\n*@everyone*` : '✧ *ATTENTION! @everyone*👆';
      
      await this.sock.sendMessage(sender, {
        text: message,
        mentions: mentions
      });
    } catch (error) {
      console.error('Tag all error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to tag everyone. Make sure I have admin permissions.'
      }, { quoted: msg });
    }
  }
  
  async kick(sender, userJid, msg) {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedParticipant = contextInfo?.participant;
    
    if (!quotedParticipant) {
      await this.sock.sendMessage(sender, {
        text: `❌ Reply to the user's message you want to kick!`
      }, { quoted: msg });
      return;
    }
    
    if (!await this.isAdmin(sender, userJid)) {
      await this.sock.sendMessage(sender, {
        text: '❌ Only admins can kick users!'
      }, { quoted: msg });
      return;
    }
    
    try {
      const metadata = await this.sock.groupMetadata(sender);
      const botParticipant = metadata.participants.find(p => p.id === this.sock.user.id);
      
      if (!botParticipant || (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
        await this.sock.sendMessage(sender, {
          text: '❌ I need admin permissions to kick users!'
        }, { quoted: msg });
        return;
      }
      
      const targetParticipant = metadata.participants.find(p => p.id === quotedParticipant);
      if (targetParticipant && (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin')) {
        await this.sock.sendMessage(sender, {
          text: '❌ Cannot kick an admin!'
        }, { quoted: msg });
        return;
      }
      
      const result = await this.sock.groupParticipantsUpdate(sender, [quotedParticipant], 'remove');
      
      if (result && result[0] && result[0].status === '200') {
        await this.sock.sendMessage(sender, {
          text: `✅ User has been kicked from the group!`,
          mentions: [quotedParticipant]
        });
      } else {
        throw new Error('Kick failed');
      }
    } catch (error) {
      console.error('Kick error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to kick user. Make sure I have admin permissions and the user is not an admin.'
      }, { quoted: msg });
    }
  }
  
  async unmute(sender, userJid, msg) {
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedParticipant = contextInfo?.participant;
    
    if (!quotedParticipant) {
      await this.sock.sendMessage(sender, {
        text: `❌ Reply to the user's message you want to unmute!`
      }, { quoted: msg });
      return;
    }
    
    if (!await this.isAdmin(sender, userJid)) {
      await this.sock.sendMessage(sender, {
        text: '❌ Only admins can unmute users!'
      }, { quoted: msg });
      return;
    }
    
    const muteKey = `${sender}_${quotedParticipant}`;
    
    if (global.manualMutes && global.manualMutes.has(muteKey)) {
      global.manualMutes.delete(muteKey);
      await this.sock.sendMessage(sender, {
        text: `🔊 User has been unmuted!`,
        mentions: [quotedParticipant]
      });
    } else {
      await this.sock.sendMessage(sender, {
        text: '❌ This user is not muted!'
      }, { quoted: msg });
    }
  }
  
  async linkProtect(sender, userJid, msg, args) {
    if (args.length === 0) {
      const settings = DataManager.getGroupSettings(sender);
      const status = settings.linkProtect ? '✅ ACTIVE' : '❌ INACTIVE';
      
      await this.sock.sendMessage(sender, {
        text: `✧ *LINK PROTECTION*
┌─⊶
│ *Status:* ${status}
│ *Usage:* ${config.prefix}linkprotect [on/off]
└─────────────⊶
▸ Requires admin permission`
      }, { quoted: msg });
      return;
    }
    
    if (!await this.isAdmin(sender, userJid)) {
      await this.sock.sendMessage(sender, {
        text: '❌ Only admins can change link protection settings!'
      }, { quoted: msg });
      return;
    }
    
    const action = args[0].toLowerCase();
    
    if (action === 'on' || action === 'off') {
      const enabled = action === 'on';
      DataManager.updateGroupSettings(sender, { linkProtect: enabled });
      
      await this.sock.sendMessage(sender, {
        text: `Link protection is now ${enabled ? 'Active ✅' : 'Inactive ❌'}`
      }, { quoted: msg });
    } else {
      await this.sock.sendMessage(sender, {
        text: '❌ Invalid option!\nUse !linkprotect on/off'
      }, { quoted: msg });
    }
  }
}

module.exports = AdminCommands;