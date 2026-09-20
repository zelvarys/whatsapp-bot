const { Boom } = require('@hapi/boom');
const { DisconnectReason } = require('@whiskeysockets/baileys');
const readline = require('readline');
const config = require('../config');
const messageRouter = require('../routing/messageRouter');
const messageTracker = require('../utils/messageTracker');

// Wires all socket-level events:
//   - creds.update → persist credentials
//   - connection.update → handle pairing, reconnects, and lifecycle logs
//   - messages.upsert → hand off incoming messages to the router

function attach(sock, bot, saveCreds) {
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => handleConnectionUpdate(sock, bot, update));
  sock.ev.on('messages.upsert', (payload) => handleMessagesUpsert(sock, bot, payload));
}

async function handleConnectionUpdate(sock, bot, update) {
  const { connection, lastDisconnect } = update;

  if (connection === 'connecting') {
    const registered = sock.authState.creds.registered;
    console.log(`🔗 Socket connecting (registered: ${registered})`);

    if (!registered && !bot.pairingRequested) {
      await requestPairing(sock, bot);
    }
    return;
  }

  if (connection === 'open') {
    onConnectionOpen(sock, bot);
    return;
  }

  if (connection === 'close') {
    handleConnectionClose(sock, bot, lastDisconnect);
  }
}

function onConnectionOpen(sock, bot) {
  bot.isConnected = true;
  bot.onlineSince = Date.now();
  bot.botUserId = sock.user?.id;
  bot.pairingRequested = true;
  bot.pairingCodeShown = true;
  bot.reconnectAttempts = 0;

  // Capture the bot's LID from credentials — used for mention detection.
  try {
    const lid = sock.authState?.creds?.me?.lid;
    if (lid) bot.botLid = lid.split(':')[0].split('@')[0];
  } catch (err) {
    // Non-fatal — mention detection will fall back to phone-number matching.
  }

  console.log(`\n✅ ${config.botName} is CONNECTED and ready!`);
  console.log(`Bot User ID: ${bot.botUserId}`);
  console.log(`Bot LID: ${bot.botLid || 'not yet available'}`);
  console.log(`Total users: ${Object.keys(global.userData).length}`);
  console.log(`Online at: ${new Date(bot.onlineSince).toLocaleTimeString()}`);

  // Delay first outbound message — WhatsApp anti-abuse is aggressive
  // on freshly paired devices.
  setTimeout(() => {
    sendOnlineNotification(sock).catch((err) => {
      console.error('Online notification failed:', err.message);
    });
  }, 30000);
}

function handleConnectionClose(sock, bot, lastDisconnect) {
  const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
  const isLoggedOut = statusCode === DisconnectReason.loggedOut;
  const isRestartRequired = statusCode === DisconnectReason.restartRequired;

  console.log(`🔌 Closed. Status: ${statusCode} (${isRestartRequired ? 'restart required' : isLoggedOut ? 'logged out' : 'other'})`);

  if (isLoggedOut) {
    console.log('❌ Logged out. Delete ./auth_info and restart to re-pair.');
    process.exit(1);
    return;
  }

  bot.isConnected = false;
  bot.onlineSince = null;
  bot.botUserId = null;

  const alreadyRegistered = sock.authState.creds.registered;

  // During pairing, 515 fires normally after the code is issued. Reconnect
  // quietly and wait for the user to enter the code on their phone.
  if (!alreadyRegistered && bot.pairingCodeShown) {
    console.log('🔄 Reconnecting (waiting for pairing code)...');
    setTimeout(() => bot.connect(), 3000);
    return;
  }

  bot.reconnectAttempts++;
  const delay = isRestartRequired
    ? 3000
    : Math.min(5000 + bot.reconnectAttempts * 2000, 30000);

  console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
  setTimeout(() => bot.connect(), delay);
}

async function requestPairing(sock, bot) {
  if (bot.pairingRequested) return;
  bot.pairingRequested = true;

  try {
    if (!bot.phoneNumber) {
      bot.phoneNumber = await askPhoneNumber();
      if (!bot.phoneNumber || bot.phoneNumber.length < 8) {
        console.error('❌ Invalid phone number. Restart the bot.');
        process.exit(1);
      }
    }

    console.log(`⏳ Requesting pairing code for ${bot.phoneNumber}...`);
    const code = await sock.requestPairingCode(bot.phoneNumber);
    const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

    console.log('\n════════════════════════════════');
    console.log(`   Your Pairing Code: ${formatted}`);
    console.log('════════════════════════════════');
    console.log('1. Open WhatsApp on your phone');
    console.log('2. Settings → Linked Devices → Link a Device');
    console.log('3. Tap "Link with phone number instead"');
    console.log('4. Enter the code above\n');

    bot.pairingCodeShown = true;
  } catch (err) {
    console.error('❌ Pairing request failed:', err.message);
    bot.pairingRequested = false;
  }
}

function askPhoneNumber() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter phone number (digits only, with country code):\n', (answer) => {
      rl.close();
      resolve(answer.replace(/\D/g, ''));
    });
  });
}

async function sendOnlineNotification(sock) {
  if (!config.ownerNumber) return;
  const ownerJid = config.ownerNumber.replace(/\D/g, '') + '@s.whatsapp.net';
  await sock.sendMessage(ownerJid, {
    text: `🎭 ${config.botName} is now ONLINE!`
  });
}

async function handleMessagesUpsert(sock, bot, { messages }) {
  const msg = messages[0];
  if (!msg.message || msg.key.fromMe) return;

  // Skip messages that predate the current connection — those are
  // history replays, not real-time traffic.
  if (!messageSentWhileOnline(msg, bot)) return;

  bot.stats.messagesReceived++;

  try {
    await messageRouter.routeMessage(sock, bot, msg, bot.stats);
  } catch (err) {
    console.error('Message processing error:', err.message);
  }
}

function messageSentWhileOnline(msg, bot) {
  if (!msg.messageTimestamp || !bot.onlineSince) return true;
  return msg.messageTimestamp * 1000 >= bot.onlineSince - 10000;
}

module.exports = { attach };