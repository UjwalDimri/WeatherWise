const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

class GeocodingError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.name = "GeocodingError";
        this.statusCode = statusCode;
    }
}

/** Find matching places using Open-Meteo's public geocoding API. */
async function searchLocations(name) {
    const query = String(name || "").trim();
    if (!query || query.length > 100) {
        throw new GeocodingError("Enter a location name of 1 to 100 characters.", 400);
    }

    const url = new URL(GEOCODING_URL);
    url.search = new URLSearchParams({
        name: query,
        count: "8",
        language: "en",
        format: "json"
    }).toString();

    let response;
    try {
        response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    } catch {
        throw new GeocodingError("Could not reach the location search service. Please try again.");
    }

    if (!response.ok) {
        throw new GeocodingError("The location search service is temporarily unavailable.");
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new GeocodingError("The location search service returned an invalid response.");
    }

    if (!data || data.results == null) {
        return [];
    }
    if (!Array.isArray(data.results)) {
        throw new GeocodingError("The location search service returned an invalid response.");
    }

    return data.results
        .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
        .map((place) => ({
            id: place.id,
            name: place.name,
            admin1: place.admin1 || null,
            country: place.country || null,
            countryCode: place.country_code || null,
            latitude: place.latitude,
            longitude: place.longitude,
            timezone: place.timezone || null
        }));
}

module.exports = { searchLocations, GeocodingError };
