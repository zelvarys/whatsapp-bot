const config = require('../config');
const repo = require('./jsonRepository');

// Combined bot state: public/private mode, chatbot on/off, and per-group AI moods.
// Persisted to BOT_SETTINGS_PATH.
// Shape:
//   {
//     mode: 'public' | 'private',
//     chatbot: boolean,
//     groupMoods: { "<groupJid>": "roast" | "chill" }
//   }

function load() {
  const data = repo.readJson(config.botSettingsPath, null);

  if (!data) {
    global.botMode = 'public';
    global.chatbotState = false;
    global.groupMoods = {};
    save();
    return;
  }

  global.botMode = data.mode === 'private' ? 'private' : 'public';
  global.chatbotState = data.chatbot === true;
  global.groupMoods = data.groupMoods && typeof data.groupMoods === 'object'
    ? data.groupMoods
    : {};
}

function save() {
  repo.writeJson(config.botSettingsPath, {
    mode: global.botMode,
    chatbot: global.chatbotState,
    groupMoods: global.groupMoods || {}
  });
}

function setMode(mode) {
  global.botMode = mode;
  save();
}

function setChatbot(enabled) {
  global.chatbotState = enabled;
  save();
}

function getMode() {
  return global.botMode;
}

function isChatbotEnabled() {
  return global.chatbotState;
}

// Returns the mood for a chat JID. Group chats use their stored mood.
// Private chats always return 'chill'.
function getMood(chatJid) {
  if (!chatJid) return config.defaultMood;
  if (!chatJid.endsWith('@g.us')) return 'chill';
  return (global.groupMoods && global.groupMoods[chatJid]) || config.defaultMood;
}

function setMood(chatJid, mood) {
  if (!chatJid.endsWith('@g.us')) return false;
  if (!config.moods.includes(mood)) return false;

  if (!global.groupMoods) global.groupMoods = {};
  global.groupMoods[chatJid] = mood;
  save();
  return true;
}

module.exports = {
  load,
  save,
  setMode,
  setChatbot,
  getMode,
  isChatbotEnabled,
  getMood,
  setMood
};