const config = require('../config');

class OwnerCommands {
  constructor(sock) {
    this.sock = sock;
  }
  
  async broadcast(sender, userJid, msg, args, fullText) {
    if (args.length === 0) {
      await this.sock.sendMessage(sender, {
        text: `✧ *BROADCAST COMMAND*
┌─⊶
│ This will send a broadcast.
│ *Usage:* ${config.prefix}broadcast [message]
└─────────────⊶`
      }, { quoted: msg });
      return;
    }
    
    const message = fullText;
    
    const confirmMsg = await this.sock.sendMessage(sender, {
      text: `✧ *CONFIRM BROADCAST*\n\nMessage: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\nThis will be sent to all groups. Type "CONFIRM" to proceed or "CANCEL" to abort.`
    });
    
    setTimeout(async () => {
      try {
        await this.sock.sendMessage(sender, { delete: confirmMsg.key });
      } catch (e) {}
      
      try {
        const result = await this.broadcastMessage(message, 'Owner');
        
        await this.sock.sendMessage(sender, {
          text: `✅ *Broadcast Completed!*\n📤 Sent to: ${result.success} groups`
        });
      } catch (error) {
        await this.sock.sendMessage(sender, {
          text: `❌ Broadcast failed: ${error.message}`
        });
      }
    }, 10000);
  }
  
  async broadcastMessage(message, source = 'owner') {
    try {
      console.log(`📢 Broadcast from ${source}: ${message.substring(0, 50)}...`);
      
      const groups = Object.keys(global.groupData || {});
      
      if (groups.length === 0) {
        return { success: 0, failed: 0, total: 0, error: 'No groups found' };
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const groupId of groups) {
        try {
          await this.sock.sendMessage(groupId, {
            text: `✧ *BROADCAST MESSAGE*
╒═══════════════════╕

${message}

╘═══════════════════╛
_Message from ${source}_`
          });
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to send to ${groupId}:`, error.message);
          failCount++;
        }
      }
      
      return { success: successCount, failed: failCount, total: groups.length };
    } catch (error) {
      console.error('Broadcast error:', error);
      return { success: 0, failed: 0, total: 0, error: error.message };
    }
  }
  
  async evalCode(sender, userJid, msg, args, fullText) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `✧ *EVAL COMMAND*
┌─⊶
│ *Usage:* ${config.prefix}eval [javascript code]
└─────────────⊶`
      }, { quoted: msg });
      return;
    }
    
    try {
      const code = fullText;
      
      const dangerousPatterns = [
        /process\.exit/i,
        /require\(/i,
        /fs\./i,
        /child_process/i,
        /exec\(/i,
        /spawn\(/i,
        /eval\(/i,
        /Function\(/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          await this.sock.sendMessage(sender, {
            text: '❌ Dangerous operation detected!'
          }, { quoted: msg });
          return;
        }
      }
      
      let result;
      try {
        result = eval(code);
      } catch (evalError) {
        result = `Error: ${evalError.message}`;
      }
      
      let resultString;
      try {
        if (typeof result === 'object') {
          resultString = JSON.stringify(result, null, 2);
        } else {
          resultString = String(result);
        }
      } catch (stringifyError) {
        resultString = `[Result cannot be stringified: ${stringifyError.message}]`;
      }
      
      if (resultString.length > 1500) {
        resultString = resultString.substring(0, 1500) + '...\n[Output truncated]';
      }
      
      await this.sock.sendMessage(sender, {
        text: `✧ *EVAL RESULT*
╒═══════════════════╕

▸ *Code:* ${code}

▸ *Result:* ${resultString}

╘═══════════════════╛`
      });
      
    } catch (error) {
      console.error('Eval error:', error);
      await this.sock.sendMessage(sender, {
        text: `❌ Eval failed: ${error.message}`
      }, { quoted: msg });
    }
  }
  
  async groups(sender, userJid, msg) {
    try {
      const groups = global.groupData || {};
      const groupKeys = Object.keys(groups);
      
      if (groupKeys.length === 0) {
        await this.sock.sendMessage(sender, {
          text: '❌ The bot is not in any groups.'
        }, { quoted: msg });
        return;
      }
      
      let groupsList = `✧ *GROUPS LIST*\n╒═══════════════════╕\n\n`;
      let totalMembers = 0;
      
      for (let i = 0; i < groupKeys.length; i++) {
        const groupId = groupKeys[i];
        const group = groups[groupId];
        
        let groupName = group.name || 'Unknown Group';
        let memberCount = 0;
        
        if (group.participants) {
          memberCount = group.participants.length;
          totalMembers += memberCount;
        }
        
        groupsList += `${i + 1}. *${groupName}*\n`;
        groupsList += `   ▸ *Members:* ${memberCount}\n`;

        if (group.lastActivity) {
          const lastActive = new Date(group.lastActivity);
          const now = new Date();
          const diffMin = Math.floor((now - lastActive) / (1000 * 60));
          
          if (diffMin < 1) {
            groupsList += `   ▸ *Active:* Just now\n`;
          } else if (diffMin < 60) {
            groupsList += `   ▸ *Active:* ${diffMin} mins ago\n`;
          } else if (diffMin < 1440) {
            groupsList += `   ▸ *Active:* ${Math.floor(diffMin / 60)} hours ago\n`;
          } else {
            groupsList += `   ▸ *Active:* ${Math.floor(diffMin / 1440)} days ago\n`;
          }
        }

        groupsList += '────────────────\n';
      }
      
      groupsList += `\n╘═══════════════════╛\n`;
      groupsList += `▸ *Total Groups:* ${groupKeys.length}\n`;
      groupsList += `▸ *Total Members:* ${totalMembers}\n`;
      
      await this.sock.sendMessage(sender, {
        text: groupsList
      }, { quoted: msg });
      
    } catch (error) {
      console.error('Groups command error:', error);
      await this.sock.sendMessage(sender, {
        text: `❌ Error fetching groups: ${error.message}`
      }, { quoted: msg });
    }
  }
}

module.exports = OwnerCommands;