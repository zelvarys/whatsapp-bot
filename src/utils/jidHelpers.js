// WhatsApp JID parsing and formatting utilities.

// Extracts the phone number portion of a JID.
// Handles the @s.whatsapp.net, @lid, and :device suffixes.
// Returns a human-readable number with a leading zero when the country code is Nigerian.
function jidToPhoneNumber(jid) {
  if (!jid || typeof jid !== 'string') return '';

  const withoutSuffix = jid.split('@')[0];
  const digitsOnly = withoutSuffix.split(':')[0].replace(/\D/g, '');

  if (digitsOnly.startsWith('234')) {
    return '0' + digitsOnly.substring(3);
  }

  return digitsOnly;
}

// Strips the device suffix (`:12`) and the @domain from a JID.
// Returns just the identifier portion.
function jidToIdentifier(jid) {
  if (!jid || typeof jid !== 'string') return '';
  return jid.split('@')[0].split(':')[0];
}

// Returns true if the JID belongs to a group chat.
function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

// Builds a DM JID from a raw phone number.
function phoneToUserJid(phoneNumber) {
  const digits = String(phoneNumber).replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

module.exports = {
  jidToPhoneNumber,
  jidToIdentifier,
  isGroupJid,
  phoneToUserJid
};