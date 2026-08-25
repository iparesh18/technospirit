import { useEffect, useRef } from "react";
import { ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import FieldLines from "@/components/motion/FieldLines";
import { ActionLink } from "@/components/ui/ActionLink";
import { SystemLabel } from "@/components/ui/SystemLabel";

/**
 * The last section repeats the monolith's own gesture at page scale: two paper
 * faces part from a centre seam, and the machine is behind them.
 *
 * It sticks, for the same reason the cinematic does. Driven off a plain
 * entering trigger the doors were already three-quarters open by the time the
 * section filled the viewport, so the closed state — which is the entire
 * setup for the joke — was never actually seen. A sticky stage guarantees the
 * reader gets the shut face first, at full size, and then opens it.
 *
 * The parting is driven by scroll rather than by a drag handle, deliberately.
 * A drag would need a pointer, a touch alternative, a keyboard alternative and
 * a reduced-motion alternative before it was usable by everyone; scroll is
 * already all four. What the pointer does here instead is make the thing
 * behind the doors notice you — the hairline field turns to face it — so the
 * interaction is "the machine is alive", not "operate this widget".
 */

/** Share of the sticky travel the doors take to open. The rest is dwell. */
const OPEN_OVER = 0.62;

export default function LabSeam() {
  const root = useRef(null);
  const stage = useRef(null);

  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage.current;
    if (!rootEl || !stageEl) return undefined;

    // Reduced motion opens the doors and leaves them open: what is behind them
    // is the content of the section, and it is not going to be gated behind an
    // animation somebody has asked not to see.
    if (prefersReducedMotion()) {
      stageEl.style.setProperty("--open", "1");
      return undefined;
    }

    const st = ScrollTrigger.create({
      trigger: rootEl,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const open = Math.min(1, self.progress / OPEN_OVER);
        stageEl.style.setProperty("--open", open.toFixed(4));
      },
      invalidateOnRefresh: true,
    });

    return () => st.kill();
  }, []);

  return (
    <section
      ref={root}
      data-zone="ink"
      aria-label="What runs behind the interface"
      className="ts-seam bg-black text-white"
    >
      {/* --open lives here, not on the doors, because the machine behind
          them reads it too: its type holds until the faces are far enough
          apart to have somewhere to appear. Without that the closed face's
          word and the machine's headline occupied the same band and crossed
          straight through each other for the whole opening. */}
      <div ref={stage} className="ts-seam-stage" style={{ "--open": 0 }}>
        {/* ── behind the doors: the machine ─────────────────────────── */}
        <div className="ts-seam-machine">
          <FieldLines className="ts-seam-field" rows={8} columns={15} />

          <div className="ts-shell relative z-10 flex h-full flex-col justify-center">
            <div className="flex items-center justify-between gap-4 border-b border-white/16 pb-4">
              <SystemLabel className="text-white/55">
                <span className="mr-3 text-signal">●</span> BEHIND THE FACE
              </SystemLabel>
              <SystemLabel className="hidden text-white/35 sm:inline-flex">LAB / 02</SystemLabel>
            </div>

            <h2 className="ts-display-tight ts-seam-head mt-8 sm:mt-11">
              <span className="block">What runs</span>
              <span className="block text-signal">is the product.</span>
            </h2>

            <div className="ts-grid mt-9 sm:mt-12">
              <p className="ts-body col-span-12 text-base text-white/70 md:col-span-7 lg:col-span-5 lg:text-lg">
                Websites, AI systems, automation and growth are not four
                services bolted together. They are one machine with four
                faces, and the only question worth asking is which one you
                happen to be standing in front of.
              </p>

              <div className="col-span-12 mt-8 md:col-span-5 md:mt-0 lg:col-span-4 lg:col-start-9">
                <ActionLink to="/contact" tone="outline" className="w-full">
                  OPEN A PROJECT
                </ActionLink>
              </div>
            </div>
          </div>
        </div>

        {/* ── the faces, parting from the centre ────────────────────── */}
        <div className="ts-seam-doors" aria-hidden="true">
          {/* The same full-bleed line sits in both halves at the same place, so
              what parts is one continuous word being cut down the middle
              rather than two labels sliding away from each other. */}
          {["l", "r"].map((side) => (
            <div key={side} data-side={side} data-zone="paper" className="ts-seam-door">
              <span className="ts-seam-face">
                <span className="ts-display-tight ts-seam-word">What you see</span>
              </span>
            </div>
          ))}
          <span data-edge="l" className="ts-seam-edge" />
          <span data-edge="r" className="ts-seam-edge" />
        </div>
      </div>
    </section>
  );
}
