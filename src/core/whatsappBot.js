const fs = require('fs');
const config = require('../config');
const globalState = require('./globalState');
const socketConnection = require('./socketConnection');
const socketEvents = require('./socketEvents');
const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const botState = require('../models/botStateModel');
const cacheModel = require('../models/commandCacheModel');
const afkTracker = require('../utils/afkTracker');
const periodicCleanup = require('../system/periodicCleanup');
const messageTracker = require('../utils/messageTracker');

// Main bot class. Owns the socket, tracks connection state, and
// exposes the small API surface the rest of the code needs.

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.onlineSince = null;
    this.botUserId = null;
    this.botLid = null;
    this.stats = global.botStats;

    this.pairingRequested = false;
    this.pairingCodeShown = false;
    this.phoneNumber = null;
    this.reconnectAttempts = 0;

    this.dataLoaded = false;
  }

  async start() {
    try {
      this.printBanner();
      this.ensureDirectories();

      if (!this.dataLoaded) {
        this.loadData();
        this.dataLoaded = true;
      }

      periodicCleanup.setupIntervals();
      await this.connect();

      global.botInstance = this;
    } catch (err) {
      console.error('❌ Startup error:', err.message);
      setTimeout(() => this.start(), 5000);
    }
  }

  printBanner() {
    console.log(`
══════════════════════════
   ${config.botName} v${config.botVersion}
══════════════════════════
`);
  }

  ensureDirectories() {
    const dirs = ['./temp', './data', './auth_info', './logs'];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  loadData() {
    const userCount = userModel.loadAll();
    gameStatsModel.loadAll();
    botState.load();
    cacheModel.loadAll();
    afkTracker.loadAll();

    console.log(`Loaded user data for ${userCount} users ✅`);
    console.log(`Bot mode: ${global.botMode.toUpperCase()}`);
    console.log(`ChatBot state: ${global.chatbotState ? 'ACTIVE ✅' : 'INACTIVE ❌'}`);
  }

  async connect() {
    const { sock, saveCreds } = await socketConnection.createSocket();

    this.sock = sock;
    this.wrapSendMessage(sock);

    socketEvents.attach(sock, this, saveCreds);
  }

  wrapSendMessage(sock) {
    const original = sock.sendMessage.bind(sock);

    sock.sendMessage = async (jid, content, options = {}) => {
      try {
        const sent = await original(jid, content, options);
        if (sent && sent.key && sent.key.id) {
          messageTracker.trackBotMessage(sent.key.id, jid, options);
        }
        return sent;
      } catch (err) {
        console.error('Send message error:', err.message);
        return null;
      }
    };
  }

  async showStats(sender) {
    const systemStats = require('../system/systemStats');
    return systemStats.showStats(
      sender,
      this.sock,
      this.stats,
      this.isConnected,
      this.onlineSince
    );
  }
}

module.exports = WhatsAppBot;