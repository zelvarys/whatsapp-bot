const config = require('../../config');
const userModel = require('../../models/userModel');

// !register <username>
async function handle(sock, msg, sender, userJid, args) {
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

module.exports = { handle };