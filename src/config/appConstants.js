const path = require('path');

// Data files (runtime, user-specific, gitignored)
const DATA_DIR = path.join(__dirname, '../../data');
const USER_PROFILES_PATH = path.join(DATA_DIR, 'user_profiles.json');
const GAME_STATISTICS_PATH = path.join(DATA_DIR, 'game_statistics.json');
const BOT_SETTINGS_PATH = path.join(DATA_DIR, 'bot_settings.json');
const COMMAND_CACHE_PATH = path.join(DATA_DIR, 'command_cache.json');

// Content files (static, committed)
const CONTENT_DIR = path.join(__dirname, '../../content');

// Asset files
const BOT_IMAGE_PATH = path.join(__dirname, '../../assets/bot_image.jpg');

// Bot identity
const BOT_VERSION = '1.3.0';

// AI limits and timings
const MAX_AI_RESPONSE_LENGTH = 4000;
const AI_COOLDOWN_TIME = 10000;
const SUMMARY_MAX_MESSAGES = 50;
const TTS_MAX_LENGTH = 200;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Command cooldown (ms) applied per user per command
const COMMAND_COOLDOWN = 2000;
// How long command cache entries stay valid (ms)
const COMMAND_CACHE_TTL = 300000;
// How long sent-message IDs stay tracked (ms)
const MESSAGE_ID_TTL = 30 * 60 * 1000;

// Media download platform regexes
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;
const INSTAGRAM_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/;
const TIKTOK_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com)\/@[^\/]+\/video\/(\d+)/;

// Link detection used by nothing currently; kept for future use
const LINK_PATTERNS = [
  /https?:\/\/(?:www\.)?[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?/gi,
  /www\.[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?/gi,
  /bit\.ly\/[^\s]+/gi,
  /t\.me\/[^\s]+/gi,
  /wa\.me\/[^\s]+/gi
];

// Crypto
const CRYPTO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const SUPPORTED_CRYPTOS = [
  'bitcoin',
  'ethereum',
  'bnb',
  'solana',
  'cardano',
  'ripple',
  'dogecoin'
];

// Games
const GAME_SETTINGS = {
  guessMaxAttempts: 7,
  triviaMaxAttempts: 5,
  scrambleMaxAttempts: 5,
  riddleMaxAttempts: 5,
  flagMaxAttempts: 3,
  tictactoeTimeLimit: 120
};

// Reaction per command. `null` means no reaction.
// Uses the same keys as command names after alias resolution.
const COMMAND_REACTIONS = {
  // AI
  ask: '💬',
  story: '✍️',
  translate: '💬',
  summary: '💬',
  tts: null,
  chatbot: null,

  // Utility
  reveal: '🔍',
  compress: '📥',
  pdf: '📥',
  sticker: '💟',
  qrcode: null,
  delete: null,

  // User
  profile: null,
  leaderboard: null,
  register: null,
  crypto: '🪙',
  feedback: '💬',

  // Games (no start reaction; ✅/❌ applied to answers only)
  games: null,
  game: null,
  rps: null,
  tictactoe: null,

  // Media
  song: '🎵',
  download: '📥',
  youtube: '📥',
  instagram: '📥',
  tiktok: '📥',

  // Owner
  broadcast: '🔊',
  eval: null,
  groups: null,
  mode: null,

  // Misc
  owner: null,
  help: null,
  ping: null,
  stats: null
};

module.exports = {
  DATA_DIR,
  USER_PROFILES_PATH,
  GAME_STATISTICS_PATH,
  BOT_SETTINGS_PATH,
  COMMAND_CACHE_PATH,
  CONTENT_DIR,
  BOT_IMAGE_PATH,
  BOT_VERSION,
  MAX_AI_RESPONSE_LENGTH,
  AI_COOLDOWN_TIME,
  SUMMARY_MAX_MESSAGES,
  TTS_MAX_LENGTH,
  MAX_FILE_SIZE,
  COMMAND_COOLDOWN,
  COMMAND_CACHE_TTL,
  MESSAGE_ID_TTL,
  YOUTUBE_REGEX,
  INSTAGRAM_REGEX,
  TIKTOK_REGEX,
  LINK_PATTERNS,
  CRYPTO_API_URL,
  SUPPORTED_CRYPTOS,
  GAME_SETTINGS,
  COMMAND_REACTIONS
};