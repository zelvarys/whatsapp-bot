const path = require('path');

// Data files (runtime, user-specific, gitignored)
const dataDir = path.join(__dirname, '../../data');
const userProfilesPath = path.join(dataDir, 'user_profiles.json');
const gameStatisticsPath = path.join(dataDir, 'game_statistics.json');
const botSettingsPath = path.join(dataDir, 'bot_settings.json');

// Content files (static, committed)
const contentDir = path.join(__dirname, '../../content');
const botImagePath = path.join(__dirname, '../../assets/bot_image.jpg');

// Bot identity
const botVersion = '2.0';

// AI limits and timings
const maxAiResponseLength = 4000;
const aiCooldownTime = 10000;
const summaryMaxMessages = 50;
const ttsMaxLength = 200;

const commandCooldown = 2000;
const messageIdTtl = 30 * 60 * 1000;

const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/;
const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/.+/i;
const facebookRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch)\/.+/i;

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

const gameSettings = {
  guessMaxAttempts: 7,
  scrambleMaxAttempts: 5,
  riddleMaxAttempts: 5,
  flagMaxAttempts: 3,
  hangmanMaxWrong: 6
};

// Lobby-based multiplayer settings
const lobbySettings = {
  joinWindowMs: 90 * 1000,
  minPlayers: 3,
  maxPlayers: 8,
  turnTimeoutMs: 20 * 1000,
  pruneIntervalMs: 30 * 1000
};

const tiers = [
  { name: 'Legend', minLevel: 50 },
  { name: 'Champion', minLevel: 30 },
  { name: 'Elite', minLevel: 20 },
  { name: 'Veteran', minLevel: 10 },
  { name: 'Apprentice', minLevel: 5 },
  { name: 'Rookie', minLevel: 1 }
];

const moods = ['roast', 'chill'];
const defaultMood = 'chill';

const commandReactions = {
  ask: '💬',
  story: '✍️',
  translate: '💬',
  summary: '💬',

  reveal: '🔍',
  compress: '📥',
  sticker: '💟',
  define: '🔍',

  crypto: '🪙',
  feedback: '💬',

  song: '🔍',
  download: '📥',
  youtube: '📥',
  tiktok: '📥',
  facebook: '📥',

  broadcast: '🔊'
};

module.exports = {
  dataDir,
  userProfilesPath,
  gameStatisticsPath,
  botSettingsPath,
  contentDir,
  botImagePath,
  botVersion,
  maxAiResponseLength,
  aiCooldownTime,
  summaryMaxMessages,
  ttsMaxLength,
  commandCooldown,
  messageIdTtl,
  youtubeRegex,
  tiktokRegex,
  facebookRegex,
  cryptoApiUrl,
  supportedCryptos,
  gameSettings,
  lobbySettings,
  tiers,
  moods,
  defaultMood,
  commandReactions
};