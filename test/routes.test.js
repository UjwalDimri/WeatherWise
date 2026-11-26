const assert = require("node:assert/strict");
const http = require("node:http");
const { after, afterEach, before, describe, it } = require("node:test");
const app = require("../app");

const originalFetch = global.fetch;
let server;
let baseUrl;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (!server) return;
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

afterEach(() => {
    global.fetch = originalFetch;
});

function request(path) {
    return new Promise((resolve, reject) => {
        const requestUrl = new URL(path, baseUrl);
        http.get(requestUrl, { agent: false }, (response) => {
            let body = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => { body += chunk; });
            response.on("end", () => resolve({
                status: response.statusCode,
                headers: response.headers,
                body
            }));
        }).on("error", reject);
    });
}

function weatherApiResponse() {
    const dates = [
        "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29",
        "2026-11-30", "2026-12-01", "2026-12-02"
    ];

    return {
        current: {
            time: "2026-11-26T12:00",
            temperature_2m: 12,
            apparent_temperature: 10,
            relative_humidity_2m: 65,
            wind_speed_10m: 8,
            precipitation: 0,
            weather_code: 1,
            is_day: 1
        },
        daily: {
            time: dates,
            weather_code: [0, 1, 2, 3, 45, 61, 71],
            temperature_2m_max: [4, 12, 18, 20, 8, 13, 2],
            temperature_2m_min: [-2, 7, 10, 14, 3, 8, -4],
            precipitation_probability_max: [10, 20, 30, 10, 40, 80, 70],
            precipitation_sum: [0, 0, 0.1, 0, 1.2, 4.2, 2.5],
            wind_speed_10m_max: [9, 10, 12, 8, 15, 18, 20],
            sunrise: dates.map((date) => `${date}T06:42`),
            sunset: dates.map((date) => `${date}T17:51`)
        }
    };
}

describe("page routes", () => {
    it("renders the home page", async () => {
        const response = await request("/");
        assert.equal(response.status, 200);
        assert.match(response.body, /WeatherWise \| Understand Your Weather/);
    });

    it("renders the login page", async () => {
        const response = await request("/login");
        assert.equal(response.status, 200);
        assert.match(response.body, /Welcome back!/);
    });
});

describe("weather routes", () => {
    it("rejects an empty city search without calling the weather service", async () => {
        global.fetch = () => assert.fail("fetch should not be called for an empty city");

        const response = await request("/weather?city=%20%20");
        assert.equal(response.status, 400);
        assert.match(response.body, /Enter a city name/);
    });

    it("validates the geocoding API query", async () => {
        const response = await request("/api/geocoding");
        assert.equal(response.status, 400);
        assert.match(response.body, /Enter a location name/);
    });

    it("returns geocoding matches as JSON", async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ results: [{
                id: 2988507,
                name: "Paris",
                latitude: 48.85,
                longitude: 2.35,
                country: "France"
            }] })
        });

        const response = await request("/api/geocoding?name=Paris");
        assert.equal(response.status, 200);
        assert.deepEqual(JSON.parse(response.body), {
            query: "Paris",
            results: [{
                id: 2988507,
                name: "Paris",
                admin1: null,
                country: "France",
                countryCode: null,
                latitude: 48.85,
                longitude: 2.35,
                timezone: null
            }]
        });
    });

    it("renders selectable locations for a city search", async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ results: [{
                id: 2988507,
                name: "Paris",
                latitude: 48.85,
                longitude: 2.35,
                country: "France"
            }] })
        });

        const response = await request("/weather?city=Paris");
        assert.equal(response.status, 200);
        assert.match(response.body, /Matching locations/);
        assert.match(response.body, /Paris/);
    });

    it("renders a clear message when the geocoding provider is unavailable", async () => {
        global.fetch = async () => ({ ok: false });

        const response = await request("/weather?city=Paris");
        assert.equal(response.status, 502);
        assert.match(response.body, /location search service is temporarily unavailable/i);
    });

    it("renders current conditions, forecast cards, and local sunrise/sunset", async () => {
        global.fetch = async () => ({ ok: true, json: async () => weatherApiResponse() });

        const response = await request("/weather?city=Paris&latitude=48.85&longitude=2.35&country=France");
        assert.equal(response.status, 200);
        assert.match(response.body, /CURRENT CONDITIONS/);
        assert.match(response.body, /5- and 7-day forecast/);
        assert.match(response.body, /Sunrise &amp; sunset/);
        assert.match(response.body, /6:42 AM/);
        assert.match(response.body, /5:51 PM/);
        assert.equal((response.body.match(/data-forecast-index=/g) || []).length, 7);
    });
});
