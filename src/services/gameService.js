const Attempt = require("../models/Attempt");
const Incident = require("../models/Incident");
const { NotFoundError, BadRequestError } = require("../utils/errors");
const {
  CLUE_POINTS,
  DECOY_PENALTY,
  WRONG_WHY_PENALTY,
  FAST_FINISH_BONUS,
  FAST_FINISH_SECONDS,
  PASS_SCORE,
  WHY_CHAIN_LENGTH,
} = require("../constants/game");

const DEFAULT_END_SUMMARY =
  "The slip happened because the floor was wet. The floor was wet because a container was leaking. " +
  "The leak went unreported because staff didn't know the reporting process — because the safety training " +
  "program wasn't effectively delivered or reinforced. Not a careless worker.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Fisher-Yates on a COPY of the array, never mutates source
const shuffleOptions = (options = []) => {
  const arr = options.map(o => ({ id: o.id, text: o.text })); // plain objects, no Mongoose refs
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const findActiveAttempt = async (attemptId, userId) => {
  const attempt = await Attempt.findOne({ _id: attemptId, userId, status: "in-progress" });
  if (!attempt) throw new NotFoundError("Attempt not found or not in-progress");
  return attempt;
};

const findIncident = async (incidentId) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) throw new NotFoundError("Incident not found");
  return incident;
};

// Running score — computed server-side only, never trusted from client
const getRunningScore = (attempt, incident) => {
  let score = 0;
  score += (attempt.cluesFound?.length || 0) * CLUE_POINTS;
  score -= (attempt.decoyClicks?.length || 0) * DECOY_PENALTY; // first clicks only

  // Why chain: correct answers add their step points, wrong answers cost a penalty
  for (const ans of attempt.whyChainAnswers || []) {
    if (ans.correct) {
      const step = incident?.whyChain?.find(w => w.order === ans.order);
      if (step) score += step.points;
    } else {
      score -= WRONG_WHY_PENALTY;
    }
  }
  return score;
};

// ---------------------------------------------------------------------------
// Incident data for play — correctOptionId stripped, options shuffled per request
// ---------------------------------------------------------------------------
const getIncidentForPlay = async (caseId) => {
  const incident = await Incident.findOne({ caseId }, { "whyChain.correctOptionId": 0 }).lean();
  if (!incident) throw new NotFoundError(`No incident found for caseId: ${caseId}`);

  // Fresh order on every request so each new attempt sees a different order.
  incident.whyChain = (incident.whyChain || []).map(step => ({ ...step, options: shuffleOptions(step.options) }));
  return incident;
};

// ---------------------------------------------------------------------------
// Start a new attempt
// ---------------------------------------------------------------------------
const startAttempt = async (userId, incidentId) => {
  // Guard against orphan attempts pointing at a non-existent incident
  if (!(await Incident.exists({ _id: incidentId }))) throw new NotFoundError("Incident not found");

  const attempt = await Attempt.create({ userId, incidentId, status: "in-progress", startedAt: new Date() });
  return attempt._id;
};

// ---------------------------------------------------------------------------
// Record a clue or decoy click — server decides what it is
// ---------------------------------------------------------------------------
const processClueClick = async (attemptId, hotspotId, userId) => {
  const attempt = await findActiveAttempt(attemptId, userId);
  const incident = await findIncident(attempt.incidentId);

  const clue = incident.clues.find(c => c._id === hotspotId);
  if (clue) {
    if (attempt.cluesFound.includes(hotspotId)) {
      return { alreadyFound: true, feedback: clue.feedbackText, pointDelta: 0, score: getRunningScore(attempt, incident) };
    }
    attempt.cluesFound.push(hotspotId);
    await attempt.save();
    return { found: true, feedback: clue.feedbackText, pointDelta: CLUE_POINTS, alreadyFound: false, score: getRunningScore(attempt, incident) };
  }

  const decoy = incident.decoys.find(d => d._id === hotspotId);
  if (decoy) {
    const existing = attempt.decoyClicks.find(dc => dc.hotspotId === hotspotId);
    if (existing) existing.clickCount += 1;
    else attempt.decoyClicks.push({ hotspotId, clickCount: 1 });
    await attempt.save();
    return {
      isDecoy: true,
      feedback: decoy.feedbackText,
      pointDelta: existing ? 0 : -DECOY_PENALTY,
      firstClick: !existing,
      score: getRunningScore(attempt, incident),
    };
  }

  throw new BadRequestError("Invalid hotspotId", { hotspotId: "Unknown hotspot for this incident" });
};

// ---------------------------------------------------------------------------
// Submit one step of the 5-Why chain (whyOrder 1-5)
// ---------------------------------------------------------------------------
const submitWhyStep = async (attemptId, whyOrder, optionId, userId) => {
  const attempt = await findActiveAttempt(attemptId, userId);

  // Already answered this step?
  const alreadyAnswered = attempt.whyChainAnswers.find(a => a.order === whyOrder);
  if (alreadyAnswered) return { alreadyAnswered: true, correct: alreadyAnswered.correct };

  const incident = await findIncident(attempt.incidentId);
  const chainStep = incident.whyChain.find(w => w.order === whyOrder);
  if (!chainStep) throw new NotFoundError(`whyChain step ${whyOrder} not found`);

  if (!chainStep.options.some(o => o.id === optionId)) {
    throw new BadRequestError("Invalid optionId for this step", { optionId: "Not an option for this question" });
  }

  // Scoring compares optionId to correctOptionId — NOT array position, so shuffling is safe.
  const correct = optionId === chainStep.correctOptionId;
  const isFinal = whyOrder === WHY_CHAIN_LENGTH;

  attempt.whyChainAnswers.push({ order: whyOrder, optionId, correct });
  await attempt.save();

  // Wrong answers still advance (each step can only be answered once).
  const nextStep = isFinal ? null : incident.whyChain.find(w => w.order === whyOrder + 1);

  return {
    correct,
    pointDelta: correct ? chainStep.points : -WRONG_WHY_PENALTY,
    isFinal,
    score: getRunningScore(attempt, incident),
    // Next question (no correctOptionId), options shuffled fresh per request
    nextQuestion: nextStep ? {
      order: nextStep.order,
      question: nextStep.question,
      options: shuffleOptions(nextStep.options),
      points: nextStep.points,
    } : null,
  };
};

// ---------------------------------------------------------------------------
// Finalise the attempt (player pressed finish or timer expired)
// ---------------------------------------------------------------------------
const finishAttempt = async (attemptId, userId, timeTakenSeconds, timedOut = false) => {
  const attempt = await findActiveAttempt(attemptId, userId);
  const incident = await findIncident(attempt.incidentId);

  let score = getRunningScore(attempt, incident);
  if (timeTakenSeconds < FAST_FINISH_SECONDS && !timedOut) score += FAST_FINISH_BONUS;

  score = Math.max(0, score);
  const passed = score >= PASS_SCORE;

  Object.assign(attempt, {
    status: "completed",
    score,
    passed,
    timeTakenSeconds,
    timedOut,
    createdAt: new Date(),
  });
  await attempt.save();

  return { score, passed, timeTakenSeconds, timedOut, feedback: incident.endSummary || DEFAULT_END_SUMMARY };
};

module.exports = { getIncidentForPlay, startAttempt, processClueClick, submitWhyStep, finishAttempt };
