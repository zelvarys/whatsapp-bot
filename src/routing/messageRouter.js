const config = require('../config');
const commandRouter = require('./commandRouter');
const gameRouter = require('./gameRouter');
const lobbyRouter = require('./lobbyRouter');
const chatbotRouter = require('./chatbotRouter');
const mentions = require('../utils/mentionHelpers');
const state = require('../utils/stateHelpers');
const ownerChecker = require('../utils/ownerChecker');

async function routeMessage(sock, bot, msg, stats) {
  const sender = msg.key.remoteJid;
  const text = extractMessageText(msg);
  const isGroup = sender.endsWith('@g.us');
  const userJid = msg.key.participant || sender;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const repliedToMessageId = ctx?.stanzaId;

  storeChatHistory(sender, userJid, text);

  if (isGroup) {
    if (global.groupData[sender]) {
      global.groupData[sender].lastActivity = new Date();
    } else {
      global.groupData[sender] = {
        name: 'Unknown Group',
        participants: [],
        lastActivity: new Date(),
        lastFetched: 0
      };
      fetchGroupMetadata(sock, sender).catch(() => {});
    }
  }

  if (global.botMode === 'private') {
    if (!ownerChecker.isOwner(userJid)) {
      if (text && text.startsWith(config.prefix)) {
        await sock.sendMessage(sender, {
          text: '❌ Bot is in Private mode!'
        }, { quoted: msg });
      }
      return;
    }
  }

  // Lobby routing comes first — it owns messages within an active lobby.
  if (global.gameLobbies.has(sender)) {
    const handled = await lobbyRouter.routeLobby(sock, msg, text, sender, userJid);
    if (handled) return;
  }

  const isTagged = mentions.isBotMentioned(msg, text);
  const isReplyToBot = state.isReplyToBot(msg);

  if (text && text.startsWith(config.prefix)) {
    if (stats) stats.commandsExecuted++;
    return commandRouter.routeCommand(sock, bot, msg, text, sender, userJid, isGroup);
  }

  if (text) {
    const handled = await gameRouter.routeGameAnswer(
      sock, msg, text, sender, userJid, repliedToMessageId
    );
    if (handled) {
      if (stats) stats.commandsExecuted++;
      return;
    }
  }

  return chatbotRouter.routeChatbot(
    sock, msg, text, sender, userJid, isGroup, isReplyToBot, isTagged, stats
  );
}

async function fetchGroupMetadata(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    global.groupData[jid] = {
      name: meta.subject,
      participants: meta.participants,
      lastActivity: new Date(),
      lastFetched: Date.now()
    };
  } catch (err) {
    // Leave placeholder
  }
}

function extractMessageText(msg) {
  if (msg.message?.conversation) return msg.message.conversation;
  if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
  if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
  if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
  if (msg.message?.documentMessage?.caption) return msg.message.documentMessage.caption;
  return '';
}

function storeChatHistory(sender, userJid, text) {
  if (!text || !text.trim()) return;

  if (!global.chatHistory[sender]) global.chatHistory[sender] = [];

  global.chatHistory[sender].push({
    sender: userJid,
    text,
    timestamp: Date.now()
  });

  if (global.chatHistory[sender].length > 50) {
    global.chatHistory[sender].shift();
  }
}

module.exports = { routeMessage };