import rateLimit from "express-rate-limit";
import env from "../config/env.js";

/**
 * Rate limits.
 *
 * Two different jobs, so two different shapes:
 *
 *   login   — narrow and strict. This is the brute-force surface, and a real
 *             admin logs in a handful of times a day. Successful logins are
 *             not counted, so getting it right resets nothing against you.
 *
 *   contact — wide enough that a genuine visitor who sends one inquiry, spots
 *             a typo and sends another is never blocked, tight enough that a
 *             script cannot fill the collection.
 *
 * Both are disabled under NODE_ENV=test so the test flow can run the failure
 * cases (wrong password ×N, rapid duplicate submits) without tripping itself.
 */

const isTest = env.nodeEnv === "test";

const shared = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => isTest,
};

export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  message: {
    ok: false,
    error: "Too many sign-in attempts. Try again in a few minutes.",
  },
});

export const contactLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: {
    ok: false,
    error: "You've sent a few messages already. Give us a moment to read them.",
  },
});

/** A broad ceiling on the admin API — a signed-in session is still not a licence to scrape. */
export const adminApiLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 120,
  message: { ok: false, error: "Too many requests." },
});
