const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

class WeatherError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.name = "WeatherError";
        this.statusCode = statusCode;
    }
}

function describeWeatherCode(code, isDay) {
    const descriptions = {
        0: ["Clear sky", isDay ? "☀️" : "🌙"],
        1: ["Mainly clear", isDay ? "🌤️" : "🌙"],
        2: ["Partly cloudy", "⛅"],
        3: ["Overcast", "☁️"],
        45: ["Fog", "🌫️"],
        48: ["Depositing rime fog", "🌫️"],
        51: ["Light drizzle", "🌦️"],
        53: ["Moderate drizzle", "🌦️"],
        55: ["Dense drizzle", "🌧️"],
        56: ["Light freezing drizzle", "🌧️"],
        57: ["Dense freezing drizzle", "🌧️"],
        61: ["Slight rain", "🌧️"],
        63: ["Moderate rain", "🌧️"],
        65: ["Heavy rain", "🌧️"],
        66: ["Light freezing rain", "🌧️"],
        67: ["Heavy freezing rain", "🌧️"],
        71: ["Slight snow", "🌨️"],
        73: ["Moderate snow", "🌨️"],
        75: ["Heavy snow", "❄️"],
        77: ["Snow grains", "❄️"],
        80: ["Slight rain showers", "🌦️"],
        81: ["Moderate rain showers", "🌧️"],
        82: ["Violent rain showers", "🌧️"],
        85: ["Slight snow showers", "🌨️"],
        86: ["Heavy snow showers", "❄️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm with slight hail", "⛈️"],
        99: ["Thunderstorm with heavy hail", "⛈️"]
    };
    return descriptions[code] || ["Conditions unavailable", "🌡️"];
}

/** Fetch current conditions for a selected latitude/longitude from Open-Meteo. */
async function getCurrentWeather(latitude, longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90
        || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        throw new WeatherError("Select a valid location before requesting weather.", 400);
    }

    const url = new URL(FORECAST_URL);
    url.search = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm",
        timezone: "auto"
    }).toString();

    let response;
    try {
        response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    } catch {
        throw new WeatherError("Could not reach the weather service. Please try again.");
    }
    if (!response.ok) {
        throw new WeatherError("The weather service is temporarily unavailable.");
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new WeatherError("The weather service returned an invalid response.");
    }

    const current = data && data.current;
    if (!current || !Number.isFinite(current.temperature_2m)) {
        throw new WeatherError("Current conditions are not available for this location.");
    }

    const [condition, icon] = describeWeatherCode(current.weather_code, current.is_day === 1);
    return {
        time: current.time || null,
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        precipitation: current.precipitation,
        condition,
        icon,
        units: data.current_units || {}
    };
}

module.exports = { getCurrentWeather, WeatherError };
