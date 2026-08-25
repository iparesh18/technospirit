import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import MaskText from "@/components/ui/MaskText";
import Magnet from "@/components/motion/Magnet";

/**
 * The one full-bleed red moment on the site. Black type on signal red
 * (5.6:1) — the highest-contrast, highest-energy frame, spent exactly once,
 * on the only action that matters.
 */
export default function FinalCta() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // the red ground wipes up over the previous section
      gsap.fromTo(
        root.current,
        { clipPath: "inset(18% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 92%",
            end: "top 45%",
            scrub: 0.7,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-label="Start a project"
      // The one full-bleed red frame on the site. It declares "ink" not
      // because it is black but because that is what the fixed header should
      // become over it: a hard black bar on red, rather than the translucent
      // white one that the paper default produced (which washed out to pink).
      // Nothing inside this section reads the zone tokens — every colour here
      // is stated explicitly — so the attribute only steers the header.
      data-zone="ink"
      className="relative overflow-hidden bg-signal text-black"
    >
      <div className="ts-shell ts-act">
        <div className="flex items-center justify-between gap-6 border-b-2 border-black pb-5">
          <span className="ts-label text-black/70">READY WHEN YOU ARE</span>
          <span className="ts-label text-black/70">/ 09</span>
        </div>

        <MaskText
          as="h2"
          lines={["Start", "something", "that scales."]}
          className="ts-display-tight mt-9 text-[clamp(3rem,13vw,12rem)] text-black"
        />

        <div className="mt-10 flex flex-col gap-8 border-t-2 border-black pt-8 lg:flex-row lg:items-end lg:justify-between">
          <p className="ts-body max-w-md text-lg text-black/80 sm:text-xl">
            Tell us the problem in plain language. We'll come back with the system that
            solves it, what it takes, and how long it runs.
          </p>

          <Magnet padding={110} strength={3.4} className="self-start">
          <Link
            to="/contact"
            data-cursor="start"
            className="group/final flex items-center gap-8 self-start border-2 border-black bg-black px-8 py-6 text-white transition-colors duration-500 hover:bg-transparent hover:text-black sm:px-12 sm:py-8"
          >
            <span className="ts-display-wide text-[clamp(1.1rem,2.6vw,1.9rem)]">
              START A PROJECT
            </span>
            <ArrowUpRight
              className="size-7 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/final:translate-x-1.5 group-hover/final:-translate-y-1.5 sm:size-9"
              strokeWidth={1.5}
            />
          </Link>
          </Magnet>
        </div>
      </div>
    </section>
  );
}
