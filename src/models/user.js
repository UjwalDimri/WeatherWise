const mongoose = require("mongoose");

// Each saved place belongs to one user document.
const savedLocationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    admin1: { type: String, default: "" },
    country: { type: String, default: "" },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    savedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
    // Account details. Passwords are stored as hashes, never plain text.
    username: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    savedLocations: { type: [savedLocationSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
