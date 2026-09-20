const environment = require('./environment');
const commandAliases = require('./commandAliases');
const appConstants = require('./appConstants');

// Single composed config object used throughout the codebase.
// Consumers should import this file only, not its pieces.

module.exports = {
  ...environment,
  ...appConstants,
  commandAliases
};