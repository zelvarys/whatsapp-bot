const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');

// Creates the Baileys socket and wires up credential persistence.
// Pairing, reconnection, and event handling are done by the caller.

async function createSocket() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
    },
    browser: Browsers.macOS('Chrome'),
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,

    // Required on Baileys 6.7.20+: without this callback, all history
    // sync types get rejected, which breaks LID mapping and inbound
    // message routing. We only reject FULL (2).
    shouldSyncHistoryMessage: ({ syncType }) => syncType !== 2
  });

  // Expose the media downloader on the socket for convenience.
  sock.downloadMediaMessage = downloadMediaMessage;

  return { sock, saveCreds };
}

module.exports = { createSocket };