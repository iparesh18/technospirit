import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import AppError from "../utils/AppError.js";
import { cleanLine } from "../utils/sanitize.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/token.js";

/**
 * POST /api/auth/login
 *
 * One failure message for both "no such admin" and "wrong password". Saying
 * which one it was turns the endpoint into an account-enumeration oracle, and
 * the rate limiter in front of it only slows that down rather than closing it.
 */
export async function login(req, res, next) {
  try {
    const email = cleanLine(req.body?.email, { maxLength: 254 }).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      throw AppError.badRequest("Email and password are both required.");
    }

    // `passwordHash` is `select: false` on the model, so it has to be asked for.
    const admin = await Admin.findOne({ email }).select("+passwordHash");

    // bcrypt.compare runs even when no admin matched, against a hash that
    // cannot match, so a missing account and a wrong password take
    // indistinguishable time. Otherwise the response latency itself answers
    // "does this account exist".
    const ok = admin
      ? await admin.verifyPassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!admin || !ok) {
      throw AppError.unauthorized("Those credentials are not right.", {
        code: "BAD_CREDENTIALS",
      });
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    setAuthCookie(res, signToken(admin));

    res.json({
      ok: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * A genuine cost-12 bcrypt hash of a random string nothing will ever submit.
 * It exists only so the "no such admin" path spends the same ~200ms in bcrypt
 * that the "wrong password" path does. It must be a real hash — bcryptjs
 * returns false immediately for a malformed one, which would reintroduce the
 * timing difference this is here to remove.
 */
const DUMMY_HASH = "$2b$12$NfnfVXU02DdG5zoJI7nxwemfxmwL6/2tli6ePImM6H4pt7o6Qa7FW";

/**
 * GET /api/auth/me
 *
 * How the React app answers "am I signed in?" without ever holding the token.
 * `requireAuth` has already resolved `req.admin` or thrown 401.
 */
export async function me(req, res) {
  res.json({
    ok: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      lastLoginAt: req.admin.lastLoginAt,
      mustChangePassword: req.admin.mustChangePassword,
    },
  });
}

/**
 * POST /api/auth/logout
 *
 * Clears the cookie. Deliberately not behind `requireAuth`: logging out with
 * an already-expired token must still clear the stale cookie rather than
 * failing with a 401 and leaving it in place.
 */
export async function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true, message: "Signed out." });
}
