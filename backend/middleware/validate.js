import { validationResult } from "express-validator";
import AppError from "../utils/AppError.js";

/**
 * Turns express-validator's accumulated errors into one 400 with a field map,
 * which is the shape the contact form already renders per field.
 */
export default function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields = {};
  for (const error of result.array()) {
    // First message per field wins — the form shows one line per field.
    if (error.path && !fields[error.path]) fields[error.path] = error.msg;
  }

  return next(
    AppError.badRequest("Some of those details need another look.", {
      code: "VALIDATION_FAILED",
      details: { fields },
    }),
  );
}
