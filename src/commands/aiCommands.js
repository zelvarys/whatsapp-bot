const config = require('../config');
const geminiClient = require('../services/ai/geminiClient');
const storyGenerator = require('../services/ai/storyGenerator');
const translationEngine = require('../services/ai/translationEngine');
const ttsEngine = require('../services/media/textToSpeechEngine');
const botState = require('../models/botStateModel');
const ownerChecker = require('../utils/ownerChecker');

const SERVICE_UNAVAILABLE = '⚠️ AI service is currently unavailable. Please try again in a few moments.';

// -------------------- ask --------------------

async function ask(sock, msg, sender, userJid, fullText) {
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
      return sock.sendMessage(sender, { text: SERVICE_UNAVAILABLE }, { quoted: msg });
    }

    const cleaned = stripGreetingPrefix(aiResponse);

    await sock.sendMessage(sender, { text: cleaned }, { quoted: msg });
  } catch (err) {
    console.error('Ask command error:', err.message);
    await sock.sendMessage(sender, { text: SERVICE_UNAVAILABLE }, { quoted: msg });
  }
}

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

// -------------------- story --------------------

async function story(sock, msg, sender, userJid, fullText) {
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

// -------------------- translate --------------------

async function translate(sock, msg, sender, userJid, args) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (!quoted) {
    return sock.sendMessage(sender, {
      text: `✧ *TRANSLATION*
┌─⊶
│ Reply with ${config.prefix}translate
│ I'll translate it to English.
└─────────────⊶`
    }, { quoted: msg });
  }

  let textToTranslate = '';

  if (quoted.conversation) textToTranslate = quoted.conversation;
  else if (quoted.extendedTextMessage?.text) textToTranslate = quoted.extendedTextMessage.text;
  else if (quoted.imageMessage?.caption) textToTranslate = quoted.imageMessage.caption;
  else if (quoted.videoMessage?.caption) textToTranslate = quoted.videoMessage.caption;
  else if (quoted.documentMessage?.caption) textToTranslate = quoted.documentMessage.caption;

  if (!textToTranslate || !textToTranslate.trim()) {
    return sock.sendMessage(sender, {
      text: '❌ The replied message has no text to translate!'
    }, { quoted: msg });
  }

  if (textToTranslate.length > 1000) {
    textToTranslate = textToTranslate.substring(0, 1000) + '...';
  }

  const result = await translationEngine.translateToEnglish(textToTranslate, userJid);

  if (result.success) {
    await sock.sendMessage(sender, {
      text: `*Original:* ${textToTranslate}\n*English:* ${result.translation}`
    }, { quoted: msg });
  } else {
    await sock.sendMessage(sender, {
      text: `❌ Translation failed: ${result.error}`
    }, { quoted: msg });
  }
}

// -------------------- tts --------------------

async function tts(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *TEXT TO SPEECH*
┌─⊶
│ *Usage:* ${config.prefix}tts <text>
│ *Example:* ${config.prefix}tts Zelvarys is Peak
└─────────────⊶`
    }, { quoted: msg });
  }

  if (fullText.length > config.ttsMaxLength) {
    return sock.sendMessage(sender, {
      text: `❌ Text too long! Keep it under ${config.ttsMaxLength} characters.`
    }, { quoted: msg });
  }

  try {
    const voiceNote = await ttsEngine.generateVoiceNote(fullText);

    await sock.sendMessage(sender, {
      audio: voiceNote,
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: msg });
  } catch (err) {
    console.error('TTS command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Failed to generate speech.'
    }, { quoted: msg });
  }
}

// -------------------- summary --------------------

async function summary(sock, msg, sender, userJid, args) {
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
    const summaryText = await geminiClient.generateText(
      `Summarize this chat conversation in 4-10 sentences. Go straight to the points, no introduction or greeting:\n\n${conversation}`
    );

    if (!summaryText) {
      return sock.sendMessage(sender, { text: SERVICE_UNAVAILABLE }, { quoted: msg });
    }

    await sock.sendMessage(sender, {
      text: `Here is a summary of the last ${messages.length} messages:\n\n${summaryText}`
    }, { quoted: msg });
  } catch (err) {
    console.error('Summary command error:', err.message);
    await sock.sendMessage(sender, { text: SERVICE_UNAVAILABLE }, { quoted: msg });
  }
}

// -------------------- chatbot --------------------

async function chatbot(sock, msg, sender, userJid, args) {
  if (args.length === 0) {
    const status = botState.isChatbotEnabled();
    return sock.sendMessage(sender, {
      text: `✧ *CHATBOT MODE*
┌─⊶
│ *Status:* ${status ? '✅ Active' : '❌ Inactive'}
│ *Usage:* ${config.prefix}chatbot on/off
└─────────────⊶`
    }, { quoted: msg });
  }

  const action = args[0].toLowerCase();

  if (action !== 'on' && action !== 'off') {
    return sock.sendMessage(sender, {
      text: `❌ Invalid subcommand!\n*Usage:* ${config.prefix}chatbot on/off`
    }, { quoted: msg });
  }

  if (!ownerChecker.isOwner(userJid)) {
    return sock.sendMessage(sender, {
      text: '❌ Only the bot owner can toggle chatbot mode!'
    }, { quoted: msg });
  }

  const newState = action === 'on';

  if (newState === botState.isChatbotEnabled()) {
    return sock.sendMessage(sender, {
      text: `ChatBot is already ${newState ? 'Active ✅' : 'Inactive ❌'}`
    }, { quoted: msg });
  }

  botState.setChatbot(newState);

  await sock.sendMessage(sender, {
    text: `ChatBot is now ${newState ? 'Active ✅' : 'Inactive ❌'}\n${
      newState ? "I'll start responding to chats!" : "I'll stop responding to chats!"
    }`
  }, { quoted: msg });
}

// -------------------- mood --------------------

async function mood(sock, msg, sender, userJid, args) {
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
│ *Current:* ${describeMood(current)}
│
│ *Options:*
│ • roast — sharp and sarcastic
│ • chill — laid-back and friendly
│
│ *Usage:* ${config.prefix}mood <roast/chill>
└─────────────⊶`
    }, { quoted: msg });
  }

  const selected = args[0].toLowerCase();

  if (!config.moods.includes(selected)) {
    return sock.sendMessage(sender, {
      text: `❌ Invalid mood! Choose one of: ${config.moods.join(', ')}`
    }, { quoted: msg });
  }

  const ok = botState.setMood(sender, selected);
  if (!ok) {
    return sock.sendMessage(sender, {
      text: '❌ Failed to set mood. Try again.'
    }, { quoted: msg });
  }

  await sock.sendMessage(sender, {
    text: `This group's AI mood is now ${describeMood(selected)}`
  }, { quoted: msg });
}

function describeMood(m) {
  if (m === 'roast') return 'Roastful 🔥';
  return 'Chill 😎';
}

module.exports = {
  ask,
  story,
  translate,
  tts,
  summary,
  chatbot,
  mood
};