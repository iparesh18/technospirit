import { cn } from "@/lib/utils";

/**
 * The four inquiry states, and the one place their colour is decided.
 *
 * Red is reserved for `new` — the site's rule is that red means signal, and
 * on this screen the signal is "nobody has dealt with this yet". Spending it
 * on all four would make the list a wall of red and mean nothing. The other
 * three are neutral, distinguished by fill rather than hue: solid white for
 * in-progress (active), outline for contacted, dim for closed.
 */
export const STATUS_META = {
  new: { label: "NEW", order: 0 },
  contacted: { label: "CONTACTED", order: 1 },
  "in-progress": { label: "IN PROGRESS", order: 2 },
  closed: { label: "CLOSED", order: 3 },
};

export const STATUS_KEYS = Object.keys(STATUS_META);

export default function StatusPill({ status, className }) {
  const meta = STATUS_META[status] ?? { label: String(status ?? "—").toUpperCase() };

  return (
    <span className={cn("ts-pill", className)} data-status={status}>
      {meta.label}
    </span>
  );
}
