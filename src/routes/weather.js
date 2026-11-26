const express = require("express");
const { searchLocations, GeocodingError } = require("../services/geocoding");
const { getWeatherWithForecast, WeatherError } = require("../services/weather");
const User = require("../models/user");
const { connectDatabase } = require("../db");

const router = express.Router();

// JSON endpoint for clients that want to use the geocoding service directly.
router.get("/api/geocoding", async (req, res) => {
    const query = typeof req.query.name === "string" ? req.query.name.trim() : "";
    if (!query || query.length > 100) {
        return res.status(400).json({ error: "Enter a location name of 1 to 100 characters." });
    }

    try {
        const locations = await searchLocations(query);
        return res.json({ query, results: locations });
    } catch (error) {
        const status = error instanceof GeocodingError ? error.statusCode : 502;
        return res.status(status).json({ error: error.message });
    }
});

// Browser search flow: resolve the city name to selectable coordinates.
router.get("/weather", async (req, res) => {
    const query = typeof req.query.city === "string" ? req.query.city.trim() : "";
    if (!query || query.length > 100) {
        return res.status(400).render("home", {
            locations: [],
            searchTerm: query,
            error: "Enter a city name of 1 to 100 characters.",
            weather: null,
            forecast: null,
            selectedLocation: null
        });
    }

    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    if (req.query.latitude && req.query.longitude
        && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
        && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) {
        const selectedLocation = {
            name: query,
            admin1: typeof req.query.admin1 === "string" ? req.query.admin1 : null,
            country: typeof req.query.country === "string" ? req.query.country : null,
            latitude,
            longitude
        };
        if (req.user) {
            try {
                await connectDatabase();
                const user = await User.findById(req.user.id);
                if (user) {
                    // If this place is already saved, remove the old copy first.
                    const oldLocationIndex = user.savedLocations.findIndex((location) =>
                        location.latitude === latitude && location.longitude === longitude
                    );
                    if (oldLocationIndex !== -1) {
                        user.savedLocations.splice(oldLocationIndex, 1);
                    }

                    // Save the selected place to this signed-in user's account.
                    user.savedLocations.push(selectedLocation);
                    await user.save();
                }
            } catch (error) {
                console.error("Saving location failed:", error.message);
            }
        }
        try {
            const { current: weather, forecast } = await getWeatherWithForecast(latitude, longitude);
            return res.render("home", {
                locations: [],
                selectedLocation,
                searchTerm: query,
                error: null,
                weather,
                forecast
            });
        } catch (error) {
            return res.status(error instanceof WeatherError ? error.statusCode : 502).render("home", {
                locations: [],
                selectedLocation,
                searchTerm: query,
                error: error.message,
                weather: null,
                forecast: null
            });
        }
    }

    try {
        const locations = await searchLocations(query);
        return res.render("home", {
            locations,
            searchTerm: query,
            error: locations.length ? null : `No locations found for “${query}”. Try another spelling.`,
            weather: null,
            forecast: null,
            selectedLocation: null
        });
    } catch (error) {
        return res.status(error instanceof GeocodingError ? error.statusCode : 502).render("home", {
            locations: [],
            searchTerm: query,
            error: error.message,
            weather: null,
            forecast: null,
            selectedLocation: null
        });
    }
});

module.exports = router;
