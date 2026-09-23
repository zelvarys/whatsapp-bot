const config = require('../config');
const fs = require('fs');

const ownerChecker = require('../utils/ownerChecker');
const state = require('../utils/stateHelpers');
const suggestions = require('../utils/suggestionHelpers');
const reactions = require('../utils/messageReactions');
const cache = require('../models/commandCacheModel');

const askCmd = require('../commands/ai/ask');
const storyCmd = require('../commands/ai/story');
const translateCmd = require('../commands/ai/translate');
const ttsCmd = require('../commands/ai/tts');
const summaryCmd = require('../commands/ai/summary');
const chatbotCmd = require('../commands/ai/chatbot');

const profileCmd = require('../commands/user/profile');
const leaderboardCmd = require('../commands/user/leaderboard');
const registerCmd = require('../commands/user/register');
const cryptoCmd = require('../commands/user/crypto');
const feedbackCmd = require('../commands/user/feedback');
const moodCmd = require('../commands/user/mood');

const gameRegistry = require('../commands/games/registry');
const bombshellCmd = require('../commands/games/bombshell');
const hotseatCmd = require('../commands/games/hotseat');

const stickerCmd = require('../commands/utility/sticker');
const compressCmd = require('../commands/utility/compress');
const pdfCmd = require('../commands/utility/pdf');
const qrcodeCmd = require('../commands/utility/qrcode');
const revealCmd = require('../commands/utility/reveal');
const deleteCmd = require('../commands/utility/delete');
const pingCmd = require('../commands/utility/ping');
const helpCmd = require('../commands/utility/help');
const ownerInfoCmd = require('../commands/utility/owner-info');
const statsCmd = require('../commands/utility/stats');
const defineCmd = require('../commands/utility/define');
const weatherCmd = require('../commands/utility/weather');

const downloadCmd = require('../commands/media/download');
const songCmd = require('../commands/media/song');
const youtubeCmd = require('../commands/media/youtube');
const tiktokCmd = require('../commands/media/tiktok');
const facebookCmd = require('../commands/media/facebook');

const broadcastCmd = require('../commands/owner/broadcast');
const groupsCmd = require('../commands/owner/groups');
const modeCmd = require('../commands/owner/mode');
const restartCmd = require('../commands/owner/restart');

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
    case 'ask':
      return askCmd.handle(sock, msg, sender, userJid, fullText);
    case 'story':
      return storyCmd.handle(sock, msg, sender, userJid, fullText);
    case 'translate':
      return translateCmd.handle(sock, msg, sender, userJid, args);
    case 'tts':
      return ttsCmd.handle(sock, msg, sender, userJid, fullText);
    case 'summary':
      return summaryCmd.handle(sock, msg, sender, userJid, args);
    case 'chatbot':
      return chatbotCmd.handle(sock, msg, sender, userJid, args);
    case 'mood':
      return moodCmd.handle(sock, msg, sender, userJid, args);

    case 'games':
      return gameRegistry.showGames(sock, msg, sender);
    case 'game':
      return gameRegistry.startGame(sock, msg, sender, args, bot);
    case 'hangman':
      return gameRegistry.hangman(sock, msg, sender, bot);
    case 'bombshell':
      return bombshellCmd.handle(sock, msg, sender, userJid);
    case 'hotseat':
      return hotseatCmd.handle(sock, msg, sender, userJid);
    case 'tictactoe':
      return gameRegistry.tictactoe(sock, msg, sender, userJid, args);
    case 'rps':
      return gameRegistry.rps(sock, msg, sender, userJid, args);
    case 'guess':
      return gameRegistry.guess(sock, msg, sender, userJid, args);
    case 'answer':
      return gameRegistry.answer(sock, msg, sender, userJid, args);
    case 'unscramble':
      return gameRegistry.unscramble(sock, msg, sender, userJid, args);
    case 'solve':
      return gameRegistry.solve(sock, msg, sender, userJid, args);
    case 'flag':
      return gameRegistry.flag(sock, msg, sender, userJid, args);

    case 'profile':
      return profileCmd.handle(sock, msg, sender, userJid);
    case 'leaderboard':
      return leaderboardCmd.handle(sock, msg, sender, args);
    case 'register':
      return registerCmd.handle(sock, msg, sender, userJid, args);
    case 'crypto':
      return cryptoCmd.handle(sock, msg, sender, userJid, args);
    case 'feedback':
      return feedbackCmd.handle(sock, msg, sender, userJid, fullText);

    case 'sticker':
      return stickerCmd.handle(sock, msg, sender);
    case 'compress':
      return compressCmd.handle(sock, msg, sender);
    case 'pdf':
      return pdfCmd.handle(sock, msg, sender, userJid, args);
    case 'qrcode':
      return qrcodeCmd.handle(sock, msg, sender, userJid, fullText);
    case 'reveal':
      return revealCmd.handle(sock, msg, sender);
    case 'delete':
      return deleteCmd.handle(sock, msg, sender, userJid);
    case 'ping':
      return pingCmd.handle(sock, msg, sender);
    case 'help':
      return helpCmd.handle(sock, sender);
    case 'owner':
      return ownerInfoCmd.handle(sock, msg, sender);
    case 'stats':
      return statsCmd.handle(sock, sender);
    case 'define':
      return defineCmd.handle(sock, msg, sender, userJid, fullText);
    case 'weather':
      return weatherCmd.handle(sock, msg, sender, userJid, fullText);

    case 'download':
      return downloadCmd.handle(sock, msg, sender, userJid, fullText);
    case 'song':
      return songCmd.handle(sock, msg, sender, userJid, fullText);
    case 'youtube':
      return youtubeCmd.handle(sock, msg, sender, userJid, fullText);
    case 'tiktok':
      return tiktokCmd.handle(sock, msg, sender, userJid, fullText);
    case 'facebook':
      return facebookCmd.handle(sock, msg, sender, userJid, fullText);

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
    case 'broadcast': return broadcastCmd.handle(sock, msg, sender, userJid, args, fullText);
    case 'groups':    return groupsCmd.handle(sock, msg, sender);
    case 'mode':      return modeCmd.handle(sock, msg, sender, userJid, args);
    case 'restart':   return restartCmd.handle(sock, msg, sender);
  }
}

async function handleUnknown(sock, msg, sender, command) {
  const suggestionText = suggestions.suggestCommand(command, config.prefix) || '!help';

  await sock.sendMessage(sender, {
    text: `❌ Unknown command!\nType ${config.prefix}menu to view all available commands.\n\n▸ Did you mean: ${suggestionText}`
  }, { quoted: msg });
}

module.exports = { routeCommand };