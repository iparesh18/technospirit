import availability from "../../config/availability.js";

/**
 * Turning the schedule in `config/availability.js` into actual instants.
 *
 * Everything this module returns is a UTC `Date`. The business timezone is
 * used to decide WHICH instants exist; it never leaves this file as a format.
 * That separation is what makes the whole feature timezone-safe: one zone
 * generates, UTC transports, and the browser renders in the visitor's own.
 *
 * No date library. Two Intl-based primitives (`offsetAt`, `partsAt`) are all a
 * fixed weekly schedule needs, and both are exact across DST because they ask
 * the platform's own tz database rather than doing arithmetic on offsets.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * The zone's UTC offset, in milliseconds, at a given instant.
 *
 * Formats the instant in the zone, reads the wall-clock fields back, and
 * measures how far they sit from the same fields read as UTC. That difference
 * IS the offset, including whatever DST was in force at that moment.
 */
function offsetAt(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));

  const field = {};
  for (const part of parts) field[part.type] = part.value;

  const asUtc = Date.UTC(
    Number(field.year),
    Number(field.month) - 1,
    Number(field.day),
    Number(field.hour) % 24,
    Number(field.minute),
    Number(field.second),
  );

  return asUtc - utcMs;
}

/** Wall-clock date parts (and weekday) for an instant, in the given zone. */
export function partsAt(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(utcMs));

  const field = {};
  for (const part of parts) field[part.type] = part.value;

  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(field.year),
    month: Number(field.month),
    day: Number(field.day),
    weekday: weekdays[field.weekday] ?? 0,
    /** YYYY-MM-DD in the business timezone — the key `blockedDates` uses. */
    date: `${field.year}-${field.month}-${field.day}`,
  };
}

/**
 * A wall-clock time in `timeZone` → the UTC instant it names.
 *
 * Two passes, because the offset needed to convert depends on the instant the
 * conversion produces. The first pass guesses with the offset at the naive
 * instant; if the real offset there differs (a DST boundary sits between the
 * two) the second pass corrects it. Converging in two is guaranteed for every
 * real-world zone, whose offsets never move by more than a day.
 */
function zonedToUtc({ year, month, day, minutes }, timeZone) {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0) + minutes * MINUTE;
  const first = offsetAt(naive, timeZone);
  const candidate = naive - first;
  const second = offsetAt(candidate, timeZone);
  return second === first ? candidate : naive - second;
}

/** Add whole days to a business-local calendar date, without drifting on DST:
 *  midday is used as the anchor, which no real zone shifts across. */
function addDays({ year, month, day }, count, timeZone) {
  const noonUtc = zonedToUtc({ year, month, day, minutes: 12 * 60 }, timeZone);
  return partsAt(noonUtc + count * DAY, timeZone);
}

function isOpen(dateParts) {
  if (!availability.days.includes(dateParts.weekday)) return false;
  if (availability.blockedDates.has(dateParts.date)) return false;
  return true;
}

/**
 * Every slot the schedule allows between now and the horizon, as UTC ms.
 *
 * Ordered, de-duplicated by construction, and already filtered by the lead
 * time — a caller never has to re-check "is this in the past".
 */
export function generateSlots({ now = Date.now() } = {}) {
  const { timezone, startMinutes, endMinutes, slotMinutes, horizonDays, leadMinutes } =
    availability;

  const earliest = now + leadMinutes * MINUTE;
  const slots = [];

  let cursor = partsAt(now, timezone);

  for (let dayIndex = 0; dayIndex < horizonDays; dayIndex += 1) {
    if (isOpen(cursor)) {
      for (let minutes = startMinutes; minutes < endMinutes; minutes += slotMinutes) {
        const at = zonedToUtc({ ...cursor, minutes }, timezone);
        if (at >= earliest) slots.push(at);
      }
    }
    cursor = addDays(cursor, 1, timezone);
  }

  return slots;
}

/**
 * Is this exact instant a slot the schedule would have offered?
 *
 * The authoritative answer to "did that really come from our own calendar",
 * and the reason a crafted request cannot book 3am on a Sunday. Regenerating
 * the set is cheap — a three-week horizon is a few hundred numbers — and it
 * can never drift from what the popup was shown, because it is the same
 * function that produced it.
 */
export function isBookableSlot(value, { now = Date.now() } = {}) {
  const at = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(at)) return false;
  return generateSlots({ now }).includes(at);
}

/** The IANA zone the schedule is written in — sent to the client for display
 *  only, so a visitor can see whose working day they are booking into. */
export const businessTimezone = availability.timezone;

export default { generateSlots, isBookableSlot, partsAt, businessTimezone };
