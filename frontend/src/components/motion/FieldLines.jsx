import { useEffect, useMemo, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * A field of hairlines that all turn to face the pointer.
 *
 * Adapted from React Bits' `MagnetLines`. The idea is excellent for this brand
 * — a grid of 1px rules, no radius, no colour but the signal red — and the
 * implementation was the same three defects every other port here had:
 *
 * 1. `getBoundingClientRect()` PER LINE PER POINTERMOVE. Sixty-odd forced
 *    layout reads on every mouse event, which is exactly what `Magnet` was
 *    rewritten to remove. The grid is uniform, so every centre is arithmetic
 *    from one container rect: measured once, invalidated on resize and on
 *    ScrollTrigger refresh, never read during a move.
 * 2. A `window` pointermove listener that ran whether the field was on screen
 *    or not — `SignalField`'s bug. An IntersectionObserver now gates it.
 * 3. Writes went straight from the event. Pointer events can fire more than
 *    once per frame, so the work is deferred to `gsap.ticker` behind a dirty
 *    flag: at most one pass per frame, and none at all when nothing moved.
 *
 * Also: `80vmin` hard-coded square and global `.magnetLines-container` class
 * names, both replaced; and a coarse pointer or reduced motion now leaves the
 * field at its rest angle instead of listening for a pointer that will never
 * arrive.
 */
export default function FieldLines({ rows = 7, columns = 13, baseAngle = -22, className = "" }) {
  const host = useRef(null);
  const total = rows * columns;

  // Which cells carry the signal colour. Deterministic — a random scatter
  // would re-roll on every render and the field would twinkle.
  const hot = useMemo(() => {
    const set = new Set();
    for (let i = 3; i < total; i += 11) set.add(i);
    return set;
  }, [total]);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;

    const items = el.querySelectorAll("[data-field-line]");
    if (!items.length) return undefined;

    if (prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) {
      return undefined; // rest angle, set inline below, is the final state
    }

    /** Centres, in viewport coordinates. Recomputed only when the box moves. */
    let cx = [];
    let cy = [];
    const measure = () => {
      const box = el.getBoundingClientRect();
      const w = box.width / columns;
      const h = box.height / rows;
      cx = new Array(total);
      cy = new Array(total);
      for (let i = 0; i < total; i += 1) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        cx[i] = box.left + w * (col + 0.5);
        cy[i] = box.top + h * (row + 0.5);
      }
    };
    measure();

    let px = 0;
    let py = 0;
    let dirty = false;
    let visible = false;

    const onMove = (e) => {
      px = e.clientX;
      py = e.clientY;
      dirty = true;
    };

    const tick = () => {
      if (!dirty || !visible) return;
      dirty = false;
      for (let i = 0; i < total; i += 1) {
        const deg = (Math.atan2(py - cy[i], px - cx[i]) * 180) / Math.PI;
        items[i].style.transform = `rotate(${deg.toFixed(1)}deg)`;
      }
    };

    // The centres are viewport coordinates, so they are wrong the moment the
    // page scrolls. Cheaper to re-measure one rect per scroll frame than to
    // convert per line.
    const onScroll = () => {
      if (!visible) return;
      measure();
      dirty = true;
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          measure();
          dirty = true;
        }
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(el);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    ScrollTrigger.addEventListener("refresh", measure);
    gsap.ticker.add(tick);

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ScrollTrigger.removeEventListener("refresh", measure);
      gsap.ticker.remove(tick);
    };
  }, [rows, columns, total]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={`ts-linefield ${className}`.trim()}
      style={{ "--linefield-rows": rows, "--linefield-cols": columns }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="ts-linefield-cell">
          <span
            data-field-line
            data-hot={hot.has(i) ? "" : undefined}
            className="ts-linefield-line"
            style={{ transform: `rotate(${baseAngle}deg)` }}
          />
        </span>
      ))}
    </div>
  );
}
