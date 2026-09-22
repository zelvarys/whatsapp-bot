const config = require('../../config');
const weatherClient = require('../../services/external/weatherClient');

// !weather <city>
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *WEATHER*
┌─⊶
│ *Usage:* ${config.prefix}weather [city]
│ *Example:* ${config.prefix}weather Lagos
└─────────────⊶`
    }, { quoted: msg });
  }

  const city = fullText.trim();

  const result = await weatherClient.getWeather(city);

  if (!result.success) {
    return sock.sendMessage(sender, { text: `❌ ${result.error}` }, { quoted: msg });
  }

  const { place, country, current, forecast } = result.data;

  const location = country ? `${place}, ${country}` : place;

  const forecastLines = forecast.map((day, i) => {
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday(day.date);
    return `│ *${label}:* ${day.minTemp}°–${day.maxTemp}°C • ${day.description}${
      day.precipitationChance != null ? ` • ${day.precipitationChance}% rain` : ''
    }`;
  });

  const text = `✧ *WEATHER — ${location}*
╒═══════════════════╕

┌─⊶ *NOW*
│ 🌡️ *Temp:* ${current.temperature}°C
│ 🌤️ *Sky:* ${current.description}
│ 💨 *Wind:* ${current.windspeed} km/h
└─────────────⊶

┌─⊶ *FORECAST*
${forecastLines.join('\n')}
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

function weekday(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long' });
  } catch {
    return dateStr;
  }
}

module.exports = { handle };