const mongoose = require("mongoose");

let connectionPromise;

function connectDatabase() {
    // Reuse the existing connection instead of opening a new one per request.
    if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
    if (!connectionPromise) {
        // Use the configured database, or local MongoDB during development.
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/weatherwise";
        connectionPromise = mongoose.connect(uri).catch((error) => {
            connectionPromise = null;
            throw error;
        });
    }
    return connectionPromise;
}

module.exports = { connectDatabase };
