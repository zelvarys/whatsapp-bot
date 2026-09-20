const config = require('../../config');
const userModel = require('../../models/userModel');

// !profile
async function handle(sock, msg, sender, userJid) {
  const user = userModel.getUser(userJid);
  const rank = userModel.getUserRank(userJid);
  const levelProgress = user.xp % 100;

  let tier = 'Newbie';
  if (user.level >= 50) tier = 'Legend';
  else if (user.level >= 30) tier = 'Master';
  else if (user.level >= 20) tier = 'Expert';
  else if (user.level >= 10) tier = 'Advanced';
  else if (user.level >= 5) tier = 'Veteran';

  const nextLevelXP = 100 - (user.xp % 100);
  const bars = 16;
  const filledBars = Math.floor((levelProgress / 100) * bars);
  let progressBar = '';
  for (let i = 0; i < bars; i++) progressBar += i < filledBars ? '█' : '░';

  const achievementsBlock = user.achievements.length > 0
    ? `\n  *Achievements:*\n${user.achievements.map((a) => `• ${a}`).join('\n')}`
    : ' ▸ *No achievements yet*';

  const text = `✧ *USER PROFILE*
╒═══════════════════╕

┌─⊶ *BASIC INFO*
│ *Name:* ${user.username}
│ *Tier:* ${tier}
│ *Global Rank:* #${rank}
│ *Level:* ${user.level} (${levelProgress}% to next)
│
│ ${progressBar}
└─────────────⊶

┌─⊶ *STATISTICS*
│ *Games Played:* ${user.gamesPlayed}
│ *Games Won:* ${user.gamesWon}
│ *Win Rate:* ${user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0}%
└─────────────⊶

┌─⊶ *PROGRESS*
│ *XP:* ${user.xp}
│ *Next Level:* ${nextLevelXP} XP needed
│ *Joined:* ${new Date(user.joinDate).toLocaleDateString()}
└─────────────⊶
${achievementsBlock}

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

module.exports = { handle };