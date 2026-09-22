const config = require('../../config');
const timeClient = require('../../services/external/timeClient');

// !time <city>
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *TIME*
┌─⊶
│ *Usage:* ${config.prefix}time [city]
│ *Example:* ${config.prefix}time Tokyo
└─────────────⊶`
    }, { quoted: msg });
  }

  const city = fullText.trim();

  const result = await timeClient.getTime(city);

  if (!result.success) {
    return sock.sendMessage(sender, { text: `❌ ${result.error}` }, { quoted: msg });
  }

  const { city: name, country, timezone, formatted } = result.data;
  const location = country ? `${name}, ${country}` : name;

  const text = `✧ *TIME — ${location}*
┌─⊶
│ 🕐 *Local:* ${formatted}
│ 🌍 *Timezone:* ${timezone}
└────────────⊶`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

module.exports = { handle };