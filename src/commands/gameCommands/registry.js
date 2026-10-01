const config = require('../../config');
const soloGames = require('./soloGames');
const duoGames = require('./duoGames');
const lobbyGames = require('./lobbyGames');

async function showGames(sock, msg, sender) {
  const text = `✧ *AVAILABLE GAMES*
╒═══════════════════╕

┌─⊶ *SOLO GAMES*
│• game trivia
│• game hangman
│• game riddle
│• game guess
│• game flag
│• game scramble
└─────────────⊶

┌─⊶ *PLAY A FRIEND*
│• ttt start @friend
│• ttt bot — versus AI
│• ttt end — resign
└─────────────⊶

┌─⊶ *LOBBY GAMES*
│• bombshell
│• cluster
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

async function startGame(sock, msg, sender, userJid, args, bot) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Specify a game type!\n*Usage:* ${config.prefix}game trivia`
    }, { quoted: msg });
  }

  const type = args[0].toLowerCase();

  switch (type) {
    case 'guess':    return soloGames.guess(sock, msg, sender, userJid, bot);
    case 'trivia':   return soloGames.trivia(sock, msg, sender, userJid, bot);
    case 'scramble': return soloGames.scramble(sock, msg, sender, userJid, bot);
    case 'riddle':   return soloGames.riddle(sock, msg, sender, userJid, bot);
    case 'flag':     return soloGames.flag(sock, msg, sender, userJid, bot);
    case 'hangman':  return soloGames.hangman(sock, msg, sender, userJid, bot);
    default:
      return sock.sendMessage(sender, {
        text: `❌ Unknown game type!\nUse ${config.prefix}games to see available games`
      }, { quoted: msg });
  }
}

async function bombshell(sock, msg, sender, userJid) {
  return lobbyGames.bombshell(sock, msg, sender, userJid);
}

async function cluster(sock, msg, sender, userJid) {
  return lobbyGames.cluster(sock, msg, sender, userJid);
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
    case 'start': return duoGames.start(sock, msg, sender, userJid, args);
    case 'bot':   return duoGames.startBot(sock, msg, sender, userJid);
    case 'end':   return duoGames.end(sock, msg, sender, userJid);
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
  tictactoeHandleReply: duoGames.handleReply,
  tictactoeOwnsReply: duoGames.ownsReply
};