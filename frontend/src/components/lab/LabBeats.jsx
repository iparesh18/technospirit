import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useLabProgress } from "./labProgress";

/**
 * The statements, and the exact stretch of footage each one owns.
 *
 * The copy narrates what is literally on screen rather than describing the
 * company — a sealed object, a line of light, the thing opening, the core
 * lighting, the core staying lit. Every line is under five words, because a
 * paragraph read at scroll speed over moving picture is a paragraph nobody
 * reads. The mono line under each one is where the meaning is stated plainly.
 *
 * The gap at 0.50-0.70 is deliberate and belongs to <LabRead>: that is
 * where the camera orbits the opened machine, and a statement there would be
 * competing with the one interactive moment in the sequence.
 */
const BEATS = [
  {
    id: "01",
    from: 0.0,
    to: 0.15,
    meta: "MONOLITH / SEALED",
    lines: ["A closed", "system."],
    note: "Most work arrives like this. Finished on the outside.",
  },
  {
    id: "02",
    from: 0.15,
    to: 0.33,
    meta: "THE DECISION",
    lines: ["One line", "of light."],
    note: "Someone decides it should do more than sit there.",
  },
  {
    id: "03",
    from: 0.33,
    to: 0.5,
    meta: "ARCHITECTURE BEFORE INTERFACE",
    lines: ["Then it", "opens."],
    note: "What it is made of stops being yours to guess at.",
  },
  {
    id: "05",
    from: 0.7,
    to: 0.88,
    meta: "INTELLIGENCE / LIVE",
    lines: ["The core."],
    note: "Automation is not bolted on at the end. It is the middle.",
  },
  {
    id: "06",
    from: 0.88,
    to: 1.01,
    meta: "NOTHING TO RESTART",
    lines: ["And it", "stays lit."],
    note: "It keeps running after everyone has gone home.",
  },
];

/** Which beat owns a given point in the footage, or -1 for the orbit window. */
function beatAt(v) {
  for (let i = 0; i < BEATS.length; i += 1) {
    if (v >= BEATS[i].from && v < BEATS[i].to) return i;
  }
  return -1;
}

export default function LabBeats() {
  const cells = useRef([]);
  const active = useRef(-2);
  /** Set once by the effect below; called by the progress subscription. */
  const play = useRef(null);

  useEffect(() => {
    const els = cells.current.filter(Boolean);
    if (!els.length) return undefined;

    // Reduced motion: every statement is already in the DOM and legible, so
    // the only thing to do is stop hiding four of them. The sequence becomes
    // a readable stack of statements beside a still frame.
    if (prefersReducedMotion()) {
      for (const el of els) el.setAttribute("data-state", "static");
      return undefined;
    }

    const timelines = new Map();

    // The timelines are rebuilt here, so the record of which beat is playing
    // has to be reset with them. It is a ref, so it survives a remount that
    // this effect's cleanup has just wiped the timelines out of — and React
    // remounts every effect once in development. Leaving it alone meant the
    // subscription's first call saw "already on beat 0", returned early, and
    // beat 0 sat at its start pose forever: masked, tracked open, never shown.
    active.current = -2;

    /**
     * Entry and exit are the monolith's own gesture applied to type: the line
     * opens outward from a centre seam while it rises out of its mask, and
     * closes back to that seam on the way out.
     *
     * The clip is tweened as a NUMBER and the string is composed in onUpdate.
     * Tweening `clip-path` itself is the bug that made the cursor capsule
     * pulse — the browser reports the computed value in its shortest form and
     * GSAP pairs a complex string's numbers positionally, so the start and
     * the end rarely have the same shape.
     */
    play.current = (el, entering) => {
      timelines.get(el)?.kill();

      const lines = el.querySelectorAll("[data-beat-line]");
      const quiet = el.querySelectorAll("[data-beat-meta]");
      const rule = el.querySelectorAll("[data-beat-rule]");
      const seam = { p: entering ? 50 : 0 };

      const tl = gsap.timeline({
        onUpdate() {
          // Vertical overshoot keeps the inset off the cap height and the
          // descenders; only the horizontal pair is doing the work.
          const v = `inset(-14% ${seam.p}% -14% ${seam.p}%)`;
          for (const line of lines) line.style.clipPath = v;
        },
      });
      timelines.set(el, tl);

      if (entering) {
        el.setAttribute("data-state", "on");
        tl.to(seam, { p: 0, duration: 0.9, ease: "expo.out" }, 0)
          .fromTo(
            lines,
            { yPercent: 106 },
            { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.07 },
            0,
          )
          .fromTo(
            lines,
            // Tracking settles from open to the display cut, so the word
            // arrives rather than simply appearing. Cheap despite being a
            // layout property: the beat is absolutely positioned, so nothing
            // outside it is re-laid-out.
            { letterSpacing: "0.05em" },
            { letterSpacing: "-0.05em", duration: 1.1, ease: "expo.out", stagger: 0.07 },
            0,
          )
          .fromTo(
            rule,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: "expo.out", transformOrigin: "left center" },
            0.1,
          )
          .fromTo(
            quiet,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 },
            0.18,
          );
      } else {
        // Exit runs at roughly half the entry: leaving should never make the
        // reader wait out something they have already scrolled past.
        tl.to(seam, { p: 50, duration: 0.42, ease: "power3.in" }, 0)
          .to(lines, { yPercent: -64, duration: 0.46, ease: "power3.in", stagger: 0.03 }, 0)
          .to([...quiet, ...rule], { opacity: 0, duration: 0.24, ease: "power2.in" }, 0)
          .set(el, { attr: { "data-state": "off" } });
      }
    };

    return () => {
      play.current = null;
      for (const tl of timelines.values()) tl.kill();
      timelines.clear();
    };
  }, []);

  useLabProgress((state) => {
    if (!play.current) return;
    const next = beatAt(state.video);
    if (next === active.current) return;
    const prev = active.current;
    active.current = next;
    const els = cells.current;
    if (prev >= 0 && els[prev]) play.current(els[prev], false);
    if (next >= 0 && els[next]) play.current(els[next], true);
  });

  return (
    <div className="ts-lab-beats">
      {BEATS.map((beat, i) => (
        <article
          key={beat.id}
          ref={(el) => {
            cells.current[i] = el;
          }}
          data-state="off"
          className="ts-lab-beat"
        >
          <div className="ts-lab-beat-head">
            <span data-beat-meta className="ts-label text-signal">
              {beat.id}
            </span>
            <span data-beat-meta className="ts-label text-white/55">
              {beat.meta}
            </span>
          </div>
          <span data-beat-rule aria-hidden="true" className="ts-lab-beat-rule" />

          <p className="ts-lab-beat-lines">
            {beat.lines.map((line) => (
              <span key={line} className="ts-mask block">
                <span data-beat-line className="ts-lab-beat-line">
                  {line}
                </span>
              </span>
            ))}
          </p>

          <span data-beat-meta className="ts-lab-beat-note ts-body">
            {beat.note}
          </span>
        </article>
      ))}
    </div>
  );
}
