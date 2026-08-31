import { cn } from "@/lib/utils";

/**
 * The four call states, and the one place their colour is decided.
 *
 * Same rule as <StatusPill>: red is spent on exactly one thing, and on this
 * screen that thing is "this call has not happened yet" — the row an operator
 * has to act on. Completed, cancelled and no-show are distinguished by fill
 * rather than hue, so the list reads at a glance instead of as a wall of
 * colour. It reuses `.ts-pill`, so a booking badge and an inquiry badge are
 * literally the same object.
 */
export const BOOKING_STATUS_META = {
  scheduled: { label: "SCHEDULED", pill: "new" },
  completed: { label: "COMPLETED", pill: "in-progress" },
  cancelled: { label: "CANCELLED", pill: "closed" },
  "no-show": { label: "NO-SHOW", pill: "contacted" },
};

export const BOOKING_STATUS_KEYS = Object.keys(BOOKING_STATUS_META);

export default function BookingPill({ status, className }) {
  const meta = BOOKING_STATUS_META[status];

  return (
    <span
      className={cn("ts-pill", className)}
      /* Borrows the inquiry pill's colour contract rather than declaring a
         second one — one set of badge styles for the whole dashboard. */
      data-status={meta?.pill ?? "closed"}
    >
      {meta?.label ?? String(status ?? "—").toUpperCase()}
    </span>
  );
}

/**
 * The flat badges: country, interest, and the two the clock decides.
 *
 * TODAY and UPCOMING are computed here rather than read from the document,
 * because they are statements about right now — a stored "TODAY" is a row that
 * quietly lies tomorrow morning.
 */
export function bookingTags(booking) {
  const tags = [];
  const at = new Date(booking.scheduledAt);

  if (!Number.isNaN(at.getTime())) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    if (at >= startOfToday && at < startOfTomorrow) tags.push({ key: "today", label: "TODAY" });
    else if (at >= startOfTomorrow) tags.push({ key: "upcoming", label: "UPCOMING" });
    else tags.push({ key: "past", label: "PAST" });
  }

  for (const tag of booking.tags ?? []) {
    tags.push({ key: `t-${tag}`, label: tag });
  }

  return tags;
}

export function TagRow({ tags, className }) {
  if (!tags?.length) return null;
  return (
    <span className={cn("ts-tagrow", className)}>
      {tags.map((tag) => (
        <span key={tag.key} className="ts-tag" data-tag={tag.key}>
          {tag.label}
        </span>
      ))}
    </span>
  );
}
