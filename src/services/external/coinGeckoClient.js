const axios = require('axios');
const config = require('../../config');

// Fetches crypto prices from CoinGecko. Results cached for 5 minutes.

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

async function getPrice(coin) {
  if (!config.supportedCryptos.includes(coin)) {
    return { success: false, error: 'Unsupported cryptocurrency' };
  }

  const cached = cache.get(coin);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { success: true, data: cached.data };
  }

  try {
    const url = `${config.cryptoApiUrl}?ids=${coin}&vs_currencies=usd,ngn&include_24hr_change=true`;
    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data || !response.data[coin]) {
      throw new Error('No data returned');
    }

    const data = response.data[coin];
    cache.set(coin, { data, timestamp: Date.now() });

    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Failed to fetch price' };
  }
}

module.exports = { getPrice };