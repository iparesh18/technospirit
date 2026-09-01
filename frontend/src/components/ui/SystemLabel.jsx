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
/**
 * `as` exists for the heading outline, not for styling.
 *
 * Several of these labels are the only thing that names a section — the
 * sections on /about and /why-us go straight from the page h1 into a run of
 * h3 item headings, so the label is the missing h2 and the outline reads as
 * if the items hang off nothing.
 *
 * Passing `as="h2"` is purely semantic here. index.css declares
 * `h1, h2, h3, h4` with one identical rule (font-weight: 800; text-wrap:
 * balance) and every visual property of this component comes from `ts-label`
 * and the caller's className, so the rendered result is byte-identical to the
 * span. Default stays `span`: most labels sit beside a real heading and
 * promoting those would invent a second one.
 */
export function SystemLabel({ children, className, as: Tag = "span" }) {
  return (
    <Tag
      className={cn(
        // `text-wrap: wrap` is the span's initial value, so it is a no-op in
        // the default case. It is here because index.css's base rule gives
        // h1-h4 `text-wrap: balance`, and that is the one declaration in that
        // rule `ts-label` does not already override — measured, not assumed:
        // font-weight resolves to 500 either way because Tailwind's utility
        // layer outranks base, but text-wrap had nothing competing with it.
        // Pinning it keeps a label's line breaking a property of the label
        // rather than of whichever tag a caller passes.
        "ts-label inline-flex items-center text-wrap text-[var(--fg-muted)]",
        className,
      )}
    >
      {children}
    </Tag>
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
