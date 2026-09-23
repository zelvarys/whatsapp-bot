function initialize() {
  global.userData = {};
  global.gameStats = {};
  global.commandCache = new Map();

  global.botMode = 'public';
  global.chatbotState = false;

  global.activeGames = new Map();
  global.tictactoeGames = new Map();
  global.gameLobbies = new Map();

  global.userCooldowns = new Map();
  global.userLastCommand = new Map();
  global.aiCooldowns = new Map();
  global.aiUsage = new Map();

  global.groupData = {};
  global.chatHistory = {};

  global.botMessageIds = new Set();
  global.gameMessageIds = new Set();
  global.helpMessageIds = new Map();

  global.botInstance = null;

  global.botStats = global.botStats || {
    messagesReceived: 0,
    commandsExecuted: 0,
    gamesPlayed: 0,
    startTime: new Date()
  };
}

module.exports = { initialize };