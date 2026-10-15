/**
 * Minimal, dependency-free schema validation.
 *
 * A schema is an object of `field -> rule`. Each rule is a function that takes
 * the raw value and returns the sanitised value, or throws a FieldError.
 *
 *   const schema = { email: v.email(), age: v.integer({ min: 0 }) };
 *   const { value, errors } = runSchema(schema, req.body);
 *
 * Unknown fields are dropped, so clients cannot smuggle extra properties
 * (e.g. `role`) through to services.
 */
const mongoose = require("mongoose");

class FieldError extends Error {}

const isEmpty = v => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// Handles required/optional/default uniformly for every rule type.
const rule = (opts, check) => raw => {
  const { label = "Value", required = true } = opts;
  if (isEmpty(raw)) {
    if ("default" in opts) return opts.default;
    if (required) throw new FieldError(`${label} is required`);
    return undefined;
  }
  return check(raw, label);
};

const string = (opts = {}) =>
  rule(opts, (raw, label) => {
    if (typeof raw !== "string") throw new FieldError(`${label} must be text`);
    let value = opts.trim === false ? raw : raw.trim();
    if (opts.lowercase) value = value.toLowerCase();
    if (opts.min !== undefined && value.length < opts.min)
      throw new FieldError(`${label} must be at least ${opts.min} characters`);
    if (opts.max !== undefined && value.length > opts.max)
      throw new FieldError(`${label} must be at most ${opts.max} characters`);
    if (opts.pattern && !opts.pattern.test(value))
      throw new FieldError(opts.patternMessage || `${label} is invalid`);
    return value;
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const email = (opts = {}) =>
  string({
    label: "Email",
    max: 254,
    lowercase: true,
    pattern: EMAIL_RE,
    patternMessage: "Please enter a valid email address",
    ...opts,
  });

// Accepts common formatting (spaces, dashes, parentheses, leading +) and
// normalises to digits only.
const phone = (opts = {}) =>
  rule({ label: "Phone number", ...opts }, (raw, label) => {
    if (typeof raw !== "string" && typeof raw !== "number") throw new FieldError(`${label} must be text`);
    const str = String(raw).trim();
    if (!/^\+?[\d\s\-()]+$/.test(str)) throw new FieldError(`${label} must contain digits only`);
    const digits = str.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) throw new FieldError(`${label} must be 7–15 digits`);
    return digits;
  });

const number = (opts = {}) =>
  rule(opts, (raw, label) => {
    const value = typeof raw === "string" ? Number(raw) : raw;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new FieldError(`${label} must be a number`);
    if (opts.integer && !Number.isInteger(value)) throw new FieldError(`${label} must be a whole number`);
    if (opts.min !== undefined && value < opts.min) throw new FieldError(`${label} must be at least ${opts.min}`);
    if (opts.max !== undefined && value > opts.max) throw new FieldError(`${label} must be at most ${opts.max}`);
    return value;
  });

const integer = (opts = {}) => number({ ...opts, integer: true });

const boolean = (opts = {}) =>
  rule(opts, (raw, label) => {
    if (raw === true || raw === "true") return true;
    if (raw === false || raw === "false") return false;
    throw new FieldError(`${label} must be true or false`);
  });

const objectId = (opts = {}) =>
  rule(opts, (raw, label) => {
    if (typeof raw !== "string" || !mongoose.isValidObjectId(raw) || !/^[a-f\d]{24}$/i.test(raw))
      throw new FieldError(`${label} is not a valid id`);
    return raw;
  });

const runSchema = (schema, source = {}) => {
  const value = {};
  const errors = {};
  for (const [field, check] of Object.entries(schema)) {
    try {
      const result = check(source?.[field]);
      if (result !== undefined) value[field] = result;
    } catch (err) {
      if (!(err instanceof FieldError)) throw err;
      errors[field] = err.message;
    }
  }
  return { value, errors: Object.keys(errors).length ? errors : null };
};

module.exports = {
  v: { string, email, phone, number, integer, boolean, objectId },
  runSchema,
  FieldError,
};
