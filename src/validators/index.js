/**
 * Request schemas, grouped by route module.
 * Keep these rules in sync with frontend/src/utils/validation.js.
 */
const { v } = require("../utils/validator");
const { TIME_LIMIT_SECONDS, WHY_CHAIN_LENGTH, DEFAULT_CASE_ID } = require("../constants/game");

const auth = {
  signup: {
    body: {
      name: v.string({ label: "Name", min: 2, max: 80 }),
      email: v.email(),
      phone: v.phone(),
      password: v.string({ label: "Password", min: 6, max: 128, trim: false }),
    },
  },
  login: {
    body: {
      email: v.email(),
      password: v.string({ label: "Password", max: 128, trim: false }),
    },
  },
};

const game = {
  incident: {
    query: {
      caseId: v.string({
        label: "caseId",
        default: DEFAULT_CASE_ID,
        pattern: /^case\d{3}$/,
        patternMessage: "caseId must look like case001",
      }),
    },
  },
  start: {
    body: { incidentId: v.objectId({ label: "incidentId" }) },
  },
  clueClick: {
    body: {
      attemptId: v.objectId({ label: "attemptId" }),
      hotspotId: v.string({ label: "hotspotId", max: 100 }),
    },
  },
  submitWhy: {
    body: {
      attemptId: v.objectId({ label: "attemptId" }),
      whyOrder: v.integer({ label: "whyOrder", min: 1, max: WHY_CHAIN_LENGTH }),
      optionId: v.string({ label: "optionId", max: 100 }),
    },
  },
  finish: {
    body: {
      attemptId: v.objectId({ label: "attemptId" }),
      // Allow some slack past the timer for network latency.
      timeTakenSeconds: v.number({ label: "timeTakenSeconds", min: 0, max: TIME_LIMIT_SECONDS * 2 }),
      timedOut: v.boolean({ label: "timedOut", default: false }),
    },
  },
};

const admin = {
  employeeId: {
    params: { id: v.objectId({ label: "Employee id" }) },
  },
};

module.exports = { auth, game, admin };
