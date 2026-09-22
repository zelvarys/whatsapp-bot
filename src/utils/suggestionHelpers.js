// Suggests likely command names when the user mistypes one.

const KNOWN_COMMANDS = [
  'ask', 'story', 'chatbot', 'translate', 'tts', 'summary', 'mood',
  'games', 'game', 'hangman', 'tictactoe', 'rps',
  'define', 'weather',
  'pdf', 'compress', 'qrcode', 'reveal', 'sticker', 'feedback', 'delete',
  'profile', 'leaderboard', 'register', 'owner', 'crypto', 'mode',
  'download', 'song', 'tiktok', 'groups', 'facebook', 'youtube',
  'ping', 'stats', 'help', 'commands', 'menu', 'restart'
];

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function suggestCommand(input, prefix) {
  if (!input) return '';

  const suggestions = [];

  for (const cmd of KNOWN_COMMANDS) {
    if (
      cmd.startsWith(input) ||
      input.includes(cmd) ||
      levenshteinDistance(input, cmd) <= 2
    ) {
      suggestions.push(cmd);
    }
  }

  return suggestions
    .slice(0, 3)
    .map((cmd) => `${prefix}${cmd}`)
    .join(', ');
}

module.exports = { suggestCommand, levenshteinDistance };