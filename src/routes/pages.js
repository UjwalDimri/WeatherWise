const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("home", {
        locations: null,
        searchTerm: "",
        error: null,
        weather: null,
        forecast: null,
        selectedLocation: null
    });
});

router.get("/login", (req, res) => {
    res.render("login");
});

router.post("/login", (req, res) => {
    res.redirect("/");
});

module.exports = router;
