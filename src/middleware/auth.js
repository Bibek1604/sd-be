const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { UnauthorizedError, ForbiddenError } = require("../utils/errors");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Unauthorized: Missing or invalid token"));
  }

  const token = authHeader.slice("Bearer ".length).trim();
  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch (error) {
    const message = error.name === "TokenExpiredError"
      ? "Your session has expired. Please log in again."
      : "Unauthorized: Invalid token";
    next(new UnauthorizedError(message));
  }
};

const requireRole = role => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return next(new ForbiddenError("Forbidden: Insufficient role"));
  }
  next();
};

module.exports = { authenticate, requireRole };
