const fs = require('fs');
const config = require('../config');
const globalState = require('./globalState');
const socketConnection = require('./socketConnection');
const socketEvents = require('./socketEvents');
const userModel = require('../models/userModel');
const gameStatsModel = require('../models/gameStatsModel');
const botState = require('../models/botStateModel');
const cacheModel = require('../models/commandCacheModel');
const housekeeping = require('../utils/housekeepingTasks');
const state = require('../utils/stateHelpers');

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

      housekeeping.setupIntervals();
      await this.connect();

      global.botInstance = this;
    } catch (err) {
      console.error('❌ Startup error:', err.message);
      setTimeout(() => this.start(), 5000);
    }
  }

  printBanner() {
    console.log(`
════════════════════════
   ${config.botName} v${config.botVersion}
════════════════════════
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
          state.trackBotMessage(sent.key.id, jid, options);
        }
        return sent;
      } catch (err) {
        console.error('Send message error:', err.message);
        return null;
      }
    };
  }
}

module.exports = WhatsAppBot;