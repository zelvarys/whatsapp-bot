const config = require('../../config');

// !eval <js>
// Executes JavaScript in the bot's process context.
// Blocked patterns prevent the obvious footguns, but this is still
// an owner-only command — treat it as running arbitrary code.

const BLOCKED_PATTERNS = [
  /process\.exit/i,
  /require\s*\(/i,
  /fs\./i,
  /child_process/i,
  /exec\s*\(/i,
  /spawn\s*\(/i,
  /eval\s*\(/i,
  /Function\s*\(/i
];

async function handle(sock, msg, sender, userJid, args, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *EVAL COMMAND*
┌─⊶
│ *Usage:* ${config.prefix}eval [javascript code]
└─────────────⊶`
    }, { quoted: msg });
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullText)) {
      return sock.sendMessage(sender, {
        text: '❌ Dangerous operation detected!'
      }, { quoted: msg });
    }
  }

  let result;
  try {
    result = eval(fullText);
  } catch (err) {
    result = `Error: ${err.message}`;
  }

  let resultString;
  try {
    resultString = typeof result === 'object'
      ? JSON.stringify(result, null, 2)
      : String(result);
  } catch (err) {
    resultString = `[Result cannot be stringified: ${err.message}]`;
  }

  if (resultString.length > 1500) {
    resultString = resultString.substring(0, 1500) + '...\n[Output truncated]';
  }

  await sock.sendMessage(sender, {
    text: `✧ *EVAL RESULT*\n\n*Code:* ${fullText}\n*Result:* ${resultString}`
  }, { quoted: msg });
}

module.exports = { handle };