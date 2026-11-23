const express = require("express");
const ejs = require('ejs');
const ejsMate = require("ejs-mate");
const app = express();
const port = process.env.PORT || 3000;
const path = require("path");
const { searchLocations, GeocodingError } = require("./src/services/geocoding");
const { getCurrentWeather, WeatherError } = require("./src/services/weather");

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"src","views"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname, "src", "public")));


app.get("/login",(req,res) => {
    res.render("login");
});
app.post("/login",(req,res) => {
    res.redirect("/");
});
app.get("/", (req, res) => {
   res.render("home", { locations: null, searchTerm: "", error: null, weather: null, selectedLocation: null });
});

// JSON endpoint for clients that want to use the geocoding service directly.
app.get("/api/geocoding", async (req, res) => {
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
app.get("/weather", async (req, res) => {
    const query = typeof req.query.city === "string" ? req.query.city.trim() : "";
    if (!query || query.length > 100) {
        return res.status(400).render("home", {
            locations: [],
            searchTerm: query,
            error: "Enter a city name of 1 to 100 characters.",
            weather: null,
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
        try {
            const weather = await getCurrentWeather(latitude, longitude);
            return res.render("home", {
                locations: [],
                selectedLocation,
                searchTerm: query,
                error: null,
                weather
            });
        } catch (error) {
            return res.status(error instanceof WeatherError ? error.statusCode : 502).render("home", {
                locations: [],
                selectedLocation,
                searchTerm: query,
                error: error.message,
                weather: null
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
            selectedLocation: null
        });
    } catch (error) {
        return res.status(error instanceof GeocodingError ? error.statusCode : 502).render("home", {
            locations: [],
            searchTerm: query,
            error: error.message,
            weather: null,
            selectedLocation: null
        });
    }
});

app.listen(port,(req,res)=>{
    console.log(`Listening on port ${port}`);
});
