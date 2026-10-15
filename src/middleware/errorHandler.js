const mongoose = require("mongoose");
const config = require("../config/env");
const { AppError, NotFoundError } = require("../utils/errors");

const DUPLICATE_FIELD_LABELS = { email: "Email", phone: "Phone number" };

// Converts known library errors into AppErrors so the response shape is uniform.
const normalize = err => {
  if (err instanceof AppError) return err;

  // Malformed JSON body (thrown by express.json)
  if (err.type === "entity.parse.failed") {
    return new AppError("Request body is not valid JSON", 400, "INVALID_JSON");
  }
  if (err.type === "entity.too.large") {
    return new AppError("Request body is too large", 413, "PAYLOAD_TOO_LARGE");
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError(`Invalid ${err.path}`, 400, "INVALID_ID", { [err.path]: `Invalid ${err.path}` });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    );
    return new AppError(Object.values(details)[0] || "Validation failed", 400, "VALIDATION_ERROR", details);
  }

  // Unique index violation (e.g. two signups racing with the same email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || "field";
    const message = `${DUPLICATE_FIELD_LABELS[field] || field} already in use`;
    return new AppError(message, 409, "CONFLICT", { [field]: message });
  }

  return null;
};

const notFound = (req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const appError = normalize(err);

  if (!appError) {
    // Unexpected error — log the full stack, never leak internals to the client.
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    return res.status(500).json({
      error: config.isProduction ? "Something went wrong. Please try again." : err.message,
      code: "INTERNAL_ERROR",
    });
  }

  if (appError.statusCode >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err);

  const body = { error: appError.message, code: appError.code };
  if (appError.details) body.details = appError.details;
  res.status(appError.statusCode).json(body);
};

module.exports = { notFound, errorHandler };
