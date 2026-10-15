const Attempt = require("../models/Attempt");
const User = require("../models/User");
const { NotFoundError } = require("../utils/errors");

const getHistory = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError("User not found");

  const attempts = await Attempt.find({ userId })
    .populate("incidentId", "caseId")
    .sort({ createdAt: -1 })
    .lean();

  const bestScore = attempts.reduce((best, a) => Math.max(best, a.score || 0), 0);

  return {
    name: user.name,
    email: user.email,
    bestScore,
    attempts,
  };
};

module.exports = { getHistory };
