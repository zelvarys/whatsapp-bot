const config = require('../config');

// Matches a user JID against the configured owner number and owner LID.
// WhatsApp may deliver the same person as either a phone-number JID or a
// LID depending on context, so both formats must be checked.

function isOwner(userJid) {
  if (!userJid || typeof userJid !== 'string') return false;

  const cleanJid = userJid.split('@')[0].split(':')[0];

  const ownerNumber = config.ownerNumber;
  if (ownerNumber) {
    const cleanNumber = String(ownerNumber).replace(/\D/g, '');
    if (cleanJid === cleanNumber) return true;
  }

  const ownerLid = config.ownerLid;
  if (ownerLid) {
    const cleanLid = String(ownerLid).split('@')[0].split(':')[0];
    if (cleanJid === cleanLid) return true;
  }

  return false;
}

module.exports = { isOwner };