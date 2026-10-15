const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

router.get("/health", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? "ok" : "degraded", db: dbUp ? "up" : "down" });
});

router.use("/auth", require("./auth"));
router.use("/game", require("./game"));
router.use("/employee", require("./employee"));
router.use("/admin", require("./admin"));

module.exports = router;
