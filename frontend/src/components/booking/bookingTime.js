/**
 * Reading the server's slots in one named timezone.
 *
 * The API sends a flat list of UTC instants and deliberately does NOT group
 * them into days, because "Tuesday" is a different set of instants in Mumbai
 * than it is in New York. The grouping happens here instead, against whichever
 * zone the caller names — and every label the popup prints comes out of this
 * file.
 *
 * The popup names TechnoSpirit's own zone, not the reader's. Eastern Time is
 * the published standard for booking a call because that is when the team is
 * on the phone, and a US client — the audience this is for — sees their own
 * clock anyway. `visitorTimeZone` is still used, for two things: the secondary
 * "your local time" line shown to anyone outside ET, and the zone stored on
 * the booking so the team knows where the client actually is.
 */

/** The visitor's IANA zone, e.g. "Asia/Kolkata". "UTC" if the browser refuses. */
export function visitorTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The zone's short label for a given instant — "EDT", or "GMT+5:30" where the
 *  zone has no letters. Read from Intl so a DST change needs no code change. */
export function zoneAbbr(date, timeZone) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
        .formatToParts(date)
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

/**
 * The zone's full name for a given instant — "Eastern Daylight Time", and
 * "Eastern Standard Time" once the clocks go back.
 *
 * Read from Intl rather than written down, which is the whole point: nothing
 * in this codebase knows the changeover dates, so nothing in it can be wrong
 * about them on the morning after.
 */
export function zoneLongName(date, timeZone) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" })
        .formatToParts(date)
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

const cache = new Map();
/** Intl.DateTimeFormat construction is the expensive part, and the popup builds
 *  a few hundred labels — so each (zone, shape) pair is made once. */
function formatter(timeZone, options) {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let found = cache.get(key);
  if (!found) {
    try {
      found = new Intl.DateTimeFormat("en-US", { timeZone, ...options });
    } catch {
      found = new Intl.DateTimeFormat("en-US", options);
    }
    cache.set(key, found);
  }
  return found;
}

/** "11:30 AM" */
export const slotTime = (date, timeZone) =>
  formatter(timeZone, { hour: "numeric", minute: "2-digit", hour12: true }).format(date);

/** "Tuesday, September 8" */
export const longDate = (date, timeZone) =>
  formatter(timeZone, { weekday: "long", month: "long", day: "numeric" }).format(date);

/**
 * Slots grouped into the visitor's local days.
 *
 * Returns days in order, each with a `MON` / `08` pair for the chip and the
 * slots that fall inside it. Days whose every slot is taken are kept — they
 * are shown disabled, because a day that silently vanishes from the row reads
 * as a bug, while a full day reads as information.
 */
export function groupByDay(slots, timeZone) {
  const dayKey = formatter(timeZone, { year: "numeric", month: "2-digit", day: "2-digit" });
  const weekday = formatter(timeZone, { weekday: "short" });
  const dayNumber = formatter(timeZone, { day: "2-digit" });
  const monthShort = formatter(timeZone, { month: "short" });

  const byKey = new Map();

  for (const slot of slots) {
    const date = new Date(slot.at);
    if (Number.isNaN(date.getTime())) continue;

    const key = dayKey.format(date);
    let day = byKey.get(key);
    if (!day) {
      day = {
        key,
        weekday: weekday.format(date).toUpperCase(),
        day: dayNumber.format(date),
        month: monthShort.format(date).toUpperCase(),
        long: longDate(date, timeZone),
        slots: [],
      };
      byKey.set(key, day);
    }
    day.slots.push({ at: slot.at, date, taken: slot.taken, label: slotTime(date, timeZone) });
  }

  const days = [...byKey.values()];
  for (const day of days) {
    day.slots.sort((a, b) => a.date - b.date);
    day.open = day.slots.some((s) => !s.taken);
  }
  // Map iteration is insertion-ordered and the server sends slots ascending,
  // so the days are already chronological — sorted anyway rather than relying
  // on that, because it is a property of the response, not of this function.
  days.sort((a, b) => a.slots[0].date - b.slots[0].date);

  return days;
}

export default { visitorTimeZone, zoneAbbr, zoneLongName, slotTime, longDate, groupByDay };
