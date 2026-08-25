import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { ActionLink } from "@/components/ui/ActionLink";
import Marquee from "@/components/ui/Marquee";
import ProximityType from "@/components/motion/ProximityType";
import Magnet from "@/components/motion/Magnet";
import useWorldClock from "@/hooks/useWorldClock";

// `capsule` keys the cursor microcopy in <Cursor />; the words are the only
// capsule triggers on the site.
const HEADLINE = [
  { word: "Build.", capsule: "build" },
  { word: "Automate.", capsule: "automate" },
  { word: "Scale.", capsule: "scale" },
];

const MARQUEE_ITEMS = [
  "WEB DEVELOPMENT",
  "AI AUTOMATION",
  "VOICE AGENTS",
  "DIGITAL GROWTH",
  "CUSTOM SOFTWARE",
  "CHATBOTS",
  "META ADS",
];

export default function Hero() {
  const root = useRef(null);
  const clocks = useWorldClock();
  const ist = clocks.find((z) => z.code === "IND");

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);

      if (prefersReducedMotion()) {
        gsap.set(q("[data-hero]"), { opacity: 1, clearProps: "transform" });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // 1. the structure draws itself first
      tl.fromTo(
        q("[data-hero-rule]"),
        { scaleY: 0 },
        { scaleY: 1, duration: 1.1, stagger: 0.07, transformOrigin: "top center" },
      )
        // 2. metadata rails
        .fromTo(
          q("[data-hero-meta]"),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 },
          "-=0.75",
        )
        // 3. the statement prints, line by line
        .fromTo(
          q("[data-hero-word]"),
          { yPercent: 112 },
          { yPercent: 0, duration: 1.25, stagger: 0.09 },
          "-=0.6",
        )
        // 4. the red signal lands last
        .fromTo(
          q("[data-hero-signal]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.9, transformOrigin: "left center" },
          "-=0.8",
        )
        .fromTo(
          q("[data-hero-body]"),
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 },
          "-=0.7",
        )
        .fromTo(
          q("[data-hero-strip]"),
          { yPercent: 100 },
          { yPercent: 0, duration: 1 },
          "-=0.8",
        );

      // scroll parallax — the statement drifts up faster than the page
      gsap.to(q("[data-hero-type]"), {
        yPercent: -14,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
      gsap.to(q("[data-hero-aside]"), {
        yPercent: -40,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="paper"
      className="relative flex min-h-[86svh] flex-col justify-between overflow-hidden pt-[5.5rem] sm:pt-24 lg:min-h-[88svh]"
      aria-label="TechnoSpirit — introduction"
    >
      {/* ── structural rules: the "black = structure" layer ───────────── */}
      <div className="ts-rules [--rule-count:4] md:[--rule-count:6]" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-hero-rule
            className={`h-full origin-top border-r border-hair ${i > 3 ? "hidden md:block" : ""}`}
          />
        ))}
      </div>

      {/* ── top metadata rail ─────────────────────────────────────────── */}
      <div className="ts-shell relative z-10">
        <div className="flex items-center justify-between gap-4 border-b border-hair pb-4">
          <span data-hero-meta className="ts-label text-ash">
            TECHNOLOGY STUDIO
          </span>
          <span data-hero-meta className="ts-label hidden text-ash sm:inline">
            WEB · AI · GROWTH
          </span>
          <span data-hero-meta className="ts-label flex items-center gap-2 text-ash">
            <span className="hidden sm:inline">IND</span>
            <span className="font-mono tabular-nums text-ink">{ist?.time ?? "--:--"}</span>
          </span>
        </div>
      </div>

      {/* ── the statement ─────────────────────────────────────────────── */}
      <div className="ts-shell relative z-10 flex-1 py-7 sm:py-9">
        <div className="ts-grid h-full items-stretch">
          {/* @container + cqw: the statement is sized by its own column, so the
              longest word ("Automate.") fits exactly at every breakpoint. */}
          <h1
            data-hero-type
            className="@container col-span-12 self-center lg:col-span-9 xl:col-span-9"
            aria-label="Build. Automate. Scale. Without borders."
          >
            {HEADLINE.map((line) => (
              <span key={line.word} className="ts-mask block" aria-hidden="true">
                {/* w-fit shrinks the hit box to the glyphs, so the capsule is
                    armed by the word and not by the empty rest of the line.
                    Still a block, so no inline-block baseline gap appears. */}
                <span
                  data-hero-word
                  data-cursor-capsule={line.capsule}
                  className="ts-display-tight block w-fit text-[clamp(3.2rem,21cqw,15rem)] text-ink will-change-transform"
                >
                  {line.word}
                </span>
              </span>
            ))}

            {/* red signal line + the global claim */}
            <span className="mt-5 flex items-center gap-4 sm:mt-7 sm:gap-6" aria-hidden="true">
              <span
                data-hero-signal
                className="h-[3px] w-[18vw] max-w-40 shrink-0 origin-left bg-signal"
              />
              <ProximityType
                text="Without Borders."
                className="ts-display-wide text-[clamp(0.95rem,2.6vw,2rem)] text-signal"
                wdth={[100, 125]}
                wght={[700, 900]}
                radius={280}
              />
            </span>
          </h1>

          {/* offset aside — deliberately not a hero paragraph under the title */}
          <div
            data-hero-aside
            className="col-span-12 mt-9 flex flex-col lg:col-span-3 lg:mt-0 lg:pt-4 xl:pl-8"
          >
            {/* discipline index, pinned to the top of the column */}
            <div data-hero-body className="hidden lg:block">
              <ul className="border-t border-hair">
                {[
                  { id: "01", name: "Web" },
                  { id: "02", name: "AI" },
                  { id: "03", name: "Growth" },
                ].map((d) => (
                  <li
                    key={d.id}
                    className="flex items-baseline justify-between gap-4 border-b border-hair py-2.5"
                  >
                    <span className="ts-display-wide text-[0.95rem] text-ink">{d.name}</span>
                    <span className="ts-label text-signal tabular-nums">{d.id}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:mt-12">
            <div data-hero-body className="border-t-2 border-ink pt-4">
              <p className="ts-body max-w-sm text-[0.98rem] text-ash sm:text-base">
                TechnoSpirit engineers <span className="text-ink">websites</span>,{" "}
                <span className="text-ink">AI systems</span> and{" "}
                <span className="text-ink">growth infrastructure</span> for businesses,
                teams and markets that don't sit in one place.
              </p>
            </div>

            <div data-hero-body className="mt-6">
              <Magnet padding={70} strength={4} className="w-full sm:w-auto">
                <ActionLink to="/lab" className="w-full sm:w-auto">
                  BEYOND THE ORDINARY
                </ActionLink>
              </Magnet>
            </div>

            <div data-hero-body className="mt-6 flex items-center gap-3">
              <span className="ts-label text-ash">SCROLL</span>
              <span className="h-px w-10 bg-ink" aria-hidden="true" />
              <span className="ts-label text-ash">01 / 08</span>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── bottom strip ──────────────────────────────────────────────── */}
      <div className="relative z-10 overflow-hidden border-t border-ink">
        <div data-hero-strip className="bg-ink py-3.5 text-white" data-zone="ink">
          <Marquee
            items={MARQUEE_ITEMS}
            duration={44}
            className="text-white"
            itemClassName="ts-label text-[0.68rem] text-white/80"
          />
        </div>
      </div>
    </section>
  );
}
