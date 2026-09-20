const config = require('../../config');
const geminiClient = require('../../services/ai/geminiClient');

// !ask <question>
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `❌ Provide a question!\n*Usage:* ${config.prefix}ask [your question]`
    }, { quoted: msg });
  }

  if (fullText.length > 500) {
    return sock.sendMessage(sender, {
      text: '❌ Question too long! Keep it under 500 characters.'
    }, { quoted: msg });
  }

  try {
    const aiResponse = await geminiClient.generateText(fullText);
    await sock.sendMessage(sender, { text: aiResponse || "I couldn't come up with a response." }, { quoted: msg });
  } catch (err) {
    console.error('Ask command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ I encountered an error while processing your request. Try again later.'
    }, { quoted: msg });
  }
}

module.exports = { handle };