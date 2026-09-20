const path = require('path');

// Data files (runtime, user-specific, gitignored)
const dataDir = path.join(__dirname, '../../data');
const userProfilesPath = path.join(dataDir, 'user_profiles.json');
const gameStatisticsPath = path.join(dataDir, 'game_statistics.json');
const botSettingsPath = path.join(dataDir, 'bot_settings.json');
const commandCachePath = path.join(dataDir, 'command_cache.json');

// Content files (static, committed)
const contentDir = path.join(__dirname, '../../content');

// Asset files
const botImagePath = path.join(__dirname, '../../assets/bot_image.jpg');

// Bot identity
const botVersion = '1.3';

// AI limits and timings
const maxAiResponseLength = 4000;
const aiCooldownTime = 10000;
const summaryMaxMessages = 50;
const ttsMaxLength = 200;
const maxFileSize = 15 * 1024 * 1024;

// Command cooldown (ms) applied per user per command
const commandCooldown = 2000;
// How long command cache entries stay valid (ms)
const commandCacheTtl = 300000;
// How long sent-message IDs stay tracked (ms)
const messageIdTtl = 30 * 60 * 1000;

// Media download platform regexes
const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;
const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/.+/i;
const facebookRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch)\/.+/i;

// Link detection (kept for future use)
const linkPatterns = [
  /https?:\/\/(?:www\.)?[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?/gi,
  /www\.[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?/gi,
  /bit\.ly\/[^\s]+/gi,
  /t\.me\/[^\s]+/gi,
  /wa\.me\/[^\s]+/gi
];

// Crypto
const cryptoApiUrl = 'https://api.coingecko.com/api/v3/simple/price';
const supportedCryptos = [
  'bitcoin',
  'ethereum',
  'bnb',
  'solana',
  'cardano',
  'ripple',
  'dogecoin'
];

// Games
const gameSettings = {
  guessMaxAttempts: 7,
  triviaMaxAttempts: 5,
  scrambleMaxAttempts: 5,
  riddleMaxAttempts: 5,
  flagMaxAttempts: 3,
  tictactoeTimeLimit: 120
};

// Reaction per command. `null` means no reaction.
const commandReactions = {
  ask: '💬',
  story: '✍️',
  translate: '💬',
  summary: '💬',
  tts: null,
  chatbot: null,

  reveal: '🔍',
  compress: '📥',
  pdf: '📥',
  sticker: '💟',
  qrcode: null,
  delete: null,

  profile: null,
  leaderboard: null,
  register: null,
  crypto: '🪙',
  feedback: '💬',

  games: null,
  game: null,
  rps: null,
  tictactoe: null,

  song: '🎵',
  download: '📥',
  youtube: '📥',
  tiktok: '📥',
  facebook: '📥',

  broadcast: '🔊',
  eval: null,
  groups: null,
  mode: null,

  owner: null,
  help: null,
  ping: null,
  stats: null
};

module.exports = {
  dataDir,
  userProfilesPath,
  gameStatisticsPath,
  botSettingsPath,
  commandCachePath,
  contentDir,
  botImagePath,
  botVersion,
  maxAiResponseLength,
  aiCooldownTime,
  summaryMaxMessages,
  ttsMaxLength,
  maxFileSize,
  commandCooldown,
  commandCacheTtl,
  messageIdTtl,
  youtubeRegex,
  tiktokRegex,
  facebookRegex,
  linkPatterns,
  cryptoApiUrl,
  supportedCryptos,
  gameSettings,
  commandReactions
};