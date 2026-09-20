const config = require('../../config');
const guessGame = require('./guess');
const triviaGame = require('./trivia');
const scrambleGame = require('./scramble');
const riddleGame = require('./riddle');
const flagGame = require('./flag');
const rpsGame = require('./rps');
const tictactoeGame = require('./tictactoe');

// !games — lists available games.
async function showGames(sock, msg, sender) {
  const text = `✧ *AVAILABLE GAMES*
╒═══════════════════╕

┌─⊶ *MAIN GAMES*
│• game guess
│• game trivia
│• game riddle
│• game flag
│• game scramble
└─────────────⊶

┌─⊶ *TIC TAC TOE*
│• ttt start @friend
│• ttt bot - versus AI
│• ttt end - End game
└─────────────⊶

┌─⊶ *OTHER GAMES*
│• rps [choice]
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

// !game <type> — dispatches to the right start function.
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
    default:
      return sock.sendMessage(sender, {
        text: `❌ Unknown game type!\nUse ${config.prefix}games to see available games`
      }, { quoted: msg });
  }
}

// !ttt — dispatches subcommands.
async function tictactoe(sock, msg, sender, userJid, args) {
  if (!args.length) {
    return sock.sendMessage(sender, {
      text: `✧ *TIC TAC TOE*
┌─⊶
│• ttt start @friend
│• ttt bot - versus AI
│• ttt end - End game
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
  tictactoe,
  guess: guessGame.guess,
  answer: triviaGame.answer,
  unscramble: scrambleGame.unscramble,
  solve: riddleGame.solve,
  flag: flagGame.flag,
  rps: rpsGame.handle,
  tictactoeHandleReply: tictactoeGame.handleReply,
  tictactoeOwnsReply: tictactoeGame.ownsReply
};