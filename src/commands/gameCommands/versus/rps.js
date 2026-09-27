const config = require('../../config');
const gameRules = require('../../utils/gameRules');
const userModel = require('../../models/userModel');
const gameStatsModel = require('../../models/gameStatsModel');

// !rps <rock|paper|scissors>
async function handle(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Provide a choice!\n*Usage:* ${config.prefix}rps [rock/paper/scissors]`
    }, { quoted: msg });
  }

  const result = gameRules.playRockPaperScissors(args[0], global.botInstance);

  if (result.won) {
    userModel.addPoints(userJid, 15);
    userModel.addWin(userJid);
    gameStatsModel.increment('rps', 15);
    result.result += ' +15 points!';
  }

  await sock.sendMessage(sender, { text: result.result }, { quoted: msg });
}

module.exports = { handle };