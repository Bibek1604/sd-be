const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");
const { ConflictError, UnauthorizedError } = require("../utils/errors");

const signToken = (user) => {
  const payload = { userId: user._id, role: user.role };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

// Input is already validated and normalised (trimmed, lowercased email, digits-only phone).
const signup = async ({ name, email, phone, password }) => {
  const [existingEmail, existingPhone] = await Promise.all([
    User.exists({ email }),
    User.exists({ phone }),
  ]);

  // Report every conflict at once so the user can fix both fields in one go.
  const details = {};
  if (existingEmail) details.email = "Email already in use";
  if (existingPhone) details.phone = "Phone number already in use";
  if (Object.keys(details).length) throw new ConflictError(Object.values(details)[0], details);

  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  const user = await User.create({ name, email, phone, passwordHash, role: "employee" });

  // Return token + sanitised user (toJSON strips passwordHash)
  return { token: signToken(user), user: user.toJSON() };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+passwordHash");

  // Same message for unknown email and wrong password — don't reveal which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return { token: signToken(user), user: user.toJSON() };
};

module.exports = { signup, login };
