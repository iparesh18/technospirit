import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import MaskText from "@/components/ui/MaskText";
import { SystemLabel } from "@/components/ui/SystemLabel";
import Globe from "@/components/motion/Globe";
import useWorldClock from "@/hooks/useWorldClock";

export default function GlobalPositioning() {
  const root = useRef(null);
  const zones = useWorldClock();
  // The globe and the register drive each other: hovering a row lights its
  // marker, hovering a marker lights its row. Nothing here claims an office —
  // these are working hours plotted on a sphere.
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      gsap
        .timeline({
          scrollTrigger: { trigger: q("[data-zones]")[0], start: "top 82%" },
        })
        .fromTo(
          q("[data-globe]"),
          { opacity: 0, scale: 0.94 },
          { opacity: 1, scale: 1, duration: 1.1, ease: "expo.out" },
        )
        .fromTo(
          q("[data-zone-row]"),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.07 },
          0.15,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="ink"
      aria-label="Global positioning"
      className="relative overflow-hidden bg-black ts-act text-white"
    >
      <div className="ts-shell">
        <div className="ts-grid items-end border-b border-white/16 pb-10">
          <div className="col-span-12 lg:col-span-8">
            <SystemLabel className="mb-6 text-white/50">ACROSS TIME ZONES</SystemLabel>
            <MaskText
              as="h2"
              lines={["Built without", "borders."]}
              className="ts-display-tight text-[clamp(2.8rem,9.5vw,8rem)] text-white"
            />
          </div>
          <div className="col-span-12 mt-8 lg:col-span-4 lg:mt-0">
            <p className="ts-body max-w-sm text-[0.98rem] text-white/60">
              Technology designed for businesses, teams and markets across time zones —
              with a workflow that doesn't assume everyone shares a working day.
            </p>
          </div>
        </div>

        {/* ── globe + zone register ─────────────────────────────────────
            Two halves of one instrument: the sphere on the left, the times
            on the right, cross-linked by hover. */}
        <div data-zones className="ts-grid mt-9 items-center gap-y-10">
          <div data-globe className="col-span-12 lg:col-span-5">
            <div className="mx-auto max-w-[24rem] lg:max-w-none">
              <Globe
                markers={zones}
                activeIndex={active}
                onActivate={setActive}
                className="cursor-crosshair"
              />

              {/* Live readout for whichever marker is lit. It sits under the
                  sphere rather than over it — floated on top it collided with
                  the southern graticule at every width. */}
              <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/16 pt-4">
                <div>
                  <div className="ts-display-wide text-[1.5rem] text-signal sm:text-[1.9rem]">
                    {zones[active]?.code}
                  </div>
                  <div className="ts-label mt-1 text-white/45">{zones[active]?.city}</div>
                </div>
                <div className="font-mono text-[1.5rem] tabular-nums text-white sm:text-[1.9rem]">
                  {zones[active]?.time}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <div className="ts-label mb-5 flex items-center justify-between text-white/35">
              <span>TIME ZONE REFERENCE</span>
              <span className="hidden sm:inline">LOCAL TIME</span>
            </div>

            <ul className="border-t border-white/16">
              {zones.map((z, i) => (
                <li
                  key={z.code}
                  data-zone-row
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  tabIndex={0}
                  className={[
                    "group/z relative cursor-crosshair border-b border-white/12 transition-colors duration-400",
                    i === active ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
                  ].join(" ")}
                >
                  {/* red rule marks the row the globe is pointing at */}
                  <span
                    aria-hidden="true"
                    className={[
                      "absolute bottom-0 left-0 h-px w-full origin-left bg-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      i === active ? "scale-x-100" : "scale-x-0",
                    ].join(" ")}
                  />

                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 py-4 sm:py-5">
                    <span className="ts-display-wide w-20 shrink-0 text-[1.15rem] text-white sm:text-[1.4rem]">
                      {z.code}
                    </span>
                    <span className="ts-body flex-1 text-[0.95rem] text-white/60 sm:text-base">
                      {z.city}
                    </span>
                    <span className="font-mono text-base tabular-nums text-white sm:text-lg">
                      {z.time}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <p className="ts-body mt-5 max-w-lg text-sm text-white/35">
              These are working hours, not client locations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
