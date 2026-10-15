const config = require("./src/config/env"); // loads + validates .env first
const app = require("./src/app");
const { connectDB, disconnectDB } = require("./src/config/db");

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    console.error(`Is MongoDB running at ${config.mongoUri}?`);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  });

  const shutdown = signal => {
    console.log(`${signal} received — shutting down`);
    server.close(() => disconnectDB().finally(() => process.exit(0)));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

process.on("unhandledRejection", err => {
  console.error("Unhandled promise rejection:", err);
});

start();
