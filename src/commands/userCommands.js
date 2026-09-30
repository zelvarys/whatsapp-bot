const config = require('../config');
const userModel = require('../models/userModel');
const cryptoClient = require('../services/external/cryptoClient');
const jid = require('../utils/jidHelpers');
const { getTierName, getLevelProgress } = require('../utils/formatHelpers');

// -------------------- profile --------------------

async function profile(sock, msg, sender, userJid) {
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

// -------------------- leaderboard --------------------

async function leaderboard(sock, msg, sender, args) {
  let limit = args[0] ? parseInt(args[0]) : 10;
  if (limit > 100) limit = 100;

  const users = userModel.getLeaderboard(limit);

  let text = `✧ *LEADERBOARD*
╒═════════════════════╕

`;

  users.forEach((user, index) => {
    let prefix = '';
    if (index === 0) prefix = '🥇';
    else if (index === 1) prefix = '🥈';
    else if (index === 2) prefix = '🥉';
    else prefix = `#${index + 1}.`;

    const tier = getTierName(user.level);

    text += `${prefix} ${user.username}\n   Level ${user.level} • ${user.points} points • ${tier}`;

    if (index < users.length - 1) {
      text += '\n─────────────────\n';
    } else {
      text += '\n';
    }
  });

  text += `\n╘═════════════════════╛\n▸ *Total Players:* ${userModel.getAllCount()}`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

// -------------------- register --------------------

async function register(sock, msg, sender, userJid, args) {
  if (args.length === 0) {
    return sock.sendMessage(sender, {
      text: `❌ Please provide a username!\n*Usage:* ${config.prefix}register [username]`
    }, { quoted: msg });
  }

  const username = args[0];

  if (username.length < 3 || username.length > 20) {
    return sock.sendMessage(sender, {
      text: '❌ Username must be 3-20 characters long!'
    }, { quoted: msg });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return sock.sendMessage(sender, {
      text: '❌ Username can only contain letters, numbers, and underscores!'
    }, { quoted: msg });
  }

  const taken = Object.values(global.userData).some(
    (u) => u.username && u.username.toLowerCase() === username.toLowerCase()
  );

  if (taken) {
    return sock.sendMessage(sender, {
      text: '❌ Username is already taken!'
    }, { quoted: msg });
  }

  userModel.updateUser(userJid, { username });

  await sock.sendMessage(sender, {
    text: `✅ *Registered Successfully!*\n• *New Username:* ${username}`
  }, { quoted: msg });
}

// -------------------- crypto --------------------

async function crypto(sock, msg, sender, userJid, args) {
  if (args.length === 0) {
    return sock.sendMessage(sender, {
      text: `✧ *CRYPTO PRICES*\n\n*Usage:* ${config.prefix}crypto <coin>\n*Supported:* ${config.supportedCryptos.join(', ')}`
    }, { quoted: msg });
  }

  const coin = args[0].toLowerCase();

  if (!config.supportedCryptos.includes(coin)) {
    return sock.sendMessage(sender, {
      text: `❌ Unsupported cryptocurrency!\n*Supported:* ${config.supportedCryptos.join(', ')}`
    }, { quoted: msg });
  }

  const result = await cryptoClient.getPrice(coin);

  if (!result.success) {
    return sock.sendMessage(sender, { text: `❌ ${result.error}` }, { quoted: msg });
  }

  const data = result.data;
  const priceUSD = data.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const priceNGN = data.ngn.toLocaleString('en-US', { style: 'currency', currency: 'NGN' });
  const change = data.usd_24h_change ? data.usd_24h_change.toFixed(2) : '0.00';
  const changeEmoji = parseFloat(change) >= 0 ? '📈' : '📉';

  const text = `✧ *${coin.toUpperCase()} PRICE*
╒═══════════════════╕

*Prices:*
💵 *USD:* ${priceUSD}
🇳🇬 *NGN:* ${priceNGN}
${changeEmoji} *24h Change:* ${change}%

*Market Info:*
🏦 *Rank:* #${data.market_cap_rank || 'N/A'}
⏰ *Updated:* ${new Date().toLocaleTimeString()}

╘═══════════════════╛
▸ _Data from CoinGecko API_`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

// -------------------- feedback --------------------

async function feedback(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *FEEDBACK SYSTEM*
┌─⊶
│ *Usage:* ${config.prefix}feedback <message>
│ Send suggestions or bug reports
└─────────────⊶`
    }, { quoted: msg });
  }

  if (fullText.trim().length < 5) {
    return sock.sendMessage(sender, {
      text: '❌ Feedback must be at least 5 characters long!'
    }, { quoted: msg });
  }

  let feedbackText = fullText;
  if (feedbackText.length > 500) feedbackText = feedbackText.substring(0, 500) + '...';

  const userName = userModel.getDisplayName(userJid);

  if (config.ownerNumber) {
    const ownerJid = jid.phoneToUserJid(config.ownerNumber);

    const payload = `✧ *NEW FEEDBACK RECEIVED*

┌─⊶ *USER INFO*
│ *Name:* ${userName}
│ *User ID:* ${userJid}
│ *Chat Type:* ${jid.isGroupJid(sender) ? 'Group' : 'Private'}
│ *Time:* ${new Date().toLocaleString()}
└─────────────⊶

✧ *MESSAGE*
${feedbackText}`;

    await sock.sendMessage(ownerJid, { text: payload });
  }

  await sock.sendMessage(sender, {
    text: "Thank you for your feedback! It has been delivered to the developer team. 💖"
  }, { quoted: msg });
}

module.exports = {
  profile,
  leaderboard,
  register,
  crypto,
  feedback
};