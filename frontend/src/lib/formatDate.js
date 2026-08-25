/**
 * Date formatting for the dashboard.
 *
 * All of it runs in the operator's own locale and timezone — the API stores
 * and returns UTC, and converting at the edge is the only way "Aug 25 · 10:12"
 * means what the reader expects it to mean.
 */

const DAY = 24 * 60 * 60 * 1000;

const dayMonth = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const dayMonthYear = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const full = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });

/** "Aug 25 · 10:12" — drops the year unless it is not the current one. */
export function stamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const datePart = (sameYear ? dayMonth : dayMonthYear).format(date);
  return `${datePart} · ${clock.format(date)}`;
}

export function dateOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : full.format(date);
}

export function timeOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : clock.format(date);
}

/** "2h ago" / "3d ago" — a scanning aid in the list, never the only timestamp. */
export function relative(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return dayMonth.format(date);
}
