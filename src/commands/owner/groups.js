// !groups
// Lists every group the bot is currently in, with member counts
// and last-activity timestamps.

async function handle(sock, msg, sender) {
  const groups = global.groupData || {};
  const groupKeys = Object.keys(groups);

  if (groupKeys.length === 0) {
    return sock.sendMessage(sender, {
      text: '❌ The bot is not in any groups.'
    }, { quoted: msg });
  }

  let list = `✧ *GROUPS LIST*\n╒═══════════════════╕\n\n`;
  let totalMembers = 0;

  for (let i = 0; i < groupKeys.length; i++) {
    const group = groups[groupKeys[i]];
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

module.exports = { handle };