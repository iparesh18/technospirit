import { useEffect, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * Whether the launcher is sitting on a RED surface — "red" or "normal".
 *
 * This is the whole question now. The circular text is TechnoSpirit red
 * everywhere: on white, on black, on grey, on any ordinary section. The one
 * place red-on-red would disappear is the site's single full-bleed red moment
 * (<FinalCta> on Home, `bg-signal`), and there — and only there — the text
 * turns white.
 *
 * WHAT CHANGED FROM THE PREVIOUS VERSION
 * This used to answer "is the ground dark or light" and drive both the orb and
 * the text. The orb is now an image and needs no colour, and the text is no
 * longer light/dark reactive at all, so the luminance test is gone. Same
 * mechanism, different question — the resolver is reused rather than replaced,
 * and there is still exactly one of them.
 *
 * WHY IT STILL HIT-TESTS RATHER THAN OBSERVING SECTION METADATA
 * An attribute on <FinalCta> would work, but it would also mean every future
 * red surface has to remember to carry it, and it would mean editing a section
 * this task is not meant to touch. Reading the paint answers the question for
 * any red surface, existing or added later, and changes nothing outside this
 * folder.
 *
 * `elementsFromPoint` is a DOM hit test, not pixel sampling — no canvas, no
 * readback. It rides ScrollTrigger's update, the clock the site already runs,
 * so there is no extra scroll listener and nothing happens while the page is
 * still. Elements with `pointer-events: none` are skipped for free, which
 * correctly ignores the grain layer, the cursor and the ring itself.
 */

/** Sample points across the launcher's centre disc. */
const POINTS = [
  [0, 0],
  [-18, 0],
  [18, 0],
  [0, -18],
  [0, 18],
];

/** Minimum scroll movement before re-testing. */
const MIN_DELTA = 4;

/** Floor between hit tests. The colour transition is 240ms, so anything faster
 *  than this cannot be seen. */
const THROTTLE_MS = 60;

/**
 * Is this colour one of the site's reds?
 *
 * Deliberately a hue test rather than an equality check against #ff2d16: the
 * red section can be composited over, and a strict match would miss it the
 * moment anything semi-transparent sat on top. The rule — clearly bright, and
 * clearly redder than it is green or blue — matches --color-signal (#ff2d16)
 * and --color-signal-ink (#d91a05) while rejecting white, black, every grey,
 * and the warm off-whites used around the site.
 */
function isRed(r, g, b) {
  return r > 110 && r - Math.max(g, b) > 60;
}

/** Parses a computed colour. Returns null for anything not rgb()/rgba(). */
function readColour(value) {
  const open = value.indexOf("(");
  if (open < 0) return null;
  const parts = value.slice(open + 1, value.indexOf(")")).split(",");
  if (parts.length < 3) return null;
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b, alpha: parts.length > 3 ? parseFloat(parts[3]) : 1 };
}

export default function useLauncherTheme(ref) {
  const [theme, setTheme] = useState("normal");

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let lastScroll = Number.NaN;
    let lastRun = 0;
    let current = null;

    /** True when the first opaque surface at this point is red. */
    const redAt = (x, y) => {
      const stack = document.elementsFromPoint(x, y);
      for (const node of stack) {
        if (node === el || el.contains(node) || node.closest?.(".ts-ai-panel-root")) continue;
        const colour = readColour(getComputedStyle(node).backgroundColor);
        // Anything mostly transparent is not the ground — keep going down.
        if (!colour || colour.alpha <= 0.5) continue;
        return isRed(colour.r, colour.g, colour.b);
      }
      return false;
    };

    const sample = (force = false) => {
      const now = performance.now();
      const y = window.scrollY;
      if (!force) {
        if (Math.abs(y - lastScroll) < MIN_DELTA) return;
        if (now - lastRun < THROTTLE_MS) return;
      }
      lastScroll = y;
      lastRun = now;

      const box = el.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;

      /**
       * A majority, not a single hit.
       *
       * The full-bleed red section covers the launcher completely, so when it
       * is behind us every point is red. Requiring most of them keeps a small
       * red detail — a signal rule, a hover fill, the cursor dot — from
       * flipping the text white as it passes under one sample point.
       */
      let red = 0;
      for (const [dx, dy] of POINTS) {
        if (redAt(cx + dx, cy + dy)) red += 1;
      }

      const next = red > POINTS.length / 2 ? "red" : "normal";
      if (next === current) return;
      current = next;
      // The only state write, and only when the answer changes.
      setTheme(next);
    };

    sample(true);

    // Ride the clock that is already running: ScrollTrigger.update fires only
    // on frames where the scroll position actually moved.
    const driver = ScrollTrigger.create({ start: 0, end: 99999, onUpdate: () => sample() });

    // Layout can move different paint under a launcher that never moved.
    const onRefresh = () => sample(true);
    ScrollTrigger.addEventListener("refresh", onRefresh);
    window.addEventListener("resize", onRefresh);

    return () => {
      driver.kill();
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      window.removeEventListener("resize", onRefresh);
    };
  }, [ref]);

  return theme;
}
