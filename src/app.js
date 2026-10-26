const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
// CORS_ORIGINS="*" allows any origin; otherwise only the listed origins.
const corsOptions = {
  origin: config.cors.origins.includes("*") ? "*" : config.cors.origins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // answer preflights before any route/auth middleware
app.use(express.json({ limit: config.bodyLimit }));

// Mounted at both /api and / so a frontend whose base URL lacks the "/api" suffix still works.
app.use("/api", apiRoutes);
app.use("/", apiRoutes);

// Must be registered after all routes
app.use(notFound);
app.use(errorHandler);

module.exports = app;
