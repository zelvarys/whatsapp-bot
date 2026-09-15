require('dotenv').config();

module.exports = {
  ownerNumber: process.env.OWNER_NUMBER,
  botName: process.env.BOT_NAME,
  prefix: process.env.BOT_PREFIX,
  adminPassword: process.env.ADMIN_PASSWORD,
  
  version: "1.3",
  botMode: "public",
  
  USER_DATA_PATH: './data/user_data.json',
  GAME_DATA_PATH: './data/game_data.json',
  GROUP_SETTINGS_PATH: './data/group_settings.json',
  CACHE_DATA_PATH: './data/command_cache.json',
  
  LINK_PATTERNS: [
    /https?:\/\/(?:www\.)?[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?/gi,
    /www\.[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?/gi,
    /bit\.ly\/[^\s]+/gi,
    /t\.me\/[^\s]+/gi,
    /wa\.me\/[^\s]+/gi
  ],
  
  GEMINI_API_KEYS: [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(key => key && key !== "your_gemini_api_key"),
  
  MODEL_ORDER: [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-pro"
  ],
  
  VISION_MODELS: [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-pro-vision"
  ],

  IMAGE_APIS: {
    REPLICATE: {
      enabled: true,
      model: "stability-ai/stable-diffusion"
    },
    POLLINATIONS: {
      enabled: true,
      baseUrl: "https://image.pollinations.ai/prompt"
    }
  },

  MAX_AI_RESPONSE_LENGTH: 1500,
  AI_COOLDOWN_TIME: 10000,
  IMAGE_COOLDOWN_TIME: 30000,
  DAILY_AI_LIMIT: parseInt(process.env.DAILY_AI_LIMIT),
  DAILY_IMAGE_LIMIT: parseInt(process.env.DAILY_IMAGE_LIMIT),
  
  CRYPTO_API_URL: "https://api.coingecko.com/api/v3/simple/price",
  SUPPORTED_CRYPTOS: ['bitcoin', 'ethereum', 'bnb', 'solana', 'cardano', 'ripple', 'dogecoin'],
  
  MAX_FILE_SIZE: 15 * 1024 * 1024,
  TTS_MAX_LENGTH: 500,
  SUMMARY_MAX_MESSAGES: 50,
  
  GAME_SETTINGS: {
    guessingGameAttempts: 7,
    triviaTimeLimit: 30,
    flagGameAttempts: 3,
    wordScrambleTime: 120,
    tictactoeTimeLimit: 120
  },
  
  MEDIA_APIS: {
    YOUTUBE_APIS: [
      "https://api.y2mate.guru/api/convert",
      "https://yt5s.com/api/ajaxSearch/index"
    ],
    INSTAGRAM_APIS: [
      "https://api.savefrom.net/api/convert"
    ],
    TIKTOK_APIS: [
      "https://api.tikmate.app/api/lookup",
      "https://tikdownloader.io/"
    ]
  },
  
  YOUTUBE_REGEX: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/,
  INSTAGRAM_REGEX: /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
  TIKTOK_REGEX: /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com)\/@[^\/]+\/video\/(\d+)/,
  
  COMMAND_ALIASES: {
    'lb': 'leaderboard',
    'top': 'leaderboard',
    'ttt': 'tictactoe',
    'yt': 'youtube',
    'ig': 'instagram',
    'tt': 'tiktok',
    'h': 'help',
    'vv': 'reveal',
    'img': 'image',
    'dl': 'download',
    'qr': 'qrcode',
    'choose': 'choice',
    'c': 'choice',
    'summarize': 'summary',
    'imagine': 'image',
    'generate': 'image',
    'chat': 'ask',
    'me': 'profile',
    'music': 'song',
    'bot': 'chatbot',
    'tr': 'translate',
    'info': 'owner',
    'dev': 'owner',
    'menu': 'commands',
    's': 'sticker',
    'del': 'delete'
  },
  
  AUTO_RESPONSES: {
    "hey bot":"Hey boss!, how can i help you?",
    "who created you": "I was created by Incognito, a backend developer and machine learning enthusiast!",
    "translate": "Reply to any message with !translate to convert it to English!"
  }
};