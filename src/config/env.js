/**
 * Global environment configuration — the ONLY place process.env is read.
 *
 * Every other module imports `config` from here. Values are parsed, typed,
 * validated once at startup and frozen, so a missing/invalid variable fails
 * fast with a clear message instead of surfacing later as a runtime error.
 */
const path = require("path");
const dotenv = require("dotenv");

// Resolve .env relative to the backend root so scripts work from any cwd.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const errors = [];

const str = (key, fallback) => {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") {
    if (fallback === undefined) errors.push(`${key} is required`);
    return fallback;
  }
  return value.trim();
};

const int = (key, fallback, { min = -Infinity, max = Infinity } = {}) => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${key} must be an integer between ${min} and ${max} (got "${raw}")`);
    return fallback;
  }
  return value;
};

const list = (key, fallback) =>
  str(key, fallback.join(","))
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

const nodeEnv = str("NODE_ENV", "development");
const isProduction = nodeEnv === "production";

const config = {
  nodeEnv,
  isProduction,
  isDevelopment: nodeEnv === "development",

  port: int("PORT", 5000, { min: 1, max: 65535 }),
  mongoUri: str("MONGO_URI", "mongodb://localhost:27017/safety_detective"),

  jwt: {
    // No fallback in production: a default secret would make every token forgeable.
    secret: str("JWT_SECRET", isProduction ? undefined : "dev-only-insecure-secret-change-me"),
    expiresIn: str("JWT_EXPIRES_IN", "7d"),
  },

  bcryptSaltRounds: int("BCRYPT_SALT_ROUNDS", 12, { min: 8, max: 15 }),

  cors: {
    // Browsers send Origin without a trailing slash, so strip it from configured values.
    // Defaults to "*" (auth is a Bearer token, no cookies) so a deploy that forgot to
    // set CORS_ORIGINS isn't blocked; set it to your frontend URL(s) to restrict.
    origins: list("CORS_ORIGINS", ["*"]).map(o => o.replace(/\/+$/, "")),
  },

  bodyLimit: str("BODY_LIMIT", "100kb"),

  // Used only by scripts/seed.js
  seedAdmin: {
    email: str("SEED_ADMIN_EMAIL", "admin@safetydetective.com").toLowerCase(),
    password: str("SEED_ADMIN_PASSWORD", "Admin1234!"),
  },
};

if (isProduction && config.jwt.secret && config.jwt.secret.length < 32) {
  errors.push("JWT_SECRET must be at least 32 characters in production");
}

if (errors.length) {
  console.error("\n[config] Invalid environment configuration:");
  errors.forEach(e => console.error(`  - ${e}`));
  console.error("Check backend/.env (see .env.example).\n");
  process.exit(1);
}

if (!isProduction && process.env.JWT_SECRET === undefined) {
  console.warn("[config] JWT_SECRET not set — using an insecure development default.");
}

module.exports = Object.freeze(config);
