const config = require('../config');
const commandRouter = require('./commandRouter');
const gameRouter = require('./gameRouter');
const chatbotRouter = require('./chatbotRouter');
const mentionDetector = require('../utils/mentionDetector');
const messageTracker = require('../utils/messageTracker');
const ownerChecker = require('../utils/ownerChecker');

// Top-level message handler. Decides what to do with each incoming message:
//   1. If it starts with the command prefix → commandRouter
//   2. Otherwise, if it's a game answer → gameRouter
//   3. Otherwise → chatbotRouter (tag / reply / private chat)
//
// Private-mode gate happens here so it applies to every path uniformly.

async function routeMessage(sock, bot, msg, stats) {
  const sender = msg.key.remoteJid;
  const text = extractMessageText(msg);
  const isGroup = sender.endsWith('@g.us');
  const userJid = msg.key.participant || sender;

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const repliedToMessageId = ctx?.stanzaId;

  storeChatHistory(sender, userJid, text);
  if (isGroup) await updateGroupData(sock, sender);

  // Private mode: only the owner gets any response at all.
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

  const isTagged = mentionDetector.isBotMentioned(msg, text);
  const isReplyToBot = messageTracker.isReplyToBot(msg);

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

async function updateGroupData(sock, sender) {
  try {
    if (!global.groupData[sender]) {
      const meta = await sock.groupMetadata(sender);
      global.groupData[sender] = {
        name: meta.subject,
        participants: meta.participants,
        lastActivity: new Date(),
        lastFetched: Date.now()
      };
    } else {
      global.groupData[sender].lastActivity = new Date();
    }
  } catch (err) {
    if (!global.groupData[sender]) {
      global.groupData[sender] = {
        name: 'Unknown Group',
        participants: [],
        lastActivity: new Date(),
        lastFetched: Date.now()
      };
    } else {
      global.groupData[sender].lastActivity = new Date();
    }
  }
}

module.exports = { routeMessage };