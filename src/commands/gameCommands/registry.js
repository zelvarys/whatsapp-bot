const config = require('../../config');
const guessGame = require('./solo/guess');
const triviaGame = require('./solo/trivia');
const scrambleGame = require('./solo/scramble');
const riddleGame = require('./solo/riddle');
const flagGame = require('./solo/flag');
const hangmanGame = require('./solo/hangman');
const tictactoeGame = require('./versus/tictactoe');
const rpsGame = require('./versus/rps');
const bombshellGame = require('./lobby/bombshell');
const clusterGame = require('./lobby/cluster');

async function showGames(sock, msg, sender) {
  const text = `✧ *AVAILABLE GAMES*
╒═══════════════════╕

┌─⊶ *SOLO GAMES*
│• game trivia
│• game hangman
│• game riddle
│• game flag
│• game guess
│• game scramble
└─────────────⊶

┌─⊶ *PLAY A FRIEND*
│• ttt start @friend
│• ttt bot — versus AI
│• ttt end — resign
│• rps [choice]
└─────────────⊶

┌─⊶ *LOBBY GAMES*
│• bombshell
│• cluster
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

async function startGame(sock, msg, sender, args, bot) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Specify a game type!\n*Usage:* ${config.prefix}game trivia`
    }, { quoted: msg });
  }

  const type = args[0].toLowerCase();

  switch (type) {
    case 'guess':    return guessGame.start(sock, msg, sender, bot);
    case 'trivia':   return triviaGame.start(sock, msg, sender, bot);
    case 'scramble': return scrambleGame.start(sock, msg, sender, bot);
    case 'riddle':   return riddleGame.start(sock, msg, sender, bot);
    case 'flag':     return flagGame.start(sock, msg, sender, bot);
    case 'hangman':  return hangmanGame.start(sock, msg, sender, bot);
    default:
      return sock.sendMessage(sender, {
        text: `❌ Unknown game type!\nUse ${config.prefix}games to see available games`
      }, { quoted: msg });
  }
}

async function bombshell(sock, msg, sender, userJid) {
  return bombshellGame.handle(sock, msg, sender, userJid);
}

async function cluster(sock, msg, sender, userJid) {
  return clusterGame.handle(sock, msg, sender, userJid);
}

async function tictactoe(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *TIC TAC TOE*
┌─⊶
│• ttt start @friend
│• ttt bot — versus AI
│• ttt end — resign
└─────────────⊶`
    }, { quoted: msg });
  }

  const action = args[0].toLowerCase();

  switch (action) {
    case 'start': return tictactoeGame.start(sock, msg, sender, userJid, args);
    case 'bot':   return tictactoeGame.startBot(sock, msg, sender, userJid);
    case 'end':   return tictactoeGame.end(sock, msg, sender, userJid);
    default:
      return sock.sendMessage(sender, {
        text: '❌ Invalid action!\n*Use:* start, bot, or end'
      }, { quoted: msg });
  }
}

module.exports = {
  showGames,
  startGame,
  bombshell,
  cluster,
  tictactoe,
  rps: rpsGame.handle,
  tictactoeHandleReply: tictactoeGame.handleReply,
  tictactoeOwnsReply: tictactoeGame.ownsReply
};