const config = require('../../config');
const dictionary = require('../../services/external/dictionaryClient');

// !define <word>
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *DICTIONARY*
┌─⊶
│ *Usage:* ${config.prefix}define [word]
│ *Example:* ${config.prefix}define serendipity
└─────────────⊶`
    }, { quoted: msg });
  }

  const word = fullText.trim();
  if (word.length > 50) {
    return sock.sendMessage(sender, {
      text: '❌ Word too long! Keep it under 50 characters.'
    }, { quoted: msg });
  }

  const result = await dictionary.lookup(word);

  if (!result.success) {
    return sock.sendMessage(sender, { text: `❌ ${result.error}` }, { quoted: msg });
  }

  const blocks = result.entries.map((entry) => {
    const defs = entry.definitions.map((d, i) => `${i + 1}. ${d}`).join('\n');
    return `*${capitalize(entry.partOfSpeech)}*\n${defs}`;
  });

  const text = `✧ *${result.word.toUpperCase()}*

${blocks.join('\n\n')}`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = { handle };