// Removes @mentions from a message body so we can tell whether the user
// actually wrote anything beyond tagging the bot.

function stripMentions(text) {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(/@\d+/g, '');
  cleaned = cleaned.replace(/@[\w\s]+?(?=\s|$)/gi, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

module.exports = { stripMentions };