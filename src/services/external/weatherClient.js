const axios = require('axios');

// Fetches weather from Open-Meteo. No API key required.
// Geocoding: https://geocoding-api.open-meteo.com/v1/search
// Forecast:  https://api.open-meteo.com/v1/forecast

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO weather interpretation codes → human-readable text
const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

async function geocode(city) {
  const response = await axios.get(GEO_URL, {
    params: { name: city, count: 1, language: 'en', format: 'json' },
    timeout: 10000
  });

  if (!response.data || !response.data.results || response.data.results.length === 0) {
    return null;
  }

  const hit = response.data.results[0];

  return {
    name: hit.name,
    country: hit.country,
    admin1: hit.admin1,
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone
  };
}

async function getWeather(city) {
  if (!city || !city.trim()) {
    return { success: false, error: 'No city provided' };
  }

  try {
    const place = await geocode(city.trim());
    if (!place) {
      return { success: false, error: `Could not find "${city}"` };
    }

    const response = await axios.get(FORECAST_URL, {
      params: {
        latitude: place.latitude,
        longitude: place.longitude,
        current_weather: true,
        daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: 3
      },
      timeout: 10000
    });

    const data = response.data;
    if (!data || !data.current_weather || !data.daily) {
      return { success: false, error: 'Weather service returned no data' };
    }

    const current = data.current_weather;
    const daily = data.daily;

    const result = {
      place: place.name,
      country: place.country,
      region: place.admin1 || null,
      current: {
        temperature: current.temperature,
        windspeed: current.windspeed,
        weatherCode: current.weathercode,
        description: WEATHER_CODES[current.weathercode] || 'Unknown'
      },
      forecast: daily.time.slice(0, 3).map((date, i) => ({
        date,
        maxTemp: daily.temperature_2m_max[i],
        minTemp: daily.temperature_2m_min[i],
        weatherCode: daily.weathercode[i],
        description: WEATHER_CODES[daily.weathercode[i]] || 'Unknown',
        precipitationChance: daily.precipitation_probability_max[i]
      }))
    };

    return { success: true, data: result };
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    return { success: false, error: 'Weather service unavailable' };
  }
}

module.exports = { getWeather, geocode, WEATHER_CODES };