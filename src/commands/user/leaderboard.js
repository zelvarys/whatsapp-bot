const config = require('../../config');
const userModel = require('../../models/userModel');
const { getTierName } = require('../../utils/tierCalculator');

// !leaderboard [limit]
async function handle(sock, msg, sender, args) {
  let limit = args[0] ? parseInt(args[0]) : 10;
  if (limit > 100) limit = 100;

  const users = userModel.getLeaderboard(limit);

  let text = `✧ *LEADERBOARD*
╒═════════════════════╕

`;

  users.forEach((user, index) => {
    let medal = `#${index + 1}`;
    if (index === 0) medal = '🥇 #1';
    else if (index === 1) medal = '🥈 #2';
    else if (index === 2) medal = '🥉 #3';

    const tier = getTierName(user.level);

    text += `${medal} ${user.username}\n   Level ${user.level} • ${user.points} points • ${tier}`;

    if (index < users.length - 1) {
      text += '\n─────────────────\n';
    } else {
      text += '\n';
    }
  });

  text += `\n╘═════════════════════╛\n▸ *Total Players:* ${userModel.getAllCount()}`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

module.exports = { handle };