const crypto = require("node:crypto");
const express = require("express");
const User = require("../models/user");
const { connectDatabase } = require("../db");
const { setSessionCookie, clearSessionCookie } = require("../middleware/auth");

const router = express.Router();

// Store a salt with the hash so the same password gets a different hash
// for every user. scrypt is built into Node.js.
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (error, key) => {
            if (error) return reject(error);
            return resolve(`${salt}:${key.toString("hex")}`);
        });
    });
}

async function passwordMatches(password, storedHash) {
    const [salt, savedHash] = (storedHash || "").split(":");
    if (!salt || !savedHash) return false;

    // Hash the password the person entered using the saved salt, then compare.
    const candidate = await hashPassword(password, salt);
    const savedHashBuffer = Buffer.from(`${salt}:${savedHash}`);
    const candidateBuffer = Buffer.from(candidate);

    // timingSafeEqual avoids comparing secret values in a way that leaks timing.
    return savedHashBuffer.length === candidateBuffer.length
        && crypto.timingSafeEqual(savedHashBuffer, candidateBuffer);
}

router.get("/signup", (req, res) => {
    if (req.user) return res.redirect("/account");
    return res.render("signup", { error: null });
});

router.post("/signup", async (req, res) => {
    // Trim names and email addresses so accidental spaces don't cause problems.
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const emailLooksValid = /^\S+@\S+\.\S+$/.test(email);
    const passwordIsLongEnough = password.length >= 8 && password.length <= 200;
    if (username.length < 2 || username.length > 60 || !emailLooksValid || !passwordIsLongEnough) {
        return res.status(400).render("signup", { error: "Enter a name, valid email, and password with at least 8 characters." });
    }
    try {
        await connectDatabase();
        const passwordHash = await hashPassword(password);
        const user = await User.create({ username, email, passwordHash });
        setSessionCookie(res, user);
        return res.redirect("/account");
    } catch (error) {
        if (error.code === 11000) return res.status(409).render("signup", { error: "An account with that email already exists." });
        console.error("Account creation failed:", error.message);
        return res.status(503).render("signup", { error: "Accounts are temporarily unavailable. Please try again." });
    }
});

router.post("/login", async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    try {
        await connectDatabase();
        // Find the account by email, then check the entered password.
        const user = await User.findOne({ email });
        if (!user || !(await passwordMatches(password, user.passwordHash))) {
            return res.status(401).render("login", { error: "Email or password is incorrect." });
        }
        setSessionCookie(res, user);
        return res.redirect("/account");
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(503).render("login", { error: "Sign in is temporarily unavailable. Please try again." });
    }
});

router.post("/logout", (req, res) => {
    clearSessionCookie(res);
    res.redirect("/");
});

module.exports = router;
