import Admin from "../models/Admin.js";
import AppError from "../utils/AppError.js";
import { AUTH_COOKIE, verifyToken } from "../utils/token.js";

/**
 * The gate on every admin endpoint.
 *
 * This is the real access control. Hiding /dashboard in React only decides
 * what is *rendered*; anyone can call the API directly with curl, so the data
 * has to be defended here, at the only place that touches it.
 *
 * The admin is re-read from Mongo on every request rather than trusted from
 * the token payload, so deleting an admin document revokes their session
 * immediately instead of at token expiry.
 */
export default async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) throw AppError.unauthorized("Not authenticated.");

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      // Expired and malformed are the same answer to the caller — 401 — but
      // worth separating in the code so the message stays honest.
      const expired = error.name === "TokenExpiredError";
      throw AppError.unauthorized(expired ? "Session expired." : "Invalid session.", {
        code: expired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
      });
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin) throw AppError.unauthorized("Session no longer valid.");

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}
