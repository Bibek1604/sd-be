const mongoose = require("mongoose");
const config = require("./env");

const connectDB = async () => {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected (${mongoose.connection.name})`);
};

const disconnectDB = () => mongoose.disconnect();

module.exports = { connectDB, disconnectDB };
