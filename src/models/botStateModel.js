const config = require('../config');
const repo = require('./jsonRepository');

// Combined bot state: public/private mode and chatbot on/off.

function load() {
  const data = repo.readJson(config.botSettingsPath, null);

  if (!data) {
    global.botMode = 'public';
    global.chatbotState = false;
    save();
    return;
  }

  global.botMode = data.mode === 'private' ? 'private' : 'public';
  global.chatbotState = data.chatbot === true;
}

function save() {
  repo.writeJson(config.botSettingsPath, {
    mode: global.botMode,
    chatbot: global.chatbotState
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

module.exports = {
  load,
  save,
  setMode,
  setChatbot,
  getMode,
  isChatbotEnabled
};