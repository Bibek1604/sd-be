// Scoring rules — single source of truth for gameService (per game-design.md)
module.exports = Object.freeze({
  CLUE_POINTS: 10,
  DECOY_PENALTY: 10,
  WRONG_WHY_PENALTY: 10,
  FAST_FINISH_BONUS: 10,
  FAST_FINISH_SECONDS: 120, // under 2 minutes of the 3-minute timer
  TIME_LIMIT_SECONDS: 180,
  PASS_SCORE: 60,
  WHY_CHAIN_LENGTH: 5,
  DEFAULT_CASE_ID: "case001",
});
