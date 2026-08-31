import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { SystemLabel } from "@/components/ui/SystemLabel";

const REASONS = [
  {
    id: "01",
    title: "Custom solutions",
    body: "Nothing here is a theme with the colours changed. The system gets shaped to how the business actually operates — which is usually the reason off-the-shelf stopped working.",
  },
  {
    id: "02",
    title: "Modern engineering",
    body: "Current tooling, current standards, and code written to be read by whoever inherits it. No stack chosen because it was familiar five years ago.",
  },
  {
    id: "03",
    title: "Exceptional UI/UX",
    body: "Interface quality treated as product quality. Hierarchy, legibility and flow decided deliberately, then tested against people who weren't in the room.",
  },
  {
    id: "04",
    title: "AI-first development",
    body: "Automation considered at design time, not retrofitted. That's the difference between AI that removes work and AI that adds a dashboard nobody opens.",
  },
  {
    id: "05",
    title: "Performance",
    body: "Measured, budgeted and defended. Fast is a feature that every other feature depends on.",
  },
  {
    id: "06",
    title: "Scalability",
    body: "Architected for the traffic and the team you're heading toward, so growth is a configuration change rather than a rebuild.",
  },
  {
    id: "07",
    title: "Security awareness",
    body: "Dependencies, access, data handling and update discipline treated as ongoing responsibilities rather than a launch-day checklist.",
  },
  {
    id: "08",
    title: "SEO awareness",
    body: "Semantics, structure, performance and crawlability built in from the first commit — not added by a separate team afterwards.",
  },
  {
    id: "09",
    title: "Responsive communication",
    body: "You know what stage the work is in, what's blocked, and what's next. Silence is not part of the process.",
  },
  {
    id: "10",
    title: "Global-ready workflow",
    body: "Async by default, documented as we go, and built to work across time zones without waiting for one shared working day.",
  },
  {
    id: "11",
    title: "Long-term support",
    body: "We stay responsible for what we build. Maintenance, iteration and the second year are part of the conversation from the start.",
  },
];

/* — scroll ————————————————————————————————————————————————————————————— */
/** Viewport heights of scroll spent on each reason while the stage is pinned.
 *  0.24 puts a row at roughly 230px of travel on a laptop: brisk enough that
 *  the pin never feels like waiting, slow enough that the width axis has room
 *  to open. The whole case is on screen the entire time, so unlike a
 *  horizontal act nothing is being withheld while the user scrolls. */
const ROW_SCROLL = 0.24;
/** A beat at the end so the last reason holds instead of being released the
 *  instant it lights. */
const TAIL = 0.35;

/* — pointer ———————————————————————————————————————————————————————————— */
/** Radius of the ink lens, in px. MUST match --lens-r in index.css: the JS
 *  side uses it to cull rows, the CSS side to size the gradient, and if they
 *  drift a row can be culled while still visibly lit. Sized against the TYPE
 *  rather than the column: a title runs ~250px, so 120 reads as a lens moving
 *  over the letters. At 190 it covered a whole title and read as the line
 *  changing colour, which is the effect this is meant to avoid. */
const LENS_RADIUS = 120;
/** Fraction of the remaining distance the smoothed pointer closes per frame.
 *  Stiff on purpose — a lens this small reads as sliding off the cursor if it
 *  lags, which is the failure the footer wordmark hit at 0.12. */
const POINTER_LERP = 0.3;
/** Peak px a row leans toward the pointer. Squared falloff, so it is already
 *  ~0 at the cull radius and a culled row never visibly snaps back. */
const LEAN = 9;

/**
 * THE LEDGER — the second act of /why-us.
 *
 * Eleven reasons, presented as one instrument rather than eleven cards. Two
 * independent readings run over the same eleven lines:
 *
 *   SCROLL  pins the stage and walks a red reading rule down the stack. The
 *           line the rule lands on opens — the Archivo wdth axis widens
 *           70% -> 116%, the type inks from ghost to solid, its numeral goes
 *           red and its record fades into the right column. The rule and the
 *           progress bar are scrubbed continuously; the row STATE flips
 *           discretely as the rule crosses a boundary, so the section reads as
 *           an instrument locking on rather than a slideshow cross-fading.
 *
 *   POINTER paints a red lens inside the letterforms — see the CSS block in
 *           index.css for how (background-clip: text over a radial gradient).
 *           Any of the eleven lines responds, not just the live one, so the
 *           whole case stays explorable independently of where the scroll is.
 *
 * ARCHITECTURE NOTES, all of them load-bearing:
 *
 *  - There is exactly one frame loop on this site (GSAP's ticker, which also
 *    drives Lenis). The pointer loop registers itself on that ticker on the
 *    first real pointermove and parks itself again the moment the pointer has
 *    settled with nothing lit, so an untouched ledger costs zero frames.
 *
 *  - Per-frame work is deliberately tiny. Scrolling writes three transforms
 *    and one textContent compare. Pointing writes two custom properties and
 *    one transform on the two or three rows inside the lens radius — every
 *    other row is culled by distance before it is touched at all. Everything
 *    else (ink, width axis, record, ruling) is a CSS transition fired by a
 *    class toggle that happens eleven times across the whole pin.
 *
 *  - Row rects are cached and re-measured only when something can have moved:
 *    a ScrollTrigger refresh, a resize, or the pin engaging. While pinned the
 *    stage is fixed, so the rects are stable and re-reading them per frame
 *    would be pure layout thrash.
 *
 *  - Capability is inferred from real events, never from a media query. See
 *    SignalField.jsx: `(pointer: fine)` reports on the PRIMARY pointer and a
 *    Windows laptop with a touchscreen answers false with a mouse plugged in,
 *    which silently kills effects like this one. Touch pointers are ignored by
 *    pointerType instead.
 */
