import { cn } from "@/lib/utils";

/**
 * The small mono label that names a section.
 *
 * This used to carry pseudo-system decoration — a `node="NODE 004"` id and a
 * pulsing `live` status dot — which read as sci-fi cosplay rather than as a
 * real interface. Both props are gone. A label now says what the section is,
 * and nothing else; the mono face and the tracking do all the work they need
 * to. Genuine sequence numbers (services 01–04, process steps) live on the
 * content itself, where they mean something.
 */
export function SystemLabel({ children, className }) {
  return (
    <span className={cn("ts-label inline-flex items-center text-[var(--fg-muted)]", className)}>
      {children}
    </span>
  );
}

/**
 * Section stamp: a numbered rule that spans the column and names the act.
 */
export function SectionStamp({ index, title, className }) {
  return (
    <div className={cn("flex items-baseline gap-4 border-t border-[var(--line)] pt-4", className)}>
      <span className="ts-label text-signal">{index}</span>
      <span className="ts-label text-[var(--fg-muted)]">{title}</span>
    </div>
  );
}

export default SystemLabel;
