const config = require('../../config');
const botState = require('../../models/botStateModel');

// !mood [roast|chill]
// Group-scoped. Any member of the group can change it.
// In DM, replies with a note that mood is group-only.
async function handle(sock, msg, sender, userJid, args) {
  const isGroup = sender.endsWith('@g.us');

  if (!isGroup) {
    return sock.sendMessage(sender, {
      text: '❌ AI mood is set per group and cannot be changed in private chat.'
    }, { quoted: msg });
  }

  if (!args.length) {
    const current = botState.getMood(sender);
    return sock.sendMessage(sender, {
      text: `✧ *GROUP AI MOOD*
┌─⊶
│ *Current:* ${describe(current)}
│
│ *Options:*
│ • roast — sharp and sarcastic
│ • chill — laid-back and friendly
│
│ *Usage:* ${config.prefix}mood [roast/chill]
└─────────────⊶`
    }, { quoted: msg });
  }

  const mood = args[0].toLowerCase();

  if (!config.moods.includes(mood)) {
    return sock.sendMessage(sender, {
      text: `❌ Invalid mood! Choose one of: ${config.moods.join(', ')}`
    }, { quoted: msg });
  }

  const ok = botState.setMood(sender, mood);
  if (!ok) {
    return sock.sendMessage(sender, {
      text: '❌ Failed to set mood. Try again.'
    }, { quoted: msg });
  }

  await sock.sendMessage(sender, {
    text: `✅ This group's AI mood is now ${describe(mood)}`
  }, { quoted: msg });
}

function describe(mood) {
  if (mood === 'roast') return '*Roastful*';
  return '*Chill*';
}

module.exports = { handle };