const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 3000;

app.get("/", (req, res) => {
    res.send("WeatherWise is running!");
});

app.get("/test-api", async (req, res) => {
    try {
        const response = await axios.get(
            "https://jsonplaceholder.typicode.com/posts/1"
        );

        res.json(response.data);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            error: "API request failed"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});