const config = require('../../config');
const userModel = require('../../models/userModel');
const { getTierName, getLevelProgress } = require('../../utils/formatHelpers');

async function handle(sock, msg, sender, userJid) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const targetJid = mentioned && mentioned.length ? mentioned[0] : userJid;

  const user = userModel.getUser(targetJid);
  const rank = userModel.getUserRank(targetJid);
  const tier = getTierName(user.level);
  const { progress, nextLevelXp, bar } = getLevelProgress(user.xp);

  const achievementsBlock = user.achievements.length > 0
    ? `\n  *Achievements:*\n${user.achievements.map((a) => `• ${a}`).join('\n')}`
    : ' ▸ *No achievements yet*';

  const text = `✧ *USER PROFILE*
╒═══════════════════╕

┌─⊶ *BASIC INFO*
│ *Name:* ${user.username}
│ *Tier:* ${tier}
│ *Global Rank:* #${rank}
│ *Level:* ${user.level} (${progress}% to next)
│
│ ${bar}
└─────────────⊶

┌─⊶ *STATISTICS*
│ *Games Played:* ${user.gamesPlayed}
│ *Games Won:* ${user.gamesWon}
│ *Win Rate:* ${user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0}%
└─────────────⊶

┌─⊶ *PROGRESS*
│ *XP:* ${user.xp}
│ *Next Level:* ${nextLevelXp} XP needed
│ *Joined:* ${new Date(user.joinDate).toLocaleDateString()}
└─────────────⊶
${achievementsBlock}

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

module.exports = { handle };