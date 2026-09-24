const WhatsAppBot = require('./src/core/whatsappBot');
const globalState = require('./src/core/globalState');
const housekeeping = require('./src/utils/housekeepingTasks');

// Initialize all global containers first — everything downstream
// expects them to already exist.
globalState.initialize();

const bot = new WhatsAppBot();
bot.start();

// Graceful shutdown handlers.
process.on('SIGINT', () => housekeeping.handleShutdown('SIGINT'));
process.on('SIGTERM', () => housekeeping.handleShutdown('SIGTERM'));

// Last-resort logging for crashes we didn't catch.
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});