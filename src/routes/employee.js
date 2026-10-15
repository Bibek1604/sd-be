const express = require("express");
const router = express.Router();
const employeeService = require("../services/employeeService");
const { authenticate, requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(authenticate, requireRole("employee"));

router.get("/history", asyncHandler(async (req, res) => {
  res.json(await employeeService.getHistory(req.user.userId));
}));

module.exports = router;
