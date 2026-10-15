const { runSchema } = require("../utils/validator");
const { ValidationError } = require("../utils/errors");

/**
 * validate({ body?, query?, params? })
 * Validates and sanitises each request part against its schema. On failure,
 * responds 400 with every field error at once:
 *   { error: "<first message>", code: "VALIDATION_ERROR", details: { field: msg } }
 * On success the sanitised values replace the originals.
 */
const validate = schemas => (req, res, next) => {
  const allErrors = {};

  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    const { value, errors } = runSchema(schemas[part], req[part]);
    if (errors) Object.assign(allErrors, errors);
    else req[part] = value;
  }

  const messages = Object.values(allErrors);
  if (messages.length) return next(new ValidationError(messages[0], allErrors));
  next();
};

module.exports = validate;
