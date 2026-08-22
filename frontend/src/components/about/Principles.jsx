import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { SystemLabel } from "@/components/ui/SystemLabel";
import ScrambleText from "@/components/motion/ScrambleText";

const PRINCIPLES = [
  {
    id: "01",
    title: "Design for humans.",
    body: "Every interface is used by someone in a hurry, on a bad connection, halfway through something else. That's the default we design for.",
  },
  {
    id: "02",
    title: "Engineer for scale.",
    body: "Decisions get made against where the system is going, not only where it is on launch day.",
  },
  {
    id: "03",
    title: "Automate the repetitive.",
    body: "If a person does it the same way twice a day, it belongs in software — and their time belongs somewhere harder.",
  },
  {
    id: "04",
    title: "Build for outcomes.",
    body: "Features are a means. The measure is whether the business can do something it couldn't do before.",
  },
  {
    id: "05",
    title: "Think beyond launch.",
    body: "Shipping is the point at which the real feedback starts. We plan for the second year, not just the first week.",
  },
];

/**
 * The counter column tracks whichever principle owns the viewport.
 *
 * It is held in place by CSS `position: sticky`, deliberately — not by a GSAP
 * pin. An earlier version used five ScrollTrigger.create() instances with
 * onToggle handlers; adjacent triggers fire in an undefined order at the
 * boundary between two principles, so the reel could receive "activate 03" and
 * "deactivate 02" in either sequence and jump. Sticky also costs no pin
 * spacer, which is where the blank band under the section came from.
 *
 * What remains is a single scrubbed trigger that owns the whole list and
 * derives the index from one progress value, so there is exactly one source of
 * truth and nothing to race. It measures with invalidateOnRefresh so a resize
 * or a route change re-measures rather than keeping stale offsets.
 */
export default function Principles() {
  const root = useRef(null);
  const reel = useRef(null);
  const rail = useRef(null);
  const count = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return undefined;

      const list = root.current.querySelector("[data-principle-list]");
      if (!list) return undefined;

      let active = -1;

      const trigger = ScrollTrigger.create({
        trigger: list,
        // The list starts driving once its top reaches the middle of the
        // viewport and stops when its bottom leaves that same line, so the
        // active principle is always the one you are actually reading.
        start: "top 55%",
        end: "bottom 55%",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;

          if (rail.current) {
            rail.current.style.transform = `scaleY(${p})`;
          }

          const index = Math.min(
            PRINCIPLES.length - 1,
            Math.max(0, Math.floor(p * PRINCIPLES.length)),
          );
          if (index === active) return;
          active = index;

          if (count.current) {
            count.current.textContent = PRINCIPLES[index].id;
          }
          root.current
            .querySelectorAll("[data-index-row]")
            .forEach((row, i) => row.classList.toggle("is-live", i === index));
          if (reel.current) {
            // yPercent on the reel is a percentage of the *reel's* height, and
            // the reel is as tall as all five digits stacked. -100 * index
            // therefore threw it five rows at a time and the counter was never
            // on screen at all. One row is 100 / count percent.
            gsap.to(reel.current, {
              yPercent: -(100 / PRINCIPLES.length) * index,
              duration: 0.7,
              ease: "expo.out",
              overwrite: true,
            });
          }
        },
      });

      gsap.fromTo(
        root.current.querySelectorAll("[data-principle]"),
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.09,
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        },
      );

      // useGSAP's context reverts everything created in here on unmount, but
      // killing the raw trigger explicitly keeps the intent obvious and covers
      // a fast route change that unmounts mid-scroll.
      return () => trigger.kill();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="paper"
      aria-label="Principles"
      className="relative bg-white ts-act"
    >
      <div className="ts-shell">
        <div className="mb-10 flex items-end justify-between gap-6 border-b border-hair pb-5">
          <SystemLabel>PRINCIPLES / 01—05</SystemLabel>
          <ScrambleText
            text="NON-NEGOTIABLE"
            className="ts-label hidden text-ash sm:inline-flex"
          />
        </div>

        <div className="ts-grid">
          {/* sticky slot-reel counter */}
          <div className="col-span-12 hidden lg:col-span-4 lg:block">
            <div className="sticky top-28 flex gap-6">
              {/* the rule fills as the list is read */}
              <div className="relative w-px shrink-0 bg-hair" aria-hidden="true">
                {/* The resting state is an inline transform, not Tailwind's scale-*
                       utility. Tailwind v4 compiles scale-y-0 to the standalone
                       `scale` property, which composes *with* the `transform`
                       GSAP writes rather than being replaced by it — the tween
                       runs to completion and the element stays flattened to
                       nothing. Same CSS property on both sides, no conflict. */}
                <div
                  ref={rail}
                  className="absolute inset-x-0 top-0 h-full origin-top bg-signal"
                  style={{ transform: "scaleY(0)" }}
                />
              </div>

              <div>
                <div
                  className="ts-display-tight h-[0.8em] overflow-hidden text-[clamp(5rem,11vw,12rem)] leading-[0.8] text-ink"
                  aria-hidden="true"
                >
                  <div ref={reel} className="will-change-transform">
                    {PRINCIPLES.map((p) => (
                      <div key={p.id} className="h-[0.8em] leading-[0.8]">
                        {p.id}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <span className="h-px w-14 bg-signal" aria-hidden="true" />
                  <span className="ts-label text-ash tabular-nums">
                    <span ref={count}>01</span> / 05
                  </span>
                </div>

                {/* Compact index of the whole set. The sticky column was
                    otherwise a tall empty margin next to a single numeral;
                    this keeps the reader oriented and puts the column to work. */}
                <ul className="mt-8 border-t border-hair" aria-hidden="true">
                  {PRINCIPLES.map((p) => (
                    <li
                      key={p.id}
                      data-index-row
                      className="ts-index-row flex items-baseline gap-3 border-b border-hair py-2"
                    >
                      <span className="ts-label tabular-nums text-ash-dim">{p.id}</span>
                      <span className="ts-label truncate text-ash">{p.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* the principles */}
          <ol data-principle-list className="col-span-12 lg:col-span-8">
            {PRINCIPLES.map((p) => (
              <li
                key={p.id}
                data-principle
                className="border-t border-hair py-7 first:border-t-0 first:pt-0 sm:py-10"
              >
                <div className="flex items-baseline gap-5">
                  <span className="ts-label text-signal tabular-nums lg:hidden">{p.id}</span>
                  <h3 className="ts-display-tight text-[clamp(1.9rem,6vw,4rem)] text-ink">
                    {p.title}
                  </h3>
                </div>
                <p className="ts-body mt-4 max-w-xl text-[0.98rem] text-ash sm:text-base">
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
