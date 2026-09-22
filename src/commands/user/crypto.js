const config = require('../../config');
const cryptoClient = require('../../services/external/cryptoClient');

async function handle(sock, msg, sender, userJid, args) {
  if (args.length === 0) {
    return sock.sendMessage(sender, {
      text: `✧ *CRYPTO PRICES*\n\n*Usage:* ${config.prefix}crypto [coin]\n*Supported:* ${config.supportedCryptos.join(', ')}`
    }, { quoted: msg });
  }

  const coin = args[0].toLowerCase();

  if (!config.supportedCryptos.includes(coin)) {
    return sock.sendMessage(sender, {
      text: `❌ Unsupported cryptocurrency!\n*Supported:* ${config.supportedCryptos.join(', ')}`
    }, { quoted: msg });
  }

  const result = await cryptoClient.getPrice(coin);

  if (!result.success) {
    return sock.sendMessage(sender, { text: `❌ ${result.error}` }, { quoted: msg });
  }

  const data = result.data;
  const priceUSD = data.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const priceNGN = data.ngn.toLocaleString('en-US', { style: 'currency', currency: 'NGN' });
  const change = data.usd_24h_change ? data.usd_24h_change.toFixed(2) : '0.00';
  const changeEmoji = parseFloat(change) >= 0 ? '📈' : '📉';

  const text = `✧ *${coin.toUpperCase()} PRICE*
╒═══════════════════╕

*Prices:*
💵 *USD:* ${priceUSD}
🇳🇬 *NGN:* ${priceNGN}
${changeEmoji} *24h Change:* ${change}%

*Market Info:*
🏦 *Rank:* #${data.market_cap_rank || 'N/A'}
⏰ *Updated:* ${new Date().toLocaleTimeString()}

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

module.exports = { handle };