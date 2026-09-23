const geminiClient = require('./geminiClient');
const config = require('../../config');

const SERVICE_UNAVAILABLE = 'AI service is currently unavailable. Please try again in a few moments.';

function getTodayKey(userId) {
  const today = new Date().toISOString().split('T')[0];
  return `${userId}_${today}`;
}

function canUse(userId) {
  const key = getTodayKey(userId);
  const used = global.aiUsage.get(key) || 0;

  if (used >= config.dailyAiLimit) return false;

  global.aiUsage.set(key, used + 1);
  return true;
}

async function generateStory(prompt, userId) {
  if (!canUse(userId)) {
    return {
      success: false,
      error: "You've reached your daily AI limit. Try again tomorrow!"
    };
  }

  const storyPrompt = `Write a short story based on this prompt: "${prompt}"

Requirements:
- Under 600 words
- Engaging and creative
- Start directly with the story, no title, no intro like "Here's a story"
- No markdown formatting
- End with a satisfying conclusion`;

  try {
    const text = await geminiClient.generateText(storyPrompt, {
      temperature: 0.9,
      maxOutputTokens: 4096
    });

    if (!text || text.length < 20) {
      return { success: false, error: SERVICE_UNAVAILABLE };
    }

    return { success: true, story: text.trim() };
  } catch (err) {
    console.error('Story generation error:', err.message);
    return { success: false, error: SERVICE_UNAVAILABLE };
  }
}

module.exports = { generateStory, canUse };