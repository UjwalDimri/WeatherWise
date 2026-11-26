const express = require("express");
const ejsMate = require("ejs-mate");
const path = require("node:path");
const pagesRouter = require("./src/routes/pages");
const weatherRouter = require("./src/routes/weather");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "src", "public")));

app.use("/", pagesRouter);
app.use("/", weatherRouter);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
