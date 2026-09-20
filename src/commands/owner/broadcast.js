const config = require('../../config');
const jidHelpers = require('../../utils/jidHelpers');

// !broadcast <message>
// Sends a message to every group the bot is in.
// No confirmation prompt — the command fires immediately.
// The result is DM'd to the owner, not posted in the group where it was invoked.

async function handle(sock, msg, sender, userJid, args, fullText) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *BROADCAST COMMAND*
┌─⊶
│ *Usage:* ${config.prefix}broadcast [message]
└─────────────⊶`
    }, { quoted: msg });
  }

  const ownerJid = jidHelpers.phoneToUserJid(config.ownerNumber);
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

      // Small delay to avoid rate limits and mimic human pace.
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Broadcast failed for ${groupId}:`, err.message);
      failed++;
    }
  }

  return { success, failed, total: groups.length };
}

module.exports = { handle };