/**
 * An error the API is willing to describe to the caller.
 *
 * The error handler treats anything that is NOT an AppError as unexpected and
 * replies with a generic message, so an accidental `TypeError` can never leak
 * a stack trace, a file path, or a Mongo connection string to a visitor.
 */
export default class AppError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expected = true;
    if (code) this.code = code;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message, options) {
    return new AppError(400, message, options);
  }
  static unauthorized(message = "Not authenticated.", options) {
    return new AppError(401, message, options);
  }
  static forbidden(message = "Not allowed.", options) {
    return new AppError(403, message, options);
  }
  static notFound(message = "Not found.", options) {
    return new AppError(404, message, options);
  }
  static tooMany(message = "Too many requests.", options) {
    return new AppError(429, message, options);
  }
}
