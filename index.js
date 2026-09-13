const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadMediaMessage } = require('@whiskeysockets/baileys');
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
global.groupSettings = {};
global.activeGames = new Map();
global.userCooldowns = new Map();
global.userWarnings = new Map();
global.userMessageTimestamps = new Map();
global.mutedUsers = new Map();
global.manualMutes = new Map();
global.aiCooldowns = new Map();
global.aiUsage = new Map();
global.imageUsage = new Map();
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
    this.downloadMediaMessage = downloadMediaMessage;
    this.stats = global.botStats;
    this.pairingRequested = false;
    this.dataLoaded = false;
    this.handlerReady = false;
    this.reconnectAttempts = 0;
    global.botInstance = this;

    this.cleanupManager = new CleanupManager();
    this.systemMonitor = new SystemMonitor();

    this.start();
  }

  // ---- One-time setup (directories, data, cleanup) ----
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
        await this.loadChatbotState();
        await this.loadBotMode();
        this.dataLoaded = true;
        console.log('All data loaded successfully ✅');
      }

      this.cleanupManager.setupIntervals();
      await this.connect();
    } catch (error) {
      console.error('❌ Startup error:', error);
      setTimeout(() => this.start(), 5000);
    }
  }

  async loadChatbotState() {
    try {
      const p = './data/chatbot_state.json';
      if (fs.existsSync(p)) {
        const s = JSON.parse(fs.readFileSync(p, 'utf8'));
        global.chatbotState = s.enabled || false;
      } else {
        global.chatbotState = false;
      }
      console.log(`ChatBot state: ${global.chatbotState ? 'ACTIVE ✅' : 'INACTIVE ❌'}`);
    } catch (e) { global.chatbotState = false; }
  }

  async loadBotMode() {
    try {
      const p = './data/bot_mode.json';
      if (fs.existsSync(p)) {
        const m = JSON.parse(fs.readFileSync(p, 'utf8'));
        global.botMode = m.mode || "public";
      } else {
        global.botMode = "public";
      }
      console.log(`Bot mode: ${global.botMode.toUpperCase()} ✅️`);
    } catch (e) { global.botMode = "public"; }
  }

  // ---- Socket connect (called on start & on reconnect) ----
  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const isRegistered = state.creds.registered;
    console.log(`🔐 Registered: ${isRegistered ? 'YES' : 'NO'}`);

    this.sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
      },
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
    });

    this.sock.downloadMediaMessage = this.downloadMediaMessage;

    // Only build MessageHandler once
    if (!this.handlerReady) {
      this.messageHandler = new MessageHandler(this.sock, this);
      this.handlerReady = true;
    } else {
      // Rebind the socket to the handler (socket changed on reconnect)
      this.messageHandler.sock = this.sock;
      this.messageHandler.commandRouter.sock = this.sock;
    }

    this.setupEnhancedSendMessage();
    this.setupEventListeners(saveCreds);

    // If not registered, prompt for pairing code
    if (!isRegistered) {
      // wait a tick for the socket to be ready
      setTimeout(() => this.requestPairing(), 2000);
    }
  }

  async requestPairing() {
    if (this.pairingRequested) return;
    if (this.sock?.authState?.creds?.registered) return;

    this.pairingRequested = true;

    try {
      const phone = await askPhoneNumber();
      if (!phone || phone.length < 8) {
        console.error('❌ Invalid number. Restart the bot.');
        process.exit(1);
      }

      const code = await this.sock.requestPairingCode(phone);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

      console.log(`\n╔══════════════════════════════════╗`);
      console.log(`   Your Pairing Code: ${formatted}`);
      console.log(`╚══════════════════════════════════╝`);
      console.log('WhatsApp → Linked Devices → Link with phone number\n');
    } catch (err) {
      console.error('❌ Pairing request failed:', err.message);
      this.pairingRequested = false;
    }
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

    if (connection === 'open') {
      this.handleConnectionOpen();
      return;
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isRestartRequired = statusCode === DisconnectReason.restartRequired;

      console.log(`🔌 Connection closed. Status: ${statusCode} (${isRestartRequired ? 'restart required' : isLoggedOut ? 'logged out' : 'other'})`);

      if (isLoggedOut) {
        console.log('❌ Logged out. Delete ./auth_info and restart to re-pair.');
        process.exit(1);
      }

      // Everything else: reconnect
      this.isConnected = false;
      this.onlineSince = null;
      this.botUserId = null;

      // If we were still in the "not yet paired" state, don't reset the flag
      // so we don't spam pairing prompts.
      this.reconnectAttempts++;
      const delay = Math.min(3000 + this.reconnectAttempts * 1000, 15000);

      console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
      setTimeout(() => this.connect(), delay);
    }
  }

  handleConnectionOpen() {
    this.isConnected = true;
    this.onlineSince = Date.now();
    this.botUserId = this.sock.user?.id;
    this.pairingRequested = true; // ensure we never prompt again
    this.reconnectAttempts = 0;

    console.log(`\n✅ ${config.botName} is CONNECTED and ready!`);
    console.log(`🤖 Bot User ID: ${this.botUserId}`);
    console.log(`👥 Total users: ${Object.keys(global.userData).length}`);
    console.log(`⏰ Online at: ${new Date(this.onlineSince).toLocaleTimeString()}`);
    console.log(`🚀 Mode: ${global.botMode.toUpperCase()}\n`);

    this.sendOnlineNotification();
  }

  async sendOnlineNotification() {
    try {
      if (config.ownerNumber) {
        await this.sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
          text: `🎭 ${config.botName} is now ONLINE!`
        });
      }
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

//========== START ==========
const bot = new WhatsAppBot();

process.on('SIGINT', () => bot.cleanupManager.handleShutdown('SIGINT'));
process.on('SIGTERM', () => bot.cleanupManager.handleShutdown('SIGTERM'));