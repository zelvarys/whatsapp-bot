import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import readline from 'readline';
import P from 'pino';

// Terminal input helper for phone number
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) =>
  new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  // Persist credentials in the auth_info folder
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false, // Required for pairing code [citation:1]
  });

  // Save credentials whenever they update
  sock.ev.on('creds.update', saveCreds);

  // Handle connection lifecycle
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Request pairing code once, on the first QR event (socket is ready)
    // Requesting immediately after makeWASocket can fail [citation:13]
    if (qr && !sock.authState.creds.registered) {
      const phoneNumber = await question(
        'Enter phone number (digits only, with country code):\n'
      );
      // Sanitize: strip everything except digits [citation:1]
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const code = await sock.requestPairingCode(cleanNumber);
      console.log(`\nYour Pairing Code: ${code}`);
      console.log('Enter this on WhatsApp → Linked Devices → Link with phone number\n');
      rl.close();
    }

    if (connection === 'open') {
      console.log('Connected to WhatsApp!');
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...');
        startBot();
      } else {
        console.log('Logged out. Delete auth_info folder to re-pair.');
      }
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';
    const sender = msg.key.remoteJid;

    console.log(`Received: "${text}" from ${sender}`);

    // Simple command handler
    if (text.toLowerCase() === 'hi') {
      await sock.sendMessage(sender, { text: 'Hello from Termux Bot! 🤖' });
    }
    if (text.toLowerCase() === 'bye') {
      await sock.sendMessage(sender, { text: 'Goodbye! 👋' });
    }
  });
}

startBot();