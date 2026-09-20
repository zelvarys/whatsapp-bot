require('dotenv').config();

// Reads required env vars and fails fast if any are missing.
// Keys that are optional or have fallbacks are not enforced.

const required = [
  'OWNER_NUMBER',
  'BOT_NAME',
  'BOT_PREFIX'
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const geminiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5
].filter((key) => key && key !== 'your_gemini_api_key');

if (geminiKeys.length === 0) {
  console.error('❌ No valid Gemini API keys found. At least one is required.');
  process.exit(1);
}

module.exports = {
  ownerNumber: process.env.OWNER_NUMBER,
  botName: process.env.BOT_NAME,
  prefix: process.env.BOT_PREFIX,
  adminPassword: process.env.ADMIN_PASSWORD,
  geminiApiKeys: geminiKeys,
  dailyAiLimit: parseInt(process.env.DAILY_AI_LIMIT) || 30
};