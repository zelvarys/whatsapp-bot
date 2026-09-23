const axios = require('axios');
const geminiClient = require('./geminiClient');

const SERVICE_UNAVAILABLE = 'AI service is currently unavailable. Please try again in a few moments.';

function stripTranslationPrefixes(text) {
  let cleaned = text.trim();

  const prefixes = [
    /^Translation:?\s*/i,
    /^English:?\s*/i,
    /^Translated:?\s*/i,
    /^Here(?:'s| is) the translation:?\s*/i,
    /^The translation is:?\s*/i,
    /["']/g
  ];

  for (const pattern of prefixes) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.split('\n')[0].trim();
}

async function googleTranslateFallback(text) {
  try {
    const encoded = encodeURIComponent(text.substring(0, 500));
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encoded}`;

    const response = await axios.get(url, { timeout: 10000 });

    if (
      response.data &&
      response.data[0] &&
      response.data[0][0] &&
      response.data[0][0][0]
    ) {
      return response.data[0][0][0];
    }
  } catch (err) {
    // Fall through
  }

  return null;
}

async function translateToEnglish(text, userId) {
  if (!text || !text.trim()) {
    return { success: false, error: 'No text to translate' };
  }

  const trimmed = text.substring(0, 500);

  const prompt = `Translate this text to English. Return ONLY the translation, no explanations, no extra text:

"${trimmed}"`;

  try {
    const result = await geminiClient.generateText(prompt, {
      temperature: 0.1,
      maxOutputTokens: 500
    });

    if (result && !result.startsWith('❌') && !result.startsWith('⚠️')) {
      const cleaned = stripTranslationPrefixes(result);

      if (cleaned && cleaned.length > 0 && cleaned !== text) {
        return { success: true, translation: cleaned };
      }
    }
  } catch (err) {
    // Fall through to Google
  }

  const fallback = await googleTranslateFallback(text);

  if (fallback) {
    return { success: true, translation: fallback };
  }

  return { success: false, translation: null, error: SERVICE_UNAVAILABLE };
}

module.exports = { translateToEnglish };