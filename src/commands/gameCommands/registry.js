const config = require('../../config');
const soloGames = require('./soloGames');
const versusGames = require('./versusGames');
const lobbyGames = require('./lobbyGames');

async function showGames(sock, msg, sender) {
  const text = `✧ *AVAILABLE GAMES*
╒═══════════════════╕

┌─⊶ *SOLO GAMES*
│• game hangman
│• game riddle
│• game flag
│• game guess
│• game trivia
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

async function startGame(sock, msg, sender, args, bot) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `❌ Specify a game type!\n*Usage:* ${config.prefix}game trivia`
    }, { quoted: msg });
  }

  const type = args[0].toLowerCase();

  switch (type) {
    case 'guess':    return soloGames.guess(sock, msg, sender, bot);
    case 'trivia':   return soloGames.trivia(sock, msg, sender, bot);
    case 'scramble': return soloGames.scramble(sock, msg, sender, bot);
    case 'riddle':   return soloGames.riddle(sock, msg, sender, bot);
    case 'flag':     return soloGames.flag(sock, msg, sender, bot);
    case 'hangman':  return soloGames.hangman(sock, msg, sender, bot);
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
    case 'start': return versusGames.start(sock, msg, sender, userJid, args);
    case 'bot':   return versusGames.startBot(sock, msg, sender, userJid);
    case 'end':   return versusGames.end(sock, msg, sender, userJid);
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
  tictactoeHandleReply: versusGames.handleReply,
  tictactoeOwnsReply: versusGames.ownsReply
};