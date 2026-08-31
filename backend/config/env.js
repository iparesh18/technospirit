import "dotenv/config";

/**
 * One place that reads `process.env`, so nothing downstream has to guess
 * whether a value was set, trimmed, or spelled the way it is in `.env.example`.
 *
 * Everything is read once at import time. A missing critical value fails the
 * boot rather than surfacing later as a 500 on a visitor's first inquiry.
 */

/**
 * Read one variable, treating PRESENT-BUT-EMPTY as absent.
 *
 * `??` alone is wrong here: a `.env` written from `.env.example` has lines
 * like `GROQ_MODEL=` sitting in it, which makes the variable defined and empty
 * — so the fallback never applied and the model name arrived as "". Every
 * "leave it blank and the default applies" line in `.env.example` depends on
 * this, and a blank value has never meant anything other than "not set" here.
 */
const str = (key, fallback = "") => {
  const raw = process.env[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  return value === "" ? fallback : value;
};

const NODE_ENV = str("NODE_ENV", "development");
const isProd = NODE_ENV === "production";

/** Origins allowed to make credentialed (cookie-bearing) requests. */
const clientOrigins = str("CLIENT_ORIGIN", "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const emailUser = str("EMAIL_USER");
const emailPass = str("EMAIL_APP_PASSWORD");

const aiProvider = str("AI_PROVIDER", "groq").toLowerCase();
const groqKey = str("GROQ_API_KEY");
const openrouterKey = str("OPENROUTER_API_KEY");
const providerKeys = { groq: groqKey, openrouter: openrouterKey };

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

  /**
   * The assistant.
   *
   * `provider` is the only switch. Nothing outside services/ai/ reads the
   * per-provider blocks, so adding a provider is a new file plus a case in the
   * registry — the prompt, the knowledge base and the conversation rules sit
   * above that line and never learn which vendor answered.
   *
   * `configured` is deliberately per-provider rather than global: the route
   * has to be able to say "the assistant is not set up" for the ACTIVE
   * provider, not for whichever one happens to hold a key.
   */
  ai: {
    provider: aiProvider,
    groq: {
      apiKey: groqKey,
      /**
       * Verified against Groq's model list rather than assumed. The Llama
       * models this project would otherwise have reached for
       * (llama-3.3-70b-versatile, llama-3.1-8b-instant) were deprecated by
       * Groq on 17 June 2026, with gpt-oss named as the migration target.
       * gpt-oss-20b is the fast one, which is the right trade for two-sentence
       * support answers; openai/gpt-oss-120b is the swap if grounding ever
       * needs more weight. One env var, one place.
       */
      model: str("GROQ_MODEL", "openai/gpt-oss-20b"),
    },
    openrouter: {
      apiKey: openrouterKey,
      model: str("OPENROUTER_MODEL", "openai/gpt-oss-20b"),
    },
    /**
     * Automatic failover to the other provider. OFF unless asked for, because
     * silently spending a second vendor's credits when the first hiccups is
     * not a decision code should make on an operator's behalf.
     */
    fallbackEnabled: str("AI_FALLBACK_ENABLED", "false").toLowerCase() === "true",
    configured: Boolean(providerKeys[aiProvider]),
  },

  /**
   * Contact details the assistant is allowed to hand out.
   *
   * These live in env, not in knowledge/technospirit.json, for one reason: the
   * knowledge file is committed and the real number is not. The defaults are
   * obvious placeholders so an unconfigured deployment reads as unconfigured
   * rather than as a wrong phone number a visitor might actually dial.
   */
  contact: {
    phone: str("TECHNOSPIRIT_CONTACT_PHONE", "+15551234567"),
    email: str("TECHNOSPIRIT_CONTACT_EMAIL", "hello@example.com"),
  },

  /**
   * Call booking — the raw strings only.
   *
   * Nothing here interprets them: `config/availability.js` is the one file
   * that parses these into a schedule, and it is the file to open when the
   * working week, the hours or the slot length need to change. Splitting it
   * that way keeps this module's single job (read process.env, trim, default)
   * intact while still giving the booking system one obvious place to edit.
   */
  booking: {
    timezone: str("BOOKING_TIMEZONE", "America/New_York"),
    days: str("BOOKING_DAYS", "1,2,3,4,5"),
    start: str("BOOKING_START", "10:00"),
    end: str("BOOKING_END", "18:00"),
    slotMinutes: str("BOOKING_SLOT_MINUTES", "30"),
    leadHours: str("BOOKING_LEAD_HOURS", "12"),
    horizonDays: str("BOOKING_HORIZON_DAYS", "21"),
    blockedDates: str("BOOKING_BLOCKED_DATES", ""),
  },
};

/**
 * Fail fast, and fail louder in production.
 *
 * `JWT_SECRET` length is checked because a short secret is a brute-forceable
 * one, and the default in `.env.example` is deliberately a placeholder that
 * would trip this if it were ever shipped unchanged.
 */
export const KNOWN_AI_PROVIDERS = ["groq", "openrouter"];

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

  // Never fatal. A missing AI key disables one widget; it must not stop the
  // contact form, the dashboard or the site from booting.
  if (!KNOWN_AI_PROVIDERS.includes(env.ai.provider)) {
    warn.push(
      `AI_PROVIDER "${env.ai.provider}" is not one of ${KNOWN_AI_PROVIDERS.join(", ")} — the assistant will refuse to answer.`,
    );
  } else if (!env.ai.configured) {
    warn.push(
      `${env.ai.provider.toUpperCase()}_API_KEY unset — /api/chat will answer 503 with the contact fallback.`,
    );
  }

  for (const message of warn) console.warn(`[env] warning: ${message}`);

  if (fatal.length) {
    for (const message of fatal) console.error(`[env] fatal: ${message}`);
    throw new Error("Refusing to start with an incomplete environment.");
  }
}

export default env;
