const express = require("express");
const ejs = require('ejs');
const ejsMate = require("ejs-mate");
const app = express();
const port = 3000;
const path = require("path");

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
   res.render("home");
});

app.listen(port,(req,res)=>{
    console.log("Listening to the port 3000");
});