// JID parsing and mention-stripping helpers.

function jidToPhoneNumber(jid) {
  if (!jid || typeof jid !== 'string') return '';

  const withoutSuffix = jid.split('@')[0];
  const digitsOnly = withoutSuffix.split(':')[0].replace(/\D/g, '');

  if (digitsOnly.startsWith('234')) {
    return '0' + digitsOnly.substring(3);
  }

  return digitsOnly;
}

function jidToIdentifier(jid) {
  if (!jid || typeof jid !== 'string') return '';
  return jid.split('@')[0].split(':')[0];
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

function phoneToUserJid(phoneNumber) {
  const digits = String(phoneNumber).replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

function stripMentions(text) {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(/@\d+/g, '');
  cleaned = cleaned.replace(/@[\w\s]+?(?=\s|$)/gi, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

module.exports = {
  jidToPhoneNumber,
  jidToIdentifier,
  isGroupJid,
  phoneToUserJid,
  stripMentions
};