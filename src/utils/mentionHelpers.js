// Detects whether the bot was @mentioned in a message.

const fs = require('fs');
const path = require('path');
const config = require('../config');

function getBotLid() {
  if (global.botInstance && global.botInstance.botLid) {
    return global.botInstance.botLid;
  }

  try {
    const credsPath = path.join(__dirname, '../../auth_info/creds.json');
    if (fs.existsSync(credsPath)) {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (creds && creds.me && creds.me.lid) {
        const lid = creds.me.lid.split(':')[0].split('@')[0];
        if (global.botInstance) global.botInstance.botLid = lid;
        return lid;
      }
    }
  } catch (err) {
    // Caller treats as no LID
  }

  return null;
}

function getBotNumber() {
  const botUserId = global.botInstance ? global.botInstance.botUserId : null;
  if (!botUserId) return null;
  return botUserId.split(':')[0].split('@')[0];
}

function isBotMentioned(msg, text) {
  const botNumber = getBotNumber();
  const botLid = getBotLid();

  const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (Array.isArray(mentionedJids) && mentionedJids.length > 0) {
    const hit = mentionedJids.some((mentionedJid) => {
      const clean = mentionedJid.split(':')[0].split('@')[0];
      if (botNumber && clean === botNumber) return true;
      if (botLid && clean === botLid) return true;
      return false;
    });

    if (hit) return true;
  }

  if (text) {
    const lower = text.toLowerCase();
    if (
      lower.includes('@incognito') ||
      lower.includes('@bot') ||
      lower.includes(`@${config.botName.toLowerCase()}`)
    ) {
      return true;
    }
  }

  return false;
}

module.exports = { isBotMentioned, getBotLid, getBotNumber };