export default function Reasons() {
  const root = useRef(null);
  const area = useRef(null);
  const list = useRef(null);
  const rule = useRef(null);
  const bar = useRef(null);
  const counter = useRef(null);
  const ghostWrap = useRef(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const rows = q("[data-ledger-row]");
      const titles = q("[data-ledger-title]");
      const ghosts = q("[data-ledger-ghost]");
      const lines = q("[data-ledger-line]");
      if (!rows.length) return undefined;

      /* ── entrance ─────────────────────────────────────────────────────
         Reuses the house mask grammar. Both halves of the Y offset are
         stated — yPercent AND y — for the reason documented at length in
         MaskText.jsx: the resting state comes from CSS as a resolved matrix,
         so GSAP reads it back as pixels and animating yPercent alone would
         leave the line parked a full row below its own mask. */
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          lines,
          { yPercent: 106, y: 0 },
          {
            yPercent: 0,
            y: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.04,
            scrollTrigger: { trigger: root.current, start: "top 76%" },
          },
        );
      }

      let active = -1;
      const setActive = (i) => {
        if (i === active) return;
        active = i;
        for (let j = 0; j < rows.length; j += 1) {
          const d = Math.abs(j - i);
          rows[j].classList.toggle("is-live", d === 0);
          rows[j].classList.toggle("is-near", d === 1);
        }
        for (let j = 0; j < ghosts.length; j += 1) {
          ghosts[j].classList.toggle("is-live", j === i);
        }
        if (counter.current) {
          counter.current.textContent = String(i + 1).padStart(2, "0");
        }
      };

      const resetRows = () => {
        active = -1;
        rows.forEach((row) => row.classList.remove("is-live", "is-near"));
        ghosts.forEach((g) => g.classList.remove("is-live"));
        titles.forEach((t) => {
          t.style.removeProperty("--lx");
          t.style.removeProperty("--ly");
          t.style.removeProperty("transform");
        });
      };

      // gsap.matchMedia owns the breakpoint teardown/rebuild; useGSAP's own
      // context reverts the whole thing on unmount.
      const mm = gsap.matchMedia();

      mm.add(
        {
          stage: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
          compact: "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
        },
        (self) => {
          /* ══ DESKTOP: pinned stage ═════════════════════════════════════ */
          if (self.conditions.stage) {
            const n = rows.length;
            const walkSpan = ROW_SCROLL * n;
            const total = walkSpan + TAIL;
            const walkFraction = walkSpan / total;

            let trackH = 0;
            const measureTrack = () => {
              trackH = list.current ? list.current.offsetHeight : 0;
            };
            measureTrack();

            /* — the ink lens ——————————————————————————————————————— */
            const rects = new Array(titles.length);
            const lit = new Array(titles.length).fill(false);
            const P = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
            let dirty = true;
            let inView = false;
            let livePointer = false;
            let running = false;

            const clearRow = (i) => {
              const el = titles[i];
              el.style.removeProperty("--lx");
              el.style.removeProperty("--ly");
              el.style.removeProperty("transform");
              lit[i] = false;
            };
            const hardClear = () => {
              for (let i = 0; i < titles.length; i += 1) if (lit[i]) clearRow(i);
            };

            const park = () => {
              if (!running) return;
              gsap.ticker.remove(tick);
              running = false;
            };
            const run = () => {
              if (running || !livePointer || !inView) return;
              gsap.ticker.add(tick);
              running = true;
            };

            function tick() {
              if (!inView) {
                park();
                return;
              }
              if (dirty) {
                for (let i = 0; i < titles.length; i += 1) {
                  rects[i] = titles[i].getBoundingClientRect();
                }
                dirty = false;
              }

              P.x += (P.tx - P.x) * POINTER_LERP;
              P.y += (P.ty - P.y) * POINTER_LERP;
              const settled =
                Math.abs(P.tx - P.x) < 0.5 && Math.abs(P.ty - P.y) < 0.5;

              let anyLit = false;
              for (let i = 0; i < titles.length; i += 1) {
                const r = rects[i];
                if (!r) continue;

                // distance from the pointer to this line's box — zero inside it
                const dx =
                  P.x < r.left ? r.left - P.x : P.x > r.right ? P.x - r.right : 0;
                const dy =
                  P.y < r.top ? r.top - P.y : P.y > r.bottom ? P.y - r.bottom : 0;
                const dist = dx === 0 ? dy : dy === 0 ? dx : Math.hypot(dx, dy);

                if (dist >= LENS_RADIUS) {
                  if (lit[i]) clearRow(i);
                  continue;
                }

                const k = 1 - dist / LENS_RADIUS;
                const lean = LEAN * k * k;
                const el = titles[i];
                // --lx is compensated by the lean: the rect was measured before
                // the transform, so without this the lens sits `lean` px behind
                // the cursor on exactly the row that is leaning the most.
                el.style.setProperty("--lx", `${(P.x - r.left - lean).toFixed(1)}px`);
                el.style.setProperty("--ly", `${(P.y - r.top).toFixed(1)}px`);
                el.style.transform = `translate3d(${lean.toFixed(2)}px,0,0)`;
                lit[i] = true;
                anyLit = true;
              }

              if (settled && !anyLit) park();
            }

            const onMove = (e) => {
              // A finger dragging over the stage is not a hover: it would light
              // a line and leave it stranded when the contact ends.
              if (e.pointerType === "touch") return;
              const first = P.tx < -1000;
              P.tx = e.clientX;
              P.ty = e.clientY;
              // Snap on the first reading rather than easing in from the
              // off-screen sentinel, which would drag the lens across every
              // line above the cursor before settling.
              if (first) {
                P.x = P.tx;
                P.y = P.ty;
              }
              livePointer = true;
              run();
            };

            // Snap, don't ease, on leave — for the same reason. One more tick
            // clears whatever was lit and then parks the loop.
            const onLeave = () => {
              P.x = -9999;
              P.tx = -9999;
              P.y = -9999;
              P.ty = -9999;
              run();
            };

            const host = area.current;
            host.addEventListener("pointermove", onMove, { passive: true });
            host.addEventListener("pointerleave", onLeave);

            /* — the scroll instrument ——————————————————————————————— */
            ScrollTrigger.create({
              trigger: root.current,
              start: "top top",
              end: () => `+=${Math.round(window.innerHeight * total)}`,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onRefresh: () => {
                measureTrack();
                dirty = true;
              },
              onToggle: (st) => {
                inView = st.isActive;
                dirty = true;
                if (inView) run();
                else {
                  hardClear();
                  park();
                }
              },
              onUpdate: (st) => {
                const p = st.progress;
                const walk = Math.min(1, p / walkFraction);

                if (rule.current) {
                  rule.current.style.transform = `translate3d(0,${(walk * trackH).toFixed(1)}px,0)`;
                }
                if (bar.current) {
                  // inline transform, not a scale-* utility: Tailwind v4's
                  // scale utilities write the standalone `scale` property and
                  // would multiply this bar straight back to zero.
                  bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
                }
                if (ghostWrap.current) {
                  ghostWrap.current.style.transform = `translate3d(0,${((0.5 - p) * 44).toFixed(1)}px,0)`;
                }
                setActive(Math.min(n - 1, Math.floor(walk * n)));
              },
            });

            const onGlobalRefresh = () => {
              dirty = true;
            };
            ScrollTrigger.addEventListener("refresh", onGlobalRefresh);

            const ro = new ResizeObserver(() => {
              measureTrack();
              dirty = true;
            });
            ro.observe(area.current);

            return () => {
              host.removeEventListener("pointermove", onMove);
              host.removeEventListener("pointerleave", onLeave);
              ScrollTrigger.removeEventListener("refresh", onGlobalRefresh);
              ro.disconnect();
              park();
              resetRows();
              if (rule.current) rule.current.style.removeProperty("transform");
              if (bar.current) bar.current.style.transform = "scaleX(0)";
              if (ghostWrap.current) ghostWrap.current.style.removeProperty("transform");
            };
          }

          /* ══ COMPACT: the same ledger, read by scrolling ═══════════════ */
          if (self.conditions.compact) {
            // One trigger per row, doing both jobs. ScrollTrigger only fires
            // onUpdate while a trigger is active, so at most one or two rows
            // are writing on any given frame.
            rows.forEach((row, i) => {
              const title = titles[i];
              ScrollTrigger.create({
                trigger: row,
                start: "top 62%",
                end: "top 34%",
                onToggle: (st) => {
                  row.classList.toggle("is-live", st.isActive);
                  if (!st.isActive) {
                    title.style.removeProperty("--lx");
                    title.style.removeProperty("--ly");
                  }
                },
                onUpdate: (st) => {
                  // The lens becomes a scroll instrument: the red hot-spot
                  // sweeps across the title as the row crosses the reading
                  // band. -9% to 109% so it enters and leaves cleanly.
                  title.style.setProperty(
                    "--lx",
                    `${(st.progress * 118 - 9).toFixed(1)}%`,
                  );
                  title.style.setProperty("--ly", "50%");
                },
              });
            });

            return () => resetRows();
          }

          return undefined;
        },
      );

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="paper"
      aria-label="Why TechnoSpirit"
      className="ts-ledger-section relative overflow-hidden bg-white ts-act"
    >
      {/* Every class below describes the FLOWING ledger — the layout that
          small screens and prefers-reduced-motion get. The pinned stage is
          not expressed here at all; it lives in one media query in index.css
          that gates on width AND motion together. Splitting it (a `lg:` class
          for the layout, a media query for the styling) is what let a
          reduced-motion desktop render squeeze full rows into 57px boxes. */}
      <div className="ts-ledger-stage ts-shell relative flex flex-col">
        {/* ── header rail ──────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-6 border-b border-hair pb-5">
          <SystemLabel>THE CASE / 01—11</SystemLabel>
          <SystemLabel className="hidden sm:inline-flex">VERIFIABLE</SystemLabel>
        </div>

        {/* ── the ledger ───────────────────────────────────────────── */}
        <div
          ref={area}
          data-cursor="explore"
          className="ts-ledger ts-ledger-area relative mt-6"
        >
          {/* the reading rule — scrubbed straight from scroll progress */}
          <div
            ref={rule}
            aria-hidden="true"
            className="ts-ledger-instrument pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-signal/40 will-change-transform"
          >
            {/* the marker rides the record end of the rule, not the ledger
                end — at the ledger end it lands on top of the live row's
                numeral, and it reads better as the tie between the line and
                its record anyway */}
            <span className="absolute -top-[3px] right-0 block size-[7px] bg-signal" />
          </div>

          {/* the record column — the live reason's numeral, held behind its
              copy. The paragraphs themselves live in their own <li>. */}
          <div
            ref={ghostWrap}
            aria-hidden="true"
            className="ts-ledger-instrument pointer-events-none absolute top-[6%] right-0 h-[24vh] w-[30%] select-none will-change-transform"
          >
            {REASONS.map((r) => (
              <span
                key={r.id}
                data-ledger-ghost
                className="ts-ledger-ghost ts-display-tight absolute inset-0 text-[22vh] leading-none text-black/[0.07] tabular-nums"
              >
                {r.id}
              </span>
            ))}
          </div>

          {/* Deliberately NOT position:relative. The record paragraphs live
              inside their own <li> for reading order but resolve to a slot in
              the right column, and their containing block has to be the whole
              ledger area — if the <ol> were positioned they would land inside
              its 66% and strike through the lines. */}
          <ol ref={list} className="ts-ledger-list flex flex-col">
            {REASONS.map((r) => (
              <li
                key={r.id}
                data-ledger-row
                className="ts-ledger-row py-4"
              >
                <div className="ts-ledger-linebox relative border-b border-hair pb-3">
                  <div className="ts-ledger-mask">
                    <div
                      data-ledger-line
                      className="flex items-baseline gap-4 sm:gap-6"
                    >
                      <h3
                        data-ledger-title
                        className="ts-ledger-title ts-display-tight"
                      >
                        {r.title}
                      </h3>
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="ts-ledger-tick absolute -bottom-px left-0 h-px w-full bg-signal"
                  />
                </div>

                <p className="ts-body ts-ledger-body text-[0.95rem] text-ash sm:text-base">
                  {r.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* ── progress rail ────────────────────────────────────────── */}
        <div className="ts-ledger-instrument mt-8">
          <div className="flex items-center gap-6 border-t border-hair pt-4">
            <span className="ts-label text-signal tabular-nums">
              <span ref={counter}>01</span>
              <span className="text-ash-dim"> / 11</span>
            </span>
            <div className="h-[2px] flex-1 bg-hair" aria-hidden="true">
              <div
                ref={bar}
                className="h-full w-full origin-left bg-signal will-change-transform"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <span className="ts-label text-ash-dim">SCROLL TO ADVANCE</span>
          </div>
        </div>
      </div>
    </section>
  );
}
