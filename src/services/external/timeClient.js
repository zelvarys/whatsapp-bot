const { geocode } = require('./weatherClient');

// Returns the current local time in a given city.
// Uses Open-Meteo geocoding for timezone lookup and Intl for formatting.

function formatTime(date, timezone) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (err) {
    return null;
  }
}

async function getTime(city) {
  if (!city || !city.trim()) {
    return { success: false, error: 'No city provided' };
  }

  try {
    const place = await geocode(city.trim());
    if (!place || !place.timezone) {
      return { success: false, error: `Could not find "${city}"` };
    }

    const now = new Date();
    const formatted = formatTime(now, place.timezone);

    if (!formatted) {
      return { success: false, error: 'Could not format time for that timezone' };
    }

    return {
      success: true,
      data: {
        city: place.name,
        country: place.country,
        timezone: place.timezone,
        formatted
      }
    };
  } catch (err) {
    console.error('Time fetch error:', err.message);
    return { success: false, error: 'Time service unavailable' };
  }
}

module.exports = { getTime };