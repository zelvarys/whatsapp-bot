const config = require('../config');
const botState = require('../models/botStateModel');
const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const cacheModel = require('../models/cacheModel');
const jid = require('../utils/jidHelpers');

// -------------------- broadcast --------------------

async function broadcast(sock, msg, sender, userJid, args, fullText) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *BROADCAST COMMAND*
┌─⊶
│ *Usage:* ${config.prefix}broadcast <message>
└─────────────⊶`
    }, { quoted: msg });
  }

  const ownerJid = jid.phoneToUserJid(config.ownerNumber);
  const result = await broadcastToAllGroups(sock, fullText);

  await sock.sendMessage(ownerJid, {
    text: `✅ *Broadcast complete!*\nSuccessfully sent to ${result.success} groups`
  });
}

async function broadcastToAllGroups(sock, message) {
  const groups = Object.keys(global.groupData || {});

  if (groups.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const groupId of groups) {
    try {
      await sock.sendMessage(groupId, {
        text: `✧ *BROADCAST MESSAGE*\n\n${message}`
      });
      success++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Broadcast failed for ${groupId}:`, err.message);
      failed++;
    }
  }

  return { success, failed, total: groups.length };
}

// -------------------- groups --------------------

async function groups(sock, msg, sender) {
  const groups_ = global.groupData || {};
  const groupKeys = Object.keys(groups_);

  if (groupKeys.length === 0) {
    return sock.sendMessage(sender, {
      text: '❌ The bot is not in any groups.'
    }, { quoted: msg });
  }

  let list = `✧ *GROUPS LIST*\n╒═══════════════════╕\n\n`;
  let totalMembers = 0;

  for (let i = 0; i < groupKeys.length; i++) {
    const group = groups_[groupKeys[i]];
    const memberCount = group.participants ? group.participants.length : 0;
    totalMembers += memberCount;

    list += `${i + 1}. *${group.name || 'Unknown Group'}*\n`;
    list += `┌─⊶
│• *Members:* ${memberCount}\n`;
    list += `│• *Active:* ${formatRelative(new Date(group.lastActivity))}
└─────────────⊶\n`;
  }

  list += `\n╘═══════════════════╛\n`;
  list += `▸ *Total Groups:* ${groupKeys.length}\n`;
  list += `▸ *Total Members:* ${totalMembers}\n`;

  await sock.sendMessage(sender, { text: list }, { quoted: msg });
}

function formatRelative(date) {
  const diffMin = Math.floor((Date.now() - date.getTime()) / (1000 * 60));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} mins ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hours ago`;
  return `${Math.floor(diffMin / 1440)} days ago`;
}

// -------------------- mode --------------------

async function mode(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *BOT MODE*
┌─⊶
│ *Current Mode:* ${botState.getMode().toUpperCase()}
│ *Usage:* ${config.prefix}mode <public/private>
└─────────────⊶`
    }, { quoted: msg });
  }

  const newMode = args[0].toLowerCase();

  if (newMode !== 'public' && newMode !== 'private') {
    return sock.sendMessage(sender, {
      text: '❌ Invalid mode! Use "public" or "private"'
    }, { quoted: msg });
  }

  if (newMode === botState.getMode()) {
    return sock.sendMessage(sender, {
      text: `❌ Bot is already in ${botState.getMode().toUpperCase()} mode!`
    }, { quoted: msg });
  }

  botState.setMode(newMode);

  await sock.sendMessage(sender, {
    text: `✅ Bot mode changed to ${newMode.toUpperCase()}!`
  }, { quoted: msg });
}

// -------------------- restart --------------------

async function restart(sock, msg, sender) {
  await sock.sendMessage(sender, {
    text: '🔄 Saving data and restarting...'
  }, { quoted: msg });

  try {
    userModel.saveAll();
    gameStatsModel.saveAll();
    botState.save();
    cacheModel.saveAll();
  } catch (err) {
    console.error('Save on restart failed:', err.message);
  }

  setTimeout(() => process.exit(0), 500);
}

module.exports = {
  broadcast,
  groups,
  mode,
  restart
};