import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import MaskText from "@/components/ui/MaskText";
import { SystemLabel } from "@/components/ui/SystemLabel";

const STEPS = [
  { id: "01", name: "Discover", body: "What the business needs to do, who it's for, and what's currently in the way." },
  { id: "02", name: "Design", body: "Structure, hierarchy and interface — decided before a line of production code exists." },
  { id: "03", name: "Engineer", body: "Built with performance, accessibility and future change treated as requirements." },
  { id: "04", name: "Test", body: "Devices, breakpoints, edge cases and real-world conditions before anyone else sees it." },
  { id: "05", name: "Launch", body: "Deployed, instrumented and handed over with the documentation to run it." },
  { id: "06", name: "Evolve", body: "Measured, maintained and extended — because launch is a milestone, not a finish line." },
];

export default function Process() {
  const root = useRef(null);
  const fill = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);
      const steps = q(".ts-step");

      // the red line fills as the section passes
      gsap.fromTo(
        fill.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          transformOrigin: "top center",
          scrollTrigger: {
            trigger: root.current,
            start: "top 60%",
            end: "bottom 85%",
            scrub: 0.6,
          },
        },
      );

      // each marker lights when the fill reaches it
      const triggers = steps.map((step) =>
        ScrollTrigger.create({
          trigger: step,
          start: "top 62%",
          end: "bottom 20%",
          toggleClass: { targets: step, className: "is-live" },
        }),
      );

      gsap.fromTo(
        q("[data-step-body]"),
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.06,
          scrollTrigger: { trigger: root.current, start: "top 70%" },
        },
      );

      return () => triggers.forEach((t) => t.kill());
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="paper"
      aria-label="How we work"
      className="relative bg-white ts-act"
    >
      <div className="ts-shell">
        <div className="ts-grid items-end border-b border-hair pb-12">
          <div className="col-span-12 lg:col-span-7">
            <SystemLabel className="mb-8">
              PROCESS / 01—06
            </SystemLabel>
            <MaskText
              as="h2"
              lines={["How the", "work moves."]}
              className="ts-display-tight text-[clamp(2.6rem,8.6vw,7rem)] text-ink"
            />
          </div>
          <div className="col-span-12 mt-8 lg:col-span-5 lg:mt-0 lg:pl-8">
            <p className="ts-body max-w-sm text-[0.98rem] text-ash">
              Six stages, run in the open. You always know which one we're in and what
              comes out of it.
            </p>
          </div>
        </div>

        {/* ── the timeline ──────────────────────────────────────────── */}
        <ol className="relative mt-10 pl-10 sm:pl-16">
          {/* track + red fill */}
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[3px] w-px bg-hair sm:left-[7px]"
          />
          <span
            ref={fill}
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[3px] w-px origin-top bg-signal sm:left-[7px]"
            style={{ transform: "scaleY(0)" }}
          />

          {STEPS.map((step) => (
            <li key={step.id} className="ts-step relative pb-12 last:pb-0 sm:pb-16">
              <span
                data-step-dot
                aria-hidden="true"
                className="absolute top-2.5 left-[-2.375rem] size-[7px] sm:left-[-3.75rem] sm:size-[9px]"
              />

              <div data-step-body className="border-t border-hair pt-5">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                  <span data-step-num className="ts-label text-ash-dim tabular-nums">
                    {step.id}
                  </span>
                  <h3
                    data-step-title
                    className="ts-display-tight text-[clamp(2rem,6.5vw,4.5rem)] text-ink"
                  >
                    {step.name}
                  </h3>
                </div>
                <p className="ts-body mt-4 max-w-xl text-[0.98rem] text-ash sm:pl-14">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
