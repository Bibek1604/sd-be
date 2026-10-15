/**
 * Typed application errors. Services throw these; the central error handler
 * turns them into a consistent JSON response:
 *
 *   { error: string, code: string, details?: { [field]: string } }
 *
 * `error` is kept as the human-readable message so clients can always display it.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details) this.details = details;
    this.isOperational = true; // expected error → message is safe to show the client
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed", details) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", details) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflict", details) {
    super(message, 409, "CONFLICT", details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
