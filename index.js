const WhatsAppBot = require('./src/core/whatsappBot');
const globalState = require('./src/core/globalState');
const periodicCleanup = require('./src/system/periodicCleanup');

// Initialize all global containers first — everything downstream
// expects them to already exist.
globalState.initialize();

const bot = new WhatsAppBot();
bot.start();

// Graceful shutdown handlers.
process.on('SIGINT', () => periodicCleanup.handleShutdown('SIGINT'));
process.on('SIGTERM', () => periodicCleanup.handleShutdown('SIGTERM'));

// Last-resort logging for crashes we didn't catch.
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});