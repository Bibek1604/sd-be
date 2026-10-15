const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
// CORS_ORIGINS="*" allows any origin; otherwise only the listed origins.
app.use(cors({ origin: config.cors.origins.includes("*") ? "*" : config.cors.origins }));
app.use(express.json({ limit: config.bodyLimit }));

app.use("/api", apiRoutes);

// Must be registered after all routes
app.use(notFound);
app.use(errorHandler);

module.exports = app;
