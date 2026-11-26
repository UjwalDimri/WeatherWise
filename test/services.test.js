const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { searchLocations, GeocodingError } = require("../src/services/geocoding");
const { getCurrentWeather, getWeatherWithForecast, WeatherError } = require("../src/services/weather");

const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
});

describe("geocoding service", () => {
    it("rejects blank and overlong location names without making a request", async () => {
        global.fetch = () => assert.fail("fetch should not be called for invalid input");

        await assert.rejects(searchLocations("  "), (error) =>
            error instanceof GeocodingError && error.statusCode === 400);
        await assert.rejects(searchLocations("x".repeat(101)), (error) =>
            error instanceof GeocodingError && error.statusCode === 400);
    });

    it("trims the query and returns only locations with valid coordinates", async () => {
        global.fetch = async (url) => {
            assert.equal(new URL(url).searchParams.get("name"), "Paris");
            return {
                ok: true,
                json: async () => ({ results: [
                    { id: 1, name: "Paris", latitude: 48.85, longitude: 2.35, country: "France" },
                    { id: 2, name: "Invalid", latitude: null, longitude: 5 }
                ] })
            };
        };

        assert.deepEqual(await searchLocations(" Paris "), [{
            id: 1,
            name: "Paris",
            admin1: null,
            country: "France",
            countryCode: null,
            latitude: 48.85,
            longitude: 2.35,
            timezone: null
        }]);
    });

    it("returns no results when the API has no matches", async () => {
        global.fetch = async () => ({ ok: true, json: async () => ({}) });
        assert.deepEqual(await searchLocations("Atlantis"), []);
    });

    it("reports an upstream failure", async () => {
        global.fetch = async () => ({ ok: false });
        await assert.rejects(searchLocations("Paris"), (error) =>
            error instanceof GeocodingError && error.statusCode === 502);
    });
});

describe("weather service", () => {
    it("rejects coordinates outside geographic bounds without making a request", async () => {
        global.fetch = () => assert.fail("fetch should not be called for invalid coordinates");

        await assert.rejects(getCurrentWeather(91, 0), (error) =>
            error instanceof WeatherError && error.statusCode === 400);
        await assert.rejects(getCurrentWeather(0, -181), (error) =>
            error instanceof WeatherError && error.statusCode === 400);
    });

    it("maps current API values and weather codes to the app's weather shape", async () => {
        global.fetch = async (url) => {
            const params = new URL(url).searchParams;
            assert.equal(params.get("latitude"), "48.85");
            assert.equal(params.get("longitude"), "2.35");
            return {
                ok: true,
                json: async () => ({
                    current: {
                        time: "2026-11-26T12:00",
                        temperature_2m: 12.5,
                        apparent_temperature: 11,
                        relative_humidity_2m: 70,
                        wind_speed_10m: 8,
                        precipitation: 0,
                        weather_code: 3,
                        is_day: 1
                    },
                    current_units: { temperature_2m: "°C" }
                })
            };
        };

        assert.deepEqual(await getCurrentWeather("48.85", "2.35"), {
            time: "2026-11-26T12:00",
            temperature: 12.5,
            feelsLike: 11,
            humidity: 70,
            windSpeed: 8,
            precipitation: 0,
            condition: "Overcast",
            icon: "☁️",
            units: { temperature_2m: "°C" }
        });
    });

    it("reports unavailable conditions when the response lacks a current temperature", async () => {
        global.fetch = async () => ({ ok: true, json: async () => ({ current: {} }) });
        await assert.rejects(getCurrentWeather(0, 0), (error) =>
            error instanceof WeatherError && error.statusCode === 502);
    });

    it("maps seven forecast days, local sun times, and temperature-aware icons", async () => {
        global.fetch = async (url) => {
            const params = new URL(url).searchParams;
            assert.equal(params.get("forecast_days"), "7");
            assert.equal(params.get("timezone"), "auto");
            assert.match(params.get("daily"), /sunrise,sunset/);

            return {
                ok: true,
                json: async () => ({
                    current: {
                        time: "2026-11-26T12:00",
                        temperature_2m: 12,
                        apparent_temperature: 11,
                        relative_humidity_2m: 70,
                        wind_speed_10m: 8,
                        precipitation: 0,
                        weather_code: 0,
                        is_day: 1
                    },
                    daily: {
                        time: ["2026-11-26", "2026-11-27"],
                        weather_code: [0, 61],
                        temperature_2m_max: [4, 12],
                        temperature_2m_min: [-2, 7],
                        precipitation_probability_max: [10, 80],
                        precipitation_sum: [0, 4.2],
                        wind_speed_10m_max: [9, 18],
                        sunrise: ["2026-11-26T06:42", "2026-11-27T06:43"],
                        sunset: ["2026-11-26T17:51", "2026-11-27T17:50"]
                    }
                })
            };
        };

        const result = await getWeatherWithForecast(48.85, 2.35);
        assert.equal(result.forecast.length, 2);
        assert.deepEqual(result.forecast[0], {
            date: "2026-11-26",
            dayLabel: "Thu",
            condition: "Clear sky",
            icon: "🥶",
            high: 4,
            low: -2,
            precipitationProbability: 10,
            precipitation: 0,
            windSpeed: 9,
            sunrise: "6:42 AM",
            sunset: "5:51 PM"
        });
        assert.equal(result.forecast[1].condition, "Slight rain");
        assert.equal(result.forecast[1].icon, "🌧️");
    });

    it("rejects a successful API response that has no usable daily forecast", async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => ({
                current: { temperature_2m: 12 },
                daily: { time: [], weather_code: [] }
            })
        });

        await assert.rejects(getWeatherWithForecast(0, 0), (error) =>
            error instanceof WeatherError && error.statusCode === 502);
    });
});
