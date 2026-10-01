const axios = require('axios');
const config = require('../../config');

// Fetches crypto prices from CoinGecko. Results are cached for five
// minutes. The supported coin list is fixed, so the cache can never grow
// beyond that.

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

    // CoinGecko occasionally returns partial payloads. Reject them early
    // so the command layer never has to worry about undefined prices.
    if (typeof data.usd !== 'number') {
      throw new Error('Missing usd price');
    }

    if (typeof data.ngn !== 'number') {
      data.ngn = 0;
    }

    cache.set(coin, { data, timestamp: Date.now() });

    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Failed to fetch price' };
  }
}

module.exports = { getPrice };