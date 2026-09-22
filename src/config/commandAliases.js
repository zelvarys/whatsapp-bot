// Maps user-typed aliases to their canonical command name.
// Canonical names are what the router switches on.

module.exports = {
  // Leaderboard / profile
  lb: 'leaderboard',
  top: 'leaderboard',
  me: 'profile',

  // Games
  ttt: 'tictactoe',

  // Media
  yt: 'youtube',
  fb: 'facebook',
  tt: 'tiktok',
  dl: 'download',
  music: 'song',

  // AI
  chat: 'ask',
  summarize: 'summary',
  tr: 'translate',
  write: 'story',
  bot: 'chatbot',

  // Utility
  h: 'help',
  menu: 'help',
  vv: 'reveal',
  qr: 'qrcode',
  s: 'sticker',
  del: 'delete',

  // New utilities
  forecast: 'weather',
  temp: 'weather',
  clock: 'time',
  dict: 'define',
  meaning: 'define',
  away: 'afk',
  brb: 'afk',

  // Owner
  info: 'owner',
  dev: 'owner',
  reboot: 'restart',

  // Mood
  personality: 'mood',
  tone: 'mood'
};