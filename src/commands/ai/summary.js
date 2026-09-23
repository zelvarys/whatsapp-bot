const config = require('../../config');
const geminiClient = require('../../services/ai/geminiClient');

const SERVICE_UNAVAILABLE = '⚠️ AI service is currently unavailable. Please try again in a few moments.';

async function handle(sock, msg, sender, userJid, args) {
  const limit = args[0] ? parseInt(args[0]) : config.summaryMaxMessages;

  if (!global.chatHistory || !global.chatHistory[sender]) {
    return sock.sendMessage(sender, {
      text: '❌ No chat history found.'
    }, { quoted: msg });
  }

  const messages = global.chatHistory[sender].slice(-limit);

  if (messages.length < 3) {
    return sock.sendMessage(sender, {
      text: `❌ Only ${messages.length} messages. Need at least 3.`
    }, { quoted: msg });
  }

  const conversation = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');

  try {
    const summary = await geminiClient.generateText(
      `Summarize this chat conversation in 4-10 sentences. Go straight to the points, no introduction or greeting:\n\n${conversation}`
    );

    if (!summary) {
      return sock.sendMessage(sender, { text: SERVICE_UNAVAILABLE }, { quoted: msg });
    }

    await sock.sendMessage(sender, {
      text: `Here is a summary of the last ${messages.length} messages:\n\n${summary}`
    }, { quoted: msg });
  } catch (err) {
    console.error('Summary command error:', err.message);
    await sock.sendMessage(sender, { text: SERVICE_UNAVAILABLE }, { quoted: msg });
  }
}

module.exports = { handle };