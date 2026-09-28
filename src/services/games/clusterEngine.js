const wordValidator = require('../../utils/wordValidator');

const minPlayers = 3;
const maxPlayers = 8;

const START_2 = [
  'BL', 'BR', 'CH', 'CL', 'CR', 'DR', 'FL', 'FR', 'GL', 'GR',
  'PL', 'PR', 'SC', 'SH', 'SK', 'SL', 'SM', 'SN', 'SP', 'ST',
  'SW', 'TH', 'TR', 'TW', 'WH', 'WR'
];

const START_3 = [
  'CHR', 'PHR', 'SCR', 'SHR', 'SPL', 'SPR', 'STR', 'THR'
];

const END_2 = [
  'CK', 'CT', 'FT', 'LD', 'LK', 'LL', 'LT', 'MB', 'MP', 'ND',
  'NG', 'NK', 'NT', 'RD', 'RK', 'RL', 'RM', 'RN', 'RT', 'SH',
  'SK', 'SP', 'ST', 'TH'
];

const END_3 = [
  'CKLE', 'GHT', 'TCH'
];

// Weighted pool. Total probability = 100.
const CHALLENGE_TYPES = [
  { direction: 'start', clusterList: START_2, weight: 35 },
  { direction: 'start', clusterList: START_3, weight: 15 },
  { direction: 'end',   clusterList: END_2,   weight: 35 },
  { direction: 'end',   clusterList: END_3,   weight: 15 }
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickChallenge() {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const type of CHALLENGE_TYPES) {
    cumulative += type.weight;
    if (roll < cumulative) {
      return {
        direction: type.direction,
        cluster: pickRandom(type.clusterList)
      };
    }
  }

  // Fallback — should never hit
  return {
    direction: 'start',
    cluster: pickRandom(START_2)
  };
}

function describeChallenge(challenge) {
  if (challenge.direction === 'start') {
    return `starting with *${challenge.cluster}*`;
  }
  return `ending with *${challenge.cluster}*`;
}

function isValidAnswer(word, challenge) {
  const cleaned = String(word).trim().toUpperCase();

  if (!/^[A-Z]+$/.test(cleaned)) return false;
  if (cleaned.length < 3) return false;
  if (!wordValidator.isWord(cleaned)) return false;

  if (challenge.direction === 'start') {
    return cleaned.startsWith(challenge.cluster);
  }
  return cleaned.endsWith(challenge.cluster);
}

function pickNextPlayer(state) {
  const remaining = state.players.filter((p) => !state.eliminated.includes(p));
  const candidates = remaining.filter((p) => p !== state.currentPlayer);
  if (candidates.length === 0) return remaining[0] || null;
  return pickRandom(candidates);
}

function startGame(orderedPlayers) {
  const state = {
    type: 'cluster',
    players: orderedPlayers.slice(),
    eliminated: [],
    currentPlayer: orderedPlayers[0],
    challenge: pickChallenge(),
    gameMessageId: null,
    lastMessageId: null
  };

  const text = `✧ *CLUSTER — START*

One player at a time. 20 seconds to answer.
Reply with any valid English word ${describeChallenge(state.challenge)}.

🔥 @${state.currentPlayer.split('@')[0]} is on the spot!`;

  return {
    text,
    mentions: [state.currentPlayer],
    state
  };
}

function handleTurn(game, userJid, text) {
  if (game.currentPlayer !== userJid) return null;

  const answer = String(text).trim();

  if (!isValidAnswer(answer, game.challenge)) {
    return eliminatePlayer(game, 'wrong answer');
  }

  const next = pickNextPlayer(game);
  if (!next) {
    return {
      text: '✅ Correct! But no one left to challenge...',
      mentions: [],
      gameOver: null
    };
  }

  game.currentPlayer = next;
  game.challenge = pickChallenge();

  return {
    text: `✅ *${answer}* accepted.

🔥 @${game.currentPlayer.split('@')[0]}, reply with any valid English word ${describeChallenge(game.challenge)}. (20s)`,
    mentions: [game.currentPlayer],
    gameOver: null
  };
}

function handleTimeout(game) {
  return eliminatePlayer(game, 'timeout');
}

function eliminatePlayer(game, reason) {
  const loser = game.currentPlayer;
  game.eliminated.push(loser);

  const remaining = game.players.filter((p) => !game.eliminated.includes(p));

  if (remaining.length === 1) {
    const winner = remaining[0];
    return {
      text: `💥 @${loser.split('@')[0]} is out (${reason})!

🏆 *@${winner.split('@')[0]} WINS CLUSTER!*
▸ +60 points`,
      mentions: [loser, winner],
      gameOver: { winners: [winner], losers: game.eliminated }
    };
  }

  if (remaining.length === 0) {
    return {
      text: `💥 Everyone eliminated. No winner.`,
      mentions: [loser],
      gameOver: { winners: [], losers: game.eliminated }
    };
  }

  game.currentPlayer = pickRandom(remaining);
  game.challenge = pickChallenge();

  return {
    text: `💥 @${loser.split('@')[0]} is out (${reason})!

🔥 @${game.currentPlayer.split('@')[0]}, reply with any valid English word ${describeChallenge(game.challenge)}. (20s)`,
    mentions: [loser, game.currentPlayer],
    gameOver: null
  };
}

module.exports = {
  minPlayers,
  maxPlayers,
  startGame,
  handleTurn,
  handleTimeout
};