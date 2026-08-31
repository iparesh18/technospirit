import env from "./env.js";

/**
 * WHEN TECHNOSPIRIT CAN BE CALLED — the one file to edit.
 *
 * Every scheduling rule the booking system has lives here. Nothing else in the
 * codebase decides a working day, an opening hour or a slot length, and there
 * is no hard-coded time anywhere in the React components — the popup renders
 * whatever `GET /api/bookings/availability` hands it.
 *
 * Changing the schedule is either an edit to the defaults below or a line in
 * `.env`; it is never a code change to the booking flow.
 *
 * ── The timezone question ──────────────────────────────────────────────────
 *
 * Slots are generated in TECHNOSPIRIT'S timezone, not the visitor's. That is
 * the only correct model for this business process: TechnoSpirit places the
 * call, so the slot has to fall inside TechnoSpirit's working day. The visitor
 * never sees that timezone as a number to convert — the API sends UTC instants
 * and the popup renders them in the visitor's own zone with the zone named
 * next to them, so "1:00 PM" always means one o'clock where the reader is
 * sitting.
 */

/** Whitespace-tolerant "a, b ,c" → ["a","b","c"], empties dropped. */
const list = (value) =>
  String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** "09:30" → 570 minutes past midnight. Anything unparseable falls back. */
function minutesOfDay(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

/** Rejects a timezone the host's ICU does not know, rather than throwing on
 *  the first request that tries to format with it. */
function usableTimeZone(candidate, fallback) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    console.warn(`[booking] unknown BOOKING_TIMEZONE "${candidate}" — falling back to ${fallback}.`);
    return fallback;
  }
}

const DEFAULT_TZ = "America/New_York";

/**
 * The schedule.
 *
 * `days` uses JavaScript's own weekday numbering — 0 Sunday … 6 Saturday — so
 * "1,2,3,4,5" is Monday to Friday. `blockedDates` are plain YYYY-MM-DD strings
 * in the business timezone: holidays, a closed week, a day someone is away.
 */
const availability = {
  timezone: usableTimeZone(env.booking.timezone, DEFAULT_TZ),

  /** Working days, 0 = Sunday. */
  days: (() => {
    const parsed = list(env.booking.days)
      .map((d) => Number.parseInt(d, 10))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    return parsed.length ? [...new Set(parsed)].sort() : [1, 2, 3, 4, 5];
  })(),

  /** First and last slot START, as minutes past midnight in `timezone`. A slot
   *  beginning at `endMinutes` is not generated — the day closes then. */
  startMinutes: minutesOfDay(env.booking.start, 10 * 60),
  endMinutes: minutesOfDay(env.booking.end, 18 * 60),

  /** Length of one call slot, and therefore the spacing between them. */
  slotMinutes: Math.max(5, int(env.booking.slotMinutes, 30)),

  /** Minimum notice. A slot closer than this to "now" is never offered — the
   *  team needs to see the booking before the phone is supposed to ring. */
  leadMinutes: Math.max(0, int(env.booking.leadHours, 12)) * 60,

  /** How far ahead the popup may reach. */
  horizonDays: Math.min(120, Math.max(1, int(env.booking.horizonDays, 21))),

  /** YYYY-MM-DD dates (business timezone) that are closed regardless of day. */
  blockedDates: new Set(list(env.booking.blockedDates)),
};

/** Sanity: an end before a start would generate nothing at all, silently. */
if (availability.endMinutes <= availability.startMinutes) {
  console.warn(
    `[booking] BOOKING_END (${env.booking.end}) is not after BOOKING_START (${env.booking.start}) — using 10:00–18:00.`,
  );
  availability.startMinutes = 10 * 60;
  availability.endMinutes = 18 * 60;
}

export default availability;
