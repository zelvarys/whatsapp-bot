// Emoji-prefixed console output. Wraps console.log/error/warn so
// the whole codebase uses a consistent log style.

const logger = {
  info(message) {
    console.log(`ℹ️  ${message}`);
  },

  success(message) {
    console.log(`✅ ${message}`);
  },

  warn(message) {
    console.warn(`⚠️  ${message}`);
  },

  error(message, err = null) {
    if (err && err.stack) {
      console.error(`❌ ${message}\n${err.stack}`);
    } else {
      console.error(`❌ ${message}`);
    }
  },

  debug(message) {
    if (process.env.DEBUG === 'true') {
      console.log(`🐛 ${message}`);
    }
  },

  // Plain output without a prefix — used for banners and multi-line blocks.
  raw(message) {
    console.log(message);
  }
};

module.exports = logger;