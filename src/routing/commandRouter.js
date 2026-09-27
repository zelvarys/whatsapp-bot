const config = require('../config');

const ownerChecker = require('../utils/ownerChecker');
const state = require('../utils/stateHelpers');
const suggestions = require('../utils/suggestionHelpers');
const reactions = require('../utils/messageReactions');
const cache = require('../models/cacheModel');

const askCmd = require('../commands/aiCommands/ask');
const storyCmd = require('../commands/aiCommands/story');
const translateCmd = require('../commands/aiCommands/translate');
const ttsCmd = require('../commands/aiCommands/tts');
const summaryCmd = require('../commands/aiCommands/summary');
const chatbotCmd = require('../commands/aiCommands/chatbot');
const moodCmd = require('../commands/aiCommands/mood');

const gameRegistry = require('../commands/gameCommands/registry');

const defineCmd = require('../commands/utilityCommands/define');
const weatherCmd = require('../commands/utilityCommands/weather');
const stickerCmd = require('../commands/utilityCommands/sticker');
const compressCmd = require('../commands/utilityCommands/compress');
const qrcodeCmd = require('../commands/utilityCommands/qrcode');
const revealCmd = require('../commands/utilityCommands/reveal');
const deleteCmd = require('../commands/utilityCommands/delete');

const mediaCommands = require('../commands/mediaCommands');
const userCommands = require('../commands/userCommands');
const ownerCommands = require('../commands/ownerCommands');
const otherCommands = require('../commands/otherCommands');

const CACHEABLE = ['profile', 'games', 'help', 'owner'];

async function routeCommand(sock, bot, msg, text, sender, userJid, isGroup) {
  if (text === `${config.prefix}!!` || text === '!!') {
    const repeated = state.getLastCommand(userJid);
    if (!repeated) {
      return sock.sendMessage(sender, {
        text: '⚠️ No previous command to repeat!'
      }, { quoted: msg });
    }
    text = repeated;
  }

  state.storeLastCommand(userJid, text, config.prefix);

  const args = text.slice(config.prefix.length).trim().split(/ +/);
  let command = args.shift().toLowerCase();
  const fullText = text.slice(config.prefix.length + command.length).trim();

  if (config.commandAliases[command]) {
    command = config.commandAliases[command];
  }

  if (CACHEABLE.includes(command)) {
    const key = `${command}_${args.join('_')}`;
    const cached = cache.get(key);
    if (cached) {
      return sock.sendMessage(sender, { text: cached }, { quoted: msg });
    }
  }

  if (state.checkCooldown(userJid, command)) return;

  const emoji = reactions.getReactionForCommand(command);
  let reactionApplied = false;

  try {
    if (emoji) {
      await reactions.applyReaction(sock, sender, msg.key, emoji);
      reactionApplied = true;
    }

    await dispatch(sock, bot, command, msg, sender, userJid, args, fullText, isGroup);
  } catch (err) {
    console.error(`Command "${command}" failed:`, err.message);

    await reactions.applyReaction(sock, sender, msg.key, '❌');
    reactionApplied = false;

    await sock.sendMessage(sender, {
      text: '❌ An error occurred while executing the command. Please try again later.'
    }, { quoted: msg });
  } finally {
    if (reactionApplied) {
      await reactions.removeReaction(sock, sender, msg.key);
    }
  }
}

async function dispatch(sock, bot, command, msg, sender, userJid, args, fullText, isGroup) {
  switch (command) {
    // AI
    case 'ask':      return askCmd.handle(sock, msg, sender, userJid, fullText);
    case 'story':    return storyCmd.handle(sock, msg, sender, userJid, fullText);
    case 'translate':return translateCmd.handle(sock, msg, sender, userJid, args);
    case 'tts':      return ttsCmd.handle(sock, msg, sender, userJid, fullText);
    case 'summary':  return summaryCmd.handle(sock, msg, sender, userJid, args);
    case 'chatbot':  return chatbotCmd.handle(sock, msg, sender, userJid, args);
    case 'mood':     return moodCmd.handle(sock, msg, sender, userJid, args);

    // Games
    case 'games':     return gameRegistry.showGames(sock, msg, sender);
    case 'game':      return gameRegistry.startGame(sock, msg, sender, args, bot);
    case 'bombshell': return gameRegistry.bombshell(sock, msg, sender, userJid);
    case 'hotseat':   return gameRegistry.hotseat(sock, msg, sender, userJid);
    case 'tictactoe': return gameRegistry.tictactoe(sock, msg, sender, userJid, args);
    case 'rps':       return gameRegistry.rps(sock, msg, sender, userJid, args);

    // Utility
    case 'define':   return defineCmd.handle(sock, msg, sender, userJid, fullText);
    case 'weather':  return weatherCmd.handle(sock, msg, sender, userJid, fullText);
    case 'sticker':  return stickerCmd.handle(sock, msg, sender);
    case 'compress': return compressCmd.handle(sock, msg, sender);
    case 'qrcode':   return qrcodeCmd.handle(sock, msg, sender, userJid, fullText);
    case 'reveal':   return revealCmd.handle(sock, msg, sender);
    case 'delete':   return deleteCmd.handle(sock, msg, sender, userJid);

    // User
    case 'profile':     return userCommands.profile(sock, msg, sender, userJid);
    case 'leaderboard': return userCommands.leaderboard(sock, msg, sender, args);
    case 'register':    return userCommands.register(sock, msg, sender, userJid, args);
    case 'crypto':      return userCommands.crypto(sock, msg, sender, userJid, args);
    case 'feedback':    return userCommands.feedback(sock, msg, sender, userJid, fullText);

    // Media
    case 'download':  return mediaCommands.download(sock, msg, sender, userJid, fullText);
    case 'youtube':   return mediaCommands.youtube(sock, msg, sender, userJid, fullText);
    case 'tiktok':    return mediaCommands.tiktok(sock, msg, sender, userJid, fullText);
    case 'facebook':  return mediaCommands.facebook(sock, msg, sender, userJid, fullText);
    case 'song':      return mediaCommands.song(sock, msg, sender, userJid, fullText);

    // Other
    case 'help':   return otherCommands.help(sock, sender);
    case 'ping':   return otherCommands.ping(sock, msg, sender);
    case 'stats':  return otherCommands.stats(sock, sender);
    case 'owner':  return otherCommands.ownerInfo(sock, msg, sender);

    // Owner only
    case 'broadcast':
    case 'groups':
    case 'mode':
    case 'restart':
      if (!ownerChecker.isOwner(userJid)) {
        return sock.sendMessage(sender, {
          text: '❌ This command is only available to the bot owner!'
        }, { quoted: msg });
      }
      return dispatchOwner(sock, command, msg, sender, userJid, args, fullText);

    default:
      return handleUnknown(sock, msg, sender, command);
  }
}

async function dispatchOwner(sock, command, msg, sender, userJid, args, fullText) {
  switch (command) {
    case 'broadcast': return ownerCommands.broadcast(sock, msg, sender, userJid, args, fullText);
    case 'groups':    return ownerCommands.groups(sock, msg, sender);
    case 'mode':      return ownerCommands.mode(sock, msg, sender, userJid, args);
    case 'restart':   return ownerCommands.restart(sock, msg, sender);
  }
}

async function handleUnknown(sock, msg, sender, command) {
  const suggestionText = suggestions.suggestCommand(command, config.prefix) || '!help';

  await sock.sendMessage(sender, {
    text: `❌ Unknown command!\nType ${config.prefix}menu to view all available commands.\n\n▸ Did you mean: ${suggestionText}`
  }, { quoted: msg });
}

module.exports = { routeCommand };