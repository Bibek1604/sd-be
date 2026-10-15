const Attempt = require("../models/Attempt");
const User = require("../models/User");
const Incident = require("../models/Incident");
const { NotFoundError, ForbiddenError } = require("../utils/errors");

/**
 * One row per employee × case they have completed at least once.
 * Uses 3 queries total (instead of one query per employee per case) and
 * aggregates in memory.
 */
const getResults = async () => {
  const [employees, incidents, attempts] = await Promise.all([
    User.find({ role: "employee" }, "_id name email").lean(),
    Incident.find({}, "_id title").lean(),
    // Only completed attempts count toward score/status
    Attempt.find({ status: "completed" }, "userId incidentId score passed createdAt startedAt").lean(),
  ]);

  const incidentTitles = new Map(incidents.map(i => [String(i._id), i.title]));
  const employeesById = new Map(employees.map(e => [String(e._id), e]));
  const rows = new Map();

  for (const a of attempts) {
    const emp = employeesById.get(String(a.userId));
    const incidentKey = String(a.incidentId);
    if (!emp || !incidentTitles.has(incidentKey)) continue;

    const key = `${emp._id}:${incidentKey}`;
    const attemptDate = a.createdAt || a.startedAt;
    const row = rows.get(key) || {
      userId: emp._id,
      name: emp.name,
      email: emp.email,
      incidentId: a.incidentId,
      incidentTitle: incidentTitles.get(incidentKey),
      attempts: 0,
      bestScore: null,
      passed: false,
      lastAttempt: null,
    };

    row.attempts += 1;
    if (row.bestScore === null || a.score > row.bestScore) row.bestScore = a.score;
    if (a.passed) row.passed = true;
    if (attemptDate && (!row.lastAttempt || attemptDate > row.lastAttempt)) row.lastAttempt = attemptDate;
    rows.set(key, row);
  }

  return [...rows.values()];
};

const getEmployees = () => User.find({ role: "employee" }).select("-passwordHash").lean();

const deleteEmployee = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("Employee not found");
  if (user.role === "admin") throw new ForbiddenError("Cannot delete an admin account");

  // Cascade-delete all attempts, then the user document.
  // After this, the email and phone are immediately free for re-registration.
  await Attempt.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
};

module.exports = { getResults, getEmployees, deleteEmployee };
