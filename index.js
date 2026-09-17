const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');
const config = require('./config');

const MessageHandler = require('./handlers/messageHandler');
const DataManager = require('./utils/dataManager');
const CleanupManager = require('./system/cleanupManager');
const SystemMonitor = require('./system/systemMonitor');

global.userData = {};
global.gameStats = {};
global.activeGames = new Map();
global.userCooldowns = new Map();
global.userWarnings = new Map();
global.aiCooldowns = new Map();
global.aiUsage = new Map();
global.nameCache = new Map();
global.groupData = {};
global.chatHistory = {};
global.summaryCache = new Map();
global.helpState = {};
global.replyTracking = new Map();
global.botInstance = null;
global.commandCache = new Map();
global.userLastCommand = new Map();
global.botMessageIds = new Set();
global.helpMessageIds = new Map();
global.gameMessageIds = new Set();
global.tictactoeGames = new Map();
global.chatbotState = false;
global.botMode = "public";

global.botStats = global.botStats || {
  messagesReceived: 0,
  commandsExecuted: 0,
  gamesPlayed: 0,
  startTime: new Date()
};

function askPhoneNumber() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter phone number (digits only, with country code):\n', (answer) => {
      rl.close();
      resolve(answer.replace(/\D/g, ''));
    });
  });
}

class WhatsAppBot {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.onlineSince = null;
    this.botUserId = null;
    this.botLid = null;
    this.downloadMediaMessage = downloadMediaMessage;
    this.stats = global.botStats;
    this.dataLoaded = false;
    this.handlerReady = false;
    this.pairingRequested = false;
    this.pairingCodeShown = false;
    this.phoneNumber = null;
    this.reconnectAttempts = 0;

    global.botInstance = this;

    this.cleanupManager = new CleanupManager();
    this.systemMonitor = new SystemMonitor();

