const config = require('../../config');
const userModel = require('../../models/userModel');

// !mood [roast|neutral|nice]
async function handle(sock, msg, sender, userJid, args) {
  if (!args.length) {
    const current = userModel.getMood(userJid);
    return sock.sendMessage(sender, {
      text: `✧ *AI MOOD*
┌─⊶
│ *Current:* ${describe(current)}
│
│ *Options:*
│ • roast — sarcastic and roastful
│ • neutral — plain factual answers
│ • nice — warm and supportive
│
│ *Usage:* ${config.prefix}mood [roast/neutral/nice]
└─────────────⊶`
    }, { quoted: msg });
  }

  const mood = args[0].toLowerCase();

  if (!config.moods.includes(mood)) {
    return sock.sendMessage(sender, {
      text: `❌ Invalid mood! Choose one of: ${config.moods.join(', ')}`
    }, { quoted: msg });
  }

  userModel.setMood(userJid, mood);

  await sock.sendMessage(sender, {
    text: `✅ AI mood set to ${describe(mood)}`
  }, { quoted: msg });
}

function describe(mood) {
  if (mood === 'roast') return '🔥 Roastful';
  if (mood === 'nice') return '💚 Nice';
  return '⚪ Neutral';
}

module.exports = { handle };