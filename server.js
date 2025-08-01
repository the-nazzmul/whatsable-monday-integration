const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const webhookRoutes = require("./src/routes/webhooks");
const integrationRoutes = require("./src/routes/integration");

const app = express();
const PORT = process.env.PORT || 3000;

//middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
