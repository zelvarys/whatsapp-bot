const config = require('../../config');
const storyGenerator = require('../../services/ai/storyGenerator');

async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `❌ Provide a prompt!\n*Usage:* ${config.prefix}story [prompt]`
    }, { quoted: msg });
  }

  if (fullText.length > 300) {
    return sock.sendMessage(sender, {
      text: '❌ Prompt too long! Keep it under 300 characters.'
    }, { quoted: msg });
  }

  const result = await storyGenerator.generateStory(fullText, userJid);

  if (!result.success) {
    return sock.sendMessage(sender, { text: `❌ ${result.error}` }, { quoted: msg });
  }

  await sock.sendMessage(sender, { text: result.story }, { quoted: msg });
}

module.exports = { handle };