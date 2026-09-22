const axios = require('axios');

// Fetches word definitions from Wiktionary's REST API.
// Endpoint: https://en.wiktionary.org/api/rest_v1/page/definition/<word>

const API_BASE = 'https://en.wiktionary.org/api/rest_v1/page/definition';

async function lookup(word) {
  if (!word || !word.trim()) {
    return { success: false, error: 'No word provided' };
  }

  const cleaned = word.trim().toLowerCase();

  if (!/^[a-z][a-z\s'-]*$/i.test(cleaned)) {
    return { success: false, error: 'Invalid word format' };
  }

  try {
    const url = `${API_BASE}/${encodeURIComponent(cleaned)}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'IncognitoBot/1.4 (https://github.com/zelvarys)'
      }
    });

    const data = response.data;
    if (!data || !data.en || !Array.isArray(data.en) || data.en.length === 0) {
      return { success: false, error: `No definition found for "${word}"` };
    }

    // data.en is an array of entries, one per part of speech
    const entries = data.en.map((entry) => ({
      partOfSpeech: entry.partOfSpeech || 'unknown',
      definitions: (entry.definitions || [])
        .slice(0, 3)
        .map((def) => cleanDefinition(def.definition))
        .filter(Boolean)
    })).filter((entry) => entry.definitions.length > 0);

    if (entries.length === 0) {
      return { success: false, error: `No usable definitions for "${word}"` };
    }

    return { success: true, word: cleaned, entries };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { success: false, error: `No definition found for "${word}"` };
    }
    console.error('Dictionary lookup error:', err.message);
    return { success: false, error: 'Dictionary service unavailable' };
  }
}

// Wiktionary returns HTML fragments; strip tags and clean up whitespace.
function cleanDefinition(html) {
  if (!html) return '';

  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { lookup };