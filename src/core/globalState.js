// Initializes the global.* containers used across the codebase.
// Called once at startup before anything else touches these globals.

function initialize() {
  // Persistent stores — loaded from disk by the model layer.
  global.userData = {};
  global.gameStats = {};
  global.commandCache = new Map();
  global.afkUsers = new Map();

  // Bot runtime state.
  global.botMode = 'public';
  global.chatbotState = false;

  // Active game state (chat JID → game object).
  global.activeGames = new Map();
  global.tictactoeGames = new Map();

  // Per-user tracking.
  global.userCooldowns = new Map();
  global.userLastCommand = new Map();
  global.aiCooldowns = new Map();
  global.aiUsage = new Map();

  // Group and chat state.
  global.groupData = {};
  global.chatHistory = {};

  // Message tracking — IDs of messages the bot itself sent.
  global.botMessageIds = new Set();
  global.gameMessageIds = new Set();
  global.helpMessageIds = new Map();

  // Bot instance reference, set later by the WhatsAppBot constructor.
  global.botInstance = null;

  // Aggregate counters surfaced by !stats.
  global.botStats = global.botStats || {
    messagesReceived: 0,
    commandsExecuted: 0,
    gamesPlayed: 0,
    startTime: new Date()
  };
}

module.exports = { initialize };