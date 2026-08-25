import "dotenv/config";

/**
 * One place that reads `process.env`, so nothing downstream has to guess
 * whether a value was set, trimmed, or spelled the way it is in `.env.example`.
 *
 * Everything is read once at import time. A missing critical value fails the
 * boot rather than surfacing later as a 500 on a visitor's first inquiry.
 */

const str = (key, fallback = "") => (process.env[key] ?? fallback).trim();

const NODE_ENV = str("NODE_ENV", "development");
const isProd = NODE_ENV === "production";

/** Origins allowed to make credentialed (cookie-bearing) requests. */
const clientOrigins = str("CLIENT_ORIGIN", "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const emailUser = str("EMAIL_USER");
const emailPass = str("EMAIL_APP_PASSWORD");

const env = {
  nodeEnv: NODE_ENV,
  isProd,
  port: Number(str("PORT", "5000")),

  mongoUri: str("MONGO_URI"),

  jwtSecret: str("JWT_SECRET"),
  jwtExpiresIn: str("JWT_EXPIRES_IN", "7d"),

  adminEmail: str("ADMIN_EMAIL").toLowerCase(),
  adminInitialPassword: str("ADMIN_INITIAL_PASSWORD"),

  mail: {
    user: emailUser,
    pass: emailPass,
    // The internal notification falls back to the sending account, which is
    // the documented Phase-2 setup: one Gmail box is both sender and receiver.
    receiver: str("CONTACT_RECEIVER") || emailUser,
    /** Mail is optional infrastructure — an inquiry is still saved without it. */
    configured: Boolean(emailUser && emailPass),
  },

  clientOrigins,
};

/**
 * Fail fast, and fail louder in production.
 *
 * `JWT_SECRET` length is checked because a short secret is a brute-forceable
 * one, and the default in `.env.example` is deliberately a placeholder that
 * would trip this if it were ever shipped unchanged.
 */
export function assertEnv() {
  const fatal = [];
  const warn = [];

  if (!env.mongoUri) fatal.push("MONGO_URI is not set.");
  if (!env.jwtSecret) fatal.push("JWT_SECRET is not set.");
  else if (env.jwtSecret.length < 32) {
    (isProd ? fatal : warn).push("JWT_SECRET is shorter than 32 characters.");
  }
  if (isProd && env.jwtSecret === "replace-with-a-long-random-string") {
    fatal.push("JWT_SECRET is still the .env.example placeholder.");
  }

  if (!env.adminEmail || !env.adminInitialPassword) {
    warn.push("ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD unset — no admin will be bootstrapped.");
  }
  if (!env.mail.configured) {
    warn.push("EMAIL_USER / EMAIL_APP_PASSWORD unset — inquiries save, but no mail is sent.");
  }

  for (const message of warn) console.warn(`[env] warning: ${message}`);

  if (fatal.length) {
    for (const message of fatal) console.error(`[env] fatal: ${message}`);
    throw new Error("Refusing to start with an incomplete environment.");
  }
}

export default env;
