import env from "../config/env.js";
import AppError from "../utils/AppError.js";

export function notFound(req, _res, next) {
  next(AppError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

/**
 * The single exit for every failure.
 *
 * The rule: only an `AppError` gets its message forwarded to the caller.
 * Anything else is something the code did not anticipate, so it is logged in
 * full on the server and answered with one generic sentence — no stack trace,
 * no Mongo error text, no file path, no connection string. In development the
 * stack is attached to the response as well, because there the only reader is
 * the developer who caused it.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity (4).
export default function errorHandler(err, req, res, _next) {
  let error = err;

  // Mongoose validation → a field map, same shape the validator produces.
  if (error?.name === "ValidationError" && error.errors) {
    const fields = {};
    for (const [path, detail] of Object.entries(error.errors)) {
      fields[path] = detail.message;
    }
    error = AppError.badRequest("Some of those details need another look.", {
      code: "VALIDATION_FAILED",
      details: { fields },
    });
  }

  // Bad ObjectId in a URL param — a 404, not a 500.
  if (error?.name === "CastError") {
    error = AppError.notFound("That record does not exist.");
  }

  // Duplicate key.
  if (error?.code === 11000) {
    error = AppError.badRequest("That record already exists.");
  }

  // body-parser failures. These are caller mistakes, not server faults, so
  // they get their own status and a message that says what to change —
  // without them, an oversized paste came back as an opaque 500.
  if (error?.type === "entity.parse.failed") {
    error = AppError.badRequest("Request body was not valid JSON.");
  } else if (error?.type === "entity.too.large") {
    error = new AppError(413, "That message is too large. Please shorten it.", {
      code: "BODY_TOO_LARGE",
    });
  } else if (error?.type === "encoding.unsupported") {
    error = AppError.badRequest("Unsupported content encoding.");
  }

  const expected = error instanceof AppError || error?.expected === true;
  const statusCode = expected ? error.statusCode : 500;

  if (!expected) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  } else if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} — ${error.message}`);
  }

  const body = {
    ok: false,
    error: expected ? error.message : "Something went wrong on our end.",
  };
  if (expected && error.code) body.code = error.code;
  if (expected && error.details) Object.assign(body, error.details);
  if (!env.isProd && !expected) body.stack = err?.stack;

  res.status(statusCode).json(body);
}