    this.start();
  }

  async start() {
    try {
      console.log(`
╔══════════════════════════════════╗
   ${config.botName} v${config.version}
╚══════════════════════════════════╝
`);

      ['./temp', './data', './auth_info'].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      });

      if (!this.dataLoaded) {
        await DataManager.loadAllData();
        this.dataLoaded = true;
        console.log(`Bot mode: ${global.botMode.toUpperCase()}`);
        console.log(`ChatBot state: ${global.chatbotState ? 'ACTIVE ✅' : 'INACTIVE ❌'}`);
      }

      this.cleanupManager.setupIntervals();
      await this.connect();
    } catch (error) {
      console.error('❌ Startup error:', error);
      setTimeout(() => this.start(), 5000);
    }
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const isRegistered = state.creds.registered;
    console.log(`🔐 Registered: ${isRegistered ? 'YES' : 'NO'}`);

    // Capture bot LID from creds if available (used for mention detection)
    try {
      if (state.creds?.me?.lid) {
        this.botLid = state.creds.me.lid.split(':')[0].split('@')[0];
      }
    } catch (e) {}

    this.sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
      },
      browser: Browsers.macOS("Chrome"),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      shouldSyncHistoryMessage: ({ syncType }) => syncType !== 2,
    });

    this.sock.downloadMediaMessage = this.downloadMediaMessage;

    if (!this.handlerReady) {
      this.messageHandler = new MessageHandler(this.sock, this);
      this.handlerReady = true;
    } else {
      this.messageHandler.sock = this.sock;
      if (this.messageHandler.commandRouter) this.messageHandler.commandRouter.sock = this.sock;
      if (this.messageHandler.messageProcessor) this.messageHandler.messageProcessor.sock = this.sock;
    }

    this.setupEnhancedSendMessage();
    this.setupEventListeners(saveCreds);
  }

  setupEnhancedSendMessage() {
    this.originalSendMessage = this.sock.sendMessage.bind(this.sock);
    this.sock.sendMessage = async (jid, content, options = {}) => {
      try {
        const sentMsg = await this.originalSendMessage(jid, content, options);
        if (sentMsg?.key?.id) this.trackBotMessage(sentMsg.key.id, jid, content, options);
        return sentMsg;
      } catch (error) {
        console.error('Send message error:', error.message);
        return null;
      }
    };
  }

  trackBotMessage(messageId, chatJid, content, options) {
    global.botMessageIds.add(messageId);
    if (options.context?.isGame) global.gameMessageIds.add(messageId);
    setTimeout(() => {
      global.botMessageIds.delete(messageId);
      global.gameMessageIds.delete(messageId);
      global.helpMessageIds.delete(messageId);
    }, 30 * 60 * 1000);
  }

  setupEventListeners(saveCreds) {
    this.sock.ev.on('creds.update', saveCreds);
    this.sock.ev.on('connection.update', (u) => this.handleConnectionUpdate(u));
    this.sock.ev.on('messages.upsert', (m) => this.handleMessagesUpsert(m));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      const isRegistered = this.sock.authState.creds.registered;
      console.log(`🔗 Socket connecting (registered: ${isRegistered})`);

      if (!isRegistered && !this.pairingRequested) {
        await this.requestPairing();
      }
      return;
    }

    if (connection === 'open') {
      this.handleConnectionOpen();
      return;
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isRestartRequired = statusCode === DisconnectReason.restartRequired;

      console.log(`🔌 Closed. Status: ${statusCode} (${isRestartRequired ? 'restart required' : isLoggedOut ? 'logged out' : 'other'})`);

      if (isLoggedOut) {
        console.log('❌ Logged out. Delete ./auth_info and restart to re-pair.');
        process.exit(1);
        return;
      }

      this.isConnected = false;
      this.onlineSince = null;
      this.botUserId = null;

      const alreadyRegistered = this.sock.authState.creds.registered;

      if (!alreadyRegistered && this.pairingCodeShown) {
        console.log('🔄 Reconnecting (waiting for you to enter the pairing code)...');
        setTimeout(() => this.connect(), 3000);
        return;
      }

      this.reconnectAttempts++;
      const delay = isRestartRequired ? 3000 : Math.min(5000 + this.reconnectAttempts * 2000, 30000);
      console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
      setTimeout(() => this.connect(), delay);
    }
  }

  async requestPairing() {
    if (this.pairingRequested) return;
    this.pairingRequested = true;

    try {
      if (!this.phoneNumber) {
        this.phoneNumber = await askPhoneNumber();
        if (!this.phoneNumber || this.phoneNumber.length < 8) {
          console.error('❌ Invalid phone number. Restart the bot.');
          process.exit(1);
        }
      }

      console.log(`⏳ Requesting pairing code for ${this.phoneNumber}...`);
      const code = await this.sock.requestPairingCode(this.phoneNumber);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

      console.log(`\n════════════════════════════════`);
      console.log(`   Your Pairing Code: ${formatted}`);
      console.log(`════════════════════════════════`);
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Settings → Linked Devices → Link a Device');
      console.log('3. Tap "Link with phone number instead"');
      console.log('4. Enter the code above\n');

      this.pairingCodeShown = true;
    } catch (err) {
      console.error('❌ Pairing request failed:', err.message);
      this.pairingRequested = false;
    }
  }

  handleConnectionOpen() {
    this.isConnected = true;
    this.onlineSince = Date.now();
    this.botUserId = this.sock.user?.id;
    this.pairingRequested = true;
    this.pairingCodeShown = true;
    this.reconnectAttempts = 0;

    // Capture LID from creds after connection opens
    try {
      if (this.sock.authState?.creds?.me?.lid) {
        this.botLid = this.sock.authState.creds.me.lid.split(':')[0].split('@')[0];
      }
    } catch (e) {}

    console.log(`\n✅ ${config.botName} is CONNECTED and ready!`);
    console.log(`Bot User ID: ${this.botUserId}`);
    console.log(`Bot LID: ${this.botLid || 'not yet available'}`);
    console.log(`Total users: ${Object.keys(global.userData).length}`);
    console.log(`Online at: ${new Date(this.onlineSince).toLocaleTimeString()}`);

    setTimeout(() => {
      this.sendOnlineNotification().catch(e => console.error('Online notify failed:', e.message));
    }, 30000);
  }

  async sendOnlineNotification() {
    try {
      if (!this.isConnected) return;
      if (!config.ownerNumber) return;
      const ownerJid = config.ownerNumber.replace(/\D/g, '') + '@s.whatsapp.net';
      await this.sock.sendMessage(ownerJid, {
        text: `🎭 ${config.botName} is now ONLINE!`
      });
    } catch (e) {
      console.error('Online notify failed:', e.message);
    }
  }

  async handleMessagesUpsert({ messages }) {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    if (!this.isMessageSentWhileOnline(msg)) return;

    this.stats.messagesReceived++;
    try {
      const isReplyToBot = this.isReplyToBotMessage(msg);
      await this.messageHandler.handleMessage(msg, this.stats, isReplyToBot);
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  }

  isMessageSentWhileOnline(msg) {
    if (!msg.messageTimestamp || !this.onlineSince) return true;
    return (msg.messageTimestamp * 1000) >= (this.onlineSince - 10000);
  }

  isReplyToBotMessage(msg) {
    try {
      if (!this.botUserId) return false;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const chatJid = msg.key.remoteJid;
      if (!chatJid.endsWith('@g.us')) return true;
      if (!ctx) return false;
      const id = ctx.stanzaId;
      return global.botMessageIds.has(id) || global.gameMessageIds.has(id) || global.helpMessageIds.has(id);
    } catch { return false; }
  }

  async showStats(sender) {
    return this.systemMonitor.showStats(sender, this.sock, config, this.stats, this.isConnected, this.onlineSince);
  }

  async broadcastMessage(message, source = 'owner', specificGroups = []) {
    return this.systemMonitor.broadcastMessage(this.sock, message, source, specificGroups);
  }
}

// ---------- START ----------
const bot = new WhatsAppBot();

process.on('SIGINT', () => bot.cleanupManager.handleShutdown('SIGINT'));
process.on('SIGTERM', () => bot.cleanupManager.handleShutdown('SIGTERM'));