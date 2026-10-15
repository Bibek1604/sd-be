const express = require("express");
const router = express.Router();
const gameService = require("../services/gameService");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const schemas = require("../validators").game;

router.use(authenticate, requireRole("employee"));

// Incident scene data — correctOptionId stripped, options shuffled per request
router.get("/incident", validate(schemas.incident), asyncHandler(async (req, res) => {
  res.json(await gameService.getIncidentForPlay(req.query.caseId));
}));

// Start a new attempt
router.post("/start", validate(schemas.start), asyncHandler(async (req, res) => {
  const attemptId = await gameService.startAttempt(req.user.userId, req.body.incidentId);
  res.status(201).json({ attemptId });
}));

// Record a clue or decoy click
router.post("/clue-click", validate(schemas.clueClick), asyncHandler(async (req, res) => {
  const { attemptId, hotspotId } = req.body;
  res.json(await gameService.processClueClick(attemptId, hotspotId, req.user.userId));
}));

// Submit one step of the 5-Why chain (whyOrder 1-5)
router.post("/submit-why", validate(schemas.submitWhy), asyncHandler(async (req, res) => {
  const { attemptId, whyOrder, optionId } = req.body;
  res.json(await gameService.submitWhyStep(attemptId, whyOrder, optionId, req.user.userId));
}));

// Finalise the attempt
router.post("/finish", validate(schemas.finish), asyncHandler(async (req, res) => {
  const { attemptId, timeTakenSeconds, timedOut } = req.body;
  res.json(await gameService.finishAttempt(attemptId, req.user.userId, timeTakenSeconds, timedOut));
}));

module.exports = router;
