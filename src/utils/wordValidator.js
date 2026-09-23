const fs = require('fs');
const path = require('path');

// Loads an English word list once and exposes O(1) lookups.
// Uses the word-list npm package which ships ~275k lowercase words.

let wordSet = null;

function loadWords() {
  if (wordSet) return wordSet;

  try {
    const wordListPath = require('word-list');
    const raw = fs.readFileSync(wordListPath, 'utf8');

    wordSet = new Set(
      raw
        .split('\n')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
    );

    console.log(`📖 Word validator loaded ${wordSet.size} words`);
  } catch (err) {
    console.error('❌ Failed to load word list:', err.message);
    wordSet = new Set();
  }

  return wordSet;
}

function isWord(text) {
  if (!text) return false;
  loadWords();
  return wordSet.has(String(text).trim().toLowerCase());
}

function size() {
  loadWords();
  return wordSet.size;
}

module.exports = { isWord, size, loadWords };