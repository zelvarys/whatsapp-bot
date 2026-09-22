const config = require('../../config');
const geminiClient = require('../../services/ai/geminiClient');
const storyGenerator = require('../../services/ai/storyGenerator');

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

  if (!storyGenerator.canUse(userJid)) {
    return sock.sendMessage(sender, {
      text: "❌ You've reached your daily AI limit. Try again tomorrow!"
    }, { quoted: msg });
  }

  try {
    const prompt = `Answer the following question directly and concisely. No greetings, no preamble, no personality. Go straight to the answer.

Question: ${fullText}`;

    const aiResponse = await geminiClient.generateText(prompt, {});

    if (!aiResponse) {
      return sock.sendMessage(sender, {
        text: "I couldn't come up with a response."
      }, { quoted: msg });
    }

    const cleaned = stripGreetingPrefix(aiResponse);

    await sock.sendMessage(sender, { text: cleaned }, { quoted: msg });
  } catch (err) {
    console.error('Ask command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ I encountered an error while processing your request. Try again later.'
    }, { quoted: msg });
  }
}

// Removes common greeting or filler openers in case the model adds one.
function stripGreetingPrefix(text) {
  let cleaned = text.trim();

  const prefixes = [
    /^(Hey there!?|Hi there!?|Hello there!?|Hello!?|Hey!?)\s*/i,
    /^(Sure!?|Of course!?|Certainly!?|Absolutely!?)\s*/i,
    /^(Alright,?\s*|Okay,?\s*|Well,?\s*|So,?\s*|Ah,?\s*)\s*/i,
    /^(Here(?:'s| is) (?:the|an?)?\s*(?:answer|response)[:.]?\s*)/i
  ];

  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }

  return cleaned.trim();
}

module.exports = { handle };