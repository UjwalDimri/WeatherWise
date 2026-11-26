const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { searchLocations, GeocodingError } = require("../src/services/geocoding");
const { getCurrentWeather, WeatherError } = require("../src/services/weather");

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
});
