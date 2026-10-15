const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const schemas = require("../validators").auth;

// Returns token + user so the client can auto-login after signup
router.post("/signup", validate(schemas.signup), asyncHandler(async (req, res) => {
  res.status(201).json(await authService.signup(req.body));
}));

router.post("/login", validate(schemas.login), asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body));
}));

module.exports = router;
