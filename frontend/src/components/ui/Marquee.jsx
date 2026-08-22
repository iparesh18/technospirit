import { cn } from "@/lib/utils";

/**
 * Infinite marquee. Pure CSS transform loop (no JS frame cost), duplicated
 * once and translated -50% so the seam is invisible. Halts entirely under
 * prefers-reduced-motion via the rule in index.css.
 */
export default function Marquee({
  items = [],
  duration = 40,
  reverse = false,
  className,
  itemClassName,
  separator = "—",
}) {
  const run = [...items, ...items];

  return (
    <div className={cn("relative w-full overflow-hidden", className)} aria-hidden="true">
      <div
        className="ts-marquee-track"
        data-direction={reverse ? "reverse" : "normal"}
        style={{ "--marquee-duration": `${duration}s` }}
      >
        {run.map((item, i) => (
          <span key={i} className={cn("flex shrink-0 items-center", itemClassName)}>
            <span className="whitespace-nowrap">{item}</span>
            <span className="mx-6 text-signal sm:mx-10" aria-hidden="true">
              {separator}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
