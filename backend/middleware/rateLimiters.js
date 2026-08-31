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

/**
 * The assistant. Every message costs an upstream call, so this is the one
 * limiter that protects a bill as well as the server: 15 messages in 5 minutes
 * is a comfortable conversation and an expensive scrape.
 */
export const chatLimiter = rateLimit({
  ...shared,
  windowMs: 5 * 60 * 1000,
  limit: 15,
  message: {
    ok: false,
    error: "That's a lot of questions at once. Give me a moment to catch up.",
  },
});

/**
 * Call bookings.
 *
 * Tighter than `contact`: a booking holds a real slot in the calendar, so a
 * script that gets through fills the week rather than just the inbox. Three in
 * fifteen minutes still covers a visitor who books, mistypes their number,
 * cancels by email and books again.
 */
export const bookingLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 3,
  message: {
    ok: false,
    error: "You've booked a few calls already. Get in touch by email if you need another time.",
  },
});

/**
 * Reading availability is a cheap GET with no side effect, and the popup
 * legitimately refetches it — on open, and again after a slot is lost to
 * someone else. This is a ceiling on scraping, not on use.
 */
export const availabilityLimiter = rateLimit({
  ...shared,
  windowMs: 5 * 60 * 1000,
  limit: 60,
  message: { ok: false, error: "Too many requests." },
});

/** A broad ceiling on the admin API — a signed-in session is still not a licence to scrape. */
export const adminApiLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 120,
  message: { ok: false, error: "Too many requests." },
});
