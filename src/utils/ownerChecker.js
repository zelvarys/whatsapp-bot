const config = require('../config');

// Single source of truth for owner detection.
// Accepts a WhatsApp JID in any format (phone number, LID, with device suffix).
// Checks both hardcoded owner IDs and the configured ownerNumber from .env.

const HARDCODED_OWNER_NUMBER = '119138735378638';
const HARDCODED_OWNER_LID = '119138735378638@lid';

function isOwner(userJid) {
  if (!userJid || typeof userJid !== 'string') return false;

  const cleanJid = userJid.split('@')[0].split(':')[0];

  // Match hardcoded owner identities
  if (cleanJid === HARDCODED_OWNER_NUMBER) return true;
  if (userJid === HARDCODED_OWNER_LID) return true;

  // Match configured ownerNumber
  const configured = config.ownerNumber;
  if (!configured) return false;

  const cleanConfigured = configured.replace('+', '').replace(/\D/g, '');
  if (cleanJid === cleanConfigured) return true;

  return false;
}

module.exports = { isOwner };