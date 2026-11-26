const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

class WeatherError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.name = "WeatherError";
        this.statusCode = statusCode;
    }
}

function describeWeatherCode(code, isDay, temperature = null, lowTemperature = temperature) {
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
    const [condition, defaultIcon] = descriptions[code] || ["Conditions unavailable", "🌡️"];

    // For dry/clear conditions, let the live forecast temperature influence the icon.
    // Precipitation and severe-weather icons remain condition-led for clarity.
    if ([0, 1, 2, 3].includes(code) && Number.isFinite(temperature)) {
        if (Number.isFinite(lowTemperature) && lowTemperature <= 0) return [condition, "🥶"];
        if (temperature <= 8) return [condition, "🧣"];
        if (temperature >= 32) return [condition, "🥵"];
        if (temperature >= 25 && code <= 1) return [condition, "☀️"];
    }

    return [condition, defaultIcon];
}

function formatLocalTime(value) {
    if (typeof value !== "string") return null;
    const match = value.match(/T(\d{2}):(\d{2})/);
    if (!match) return null;

    const hour24 = Number(match[1]);
    const minute = Number(match[2]);
    if (hour24 > 23 || minute > 59) return null;

    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
}

function buildWeatherSuggestions(current, today) {
    const suggestions = [];
    const snowCodes = [71, 73, 75, 77, 85, 86];
    const wetWeatherCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

    if (snowCodes.includes(current.weather_code) || snowCodes.includes(today.weatherCode)) {
        suggestions.push({ icon: "🧤", message: "Snow is possible—wear warm layers and shoes with good grip." });
    } else if (wetWeatherCodes.includes(current.weather_code)
        || current.precipitation > 0
        || (Number.isFinite(today.precipitationProbability) && today.precipitationProbability >= 50)) {
        suggestions.push({ icon: "☂️", message: "Rain is possible today—consider carrying an umbrella." });
    }

    if (current.temperature_2m <= 0) {
        suggestions.push({ icon: "🧤", message: "It's freezing—wear a warm coat and gloves." });
    } else if (current.temperature_2m <= 16) {
        suggestions.push({ icon: "🧥", message: "It's chilly—wear a jacket or warm layer." });
    } else if (current.temperature_2m >= 28) {
        suggestions.push({ icon: "🧢", message: "It's hot—choose light clothes and drink water." });
    }

    if (current.wind_speed_10m >= 25) {
        suggestions.push({ icon: "🍃", message: "It's windy—secure loose items outdoors." });
    }

    if (suggestions.length === 0) {
        suggestions.push({ icon: "🌤️", message: "Conditions look mild—enjoy your day outdoors." });
    }

    return suggestions.slice(0, 2);
}

function buildOutfitDecorations(current, today) {
    const snowCodes = [71, 73, 75, 77, 85, 86];
    const wetWeatherCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
    const isSnowy = snowCodes.includes(current.weather_code) || snowCodes.includes(today.weatherCode);
    const isWet = wetWeatherCodes.includes(current.weather_code)
        || current.precipitation > 0
        || (Number.isFinite(today.precipitationProbability) && today.precipitationProbability >= 50);

    if (isSnowy) {
        return { theme: "cold", items: ["🧥", "🧣", "🥾"] };
    }
    if (isWet) {
        return { theme: "rain", items: ["🧥", "🥾", "☂️"] };
    }
    if (current.temperature_2m <= 16) {
        return { theme: "cold", items: ["🧥", "🧣", "🧤"] };
    }
    if (current.temperature_2m >= 28) {
        return { theme: "summer", items: ["👕", "🩳", "🕶️"] };
    }
    if (current.wind_speed_10m >= 25) {
        return { theme: "breezy", items: ["🧥", "🧢", "🍃"] };
    }

    return { theme: "mild", items: ["🧥", "👖", "👟"] };
}

/** Fetch current conditions and a 7-day forecast for a selected location. */
async function fetchWeatherData(latitude, longitude, requireForecast = false) {
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
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset",
        forecast_days: "7",
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

    const [condition, icon] = describeWeatherCode(current.weather_code, current.is_day === 1, current.temperature_2m);
    const currentWeather = {
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

    const daily = data.daily;
    if (!daily || !Array.isArray(daily.time) || !Array.isArray(daily.weather_code)
        || !Array.isArray(daily.temperature_2m_max) || !Array.isArray(daily.temperature_2m_min)) {
        if (requireForecast) {
            throw new WeatherError("The weather service did not return a valid daily forecast.");
        }
        return { current: currentWeather, forecast: [] };
    }

    const forecast = daily.time.map((date, index) => {
        const high = daily.temperature_2m_max[index];
        const low = daily.temperature_2m_min[index];
        const code = daily.weather_code[index];
        const [dailyCondition, dailyIcon] = describeWeatherCode(code, true, high, low);
        const dateValue = new Date(`${date}T00:00:00Z`);
        const dayLabel = Number.isNaN(dateValue.getTime())
            ? date
            : new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(dateValue);

        return {
            date,
            dayLabel,
            condition: dailyCondition,
            icon: dailyIcon,
            high,
            low,
            precipitationProbability: daily.precipitation_probability_max?.[index] ?? null,
            precipitation: daily.precipitation_sum?.[index] ?? null,
            windSpeed: daily.wind_speed_10m_max?.[index] ?? null,
            sunrise: formatLocalTime(daily.sunrise?.[index]),
            sunset: formatLocalTime(daily.sunset?.[index])
        };
    });

    const suggestions = buildWeatherSuggestions(current, {
        weatherCode: daily.weather_code[0],
        precipitationProbability: daily.precipitation_probability_max?.[0]
    });
    const today = {
        weatherCode: daily.weather_code[0],
        precipitationProbability: daily.precipitation_probability_max?.[0]
    };
    const outfitDecorations = buildOutfitDecorations(current, today);

    return { current: currentWeather, forecast, suggestions, outfitDecorations };
}

/** Fetch current conditions for a selected latitude/longitude from Open-Meteo. */
async function getCurrentWeather(latitude, longitude) {
    const { current } = await fetchWeatherData(latitude, longitude);
    return current;
}

/** Fetch current conditions together with the daily forecast. */
async function getWeatherWithForecast(latitude, longitude) {
    return fetchWeatherData(latitude, longitude, true);
}

module.exports = { getCurrentWeather, getWeatherWithForecast, WeatherError };
