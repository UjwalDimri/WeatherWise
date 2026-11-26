const express = require("express");
const User = require("../models/user");
const { connectDatabase } = require("../db");
const { requireLogin, clearSessionCookie } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
    res.render("home", {
        user: req.user,
        locations: null,
        searchTerm: "",
        error: null,
        weather: null,
        forecast: null,
        selectedLocation: null
    });
});

router.get("/login", (req, res) => {
    if (req.user) return res.redirect("/account");
    return res.render("login", { error: null });
});

router.get("/account", requireLogin, async (req, res) => {
    try {
        // Look up the signed-in user's saved places in MongoDB.
        await connectDatabase();
        const user = await User.findById(req.user.id).lean();
        if (!user) {
            clearSessionCookie(res);
            return res.redirect("/login");
        }
        return res.render("account", { user, error: null });
    } catch (error) {
        console.error("Account page failed:", error.message);
        return res.status(503).render("account", { user: req.user, locations: [], error: "Saved locations are temporarily unavailable." });
    }
});

router.post("/account/locations/:index/delete", requireLogin, async (req, res) => {
    // The index comes from the Remove button on that user's account page.
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) return res.redirect("/account");
    try {
        await connectDatabase();
        const user = await User.findById(req.user.id);
        if (user && index < user.savedLocations.length) {
            user.savedLocations.splice(index, 1);
            await user.save();
        }
        return res.redirect("/account");
    } catch (error) {
        console.error("Removing saved location failed:", error.message);
        return res.status(503).redirect("/account");
    }
});

module.exports = router;
