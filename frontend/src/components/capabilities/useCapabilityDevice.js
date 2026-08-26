import { useEffect, useState } from "react";

/**
 * Decides whether this device gets the full /capabilities experience or the
 * restricted screen.
 *
 * The answer is deliberately NOT a width test, and deliberately not a
 * user-agent test either. Width alone puts a phone in landscape (932 x 430 on
 * a Pro Max) within a hair of a small laptop, and the whole page is built
 * around a pointer that hovers — a gesture a phone does not have. So the gate
 * asks three independent questions and requires all three:
 *
 *   1. `(pointer: fine)` and `(hover: hover)` — is there a real mouse or
 *      trackpad? This is the load-bearing one. Every phone and every
 *      touch-only tablet fails it in both orientations, because it describes
 *      the input device rather than the screen. It is also the same test
 *      <Cursor> already uses to decide whether the follower exists at all,
 *      and this page's opening scene is built on that follower — without it
 *      there is literally nothing to reveal.
 *
 *   2. `min-width: 1024px` — the project's existing desktop threshold. The
 *      horizontal act, the /lab decode path and the cursor all draw the line
 *      here; drawing it somewhere else on this page would be a second,
 *      contradictory definition of "desktop".
 *
 *   3. The SHORT side of the viewport is at least 620px. This is the
 *      landscape-phone backstop: rotating a phone changes its width but not
 *      its height, and 430px of height cannot hold a pinned cinematic stage.
 *      It also rules out the short, wide window a browser gets when it is
 *      docked to half a laptop screen, which is the honest call — the hand
 *      composition needs vertical room to place a contact point.
 *
 * A large tablet driven by a trackpad passes all three, which is the intended
 * outcome: the brief allows it where the device can genuinely support the
 * experience, and "has a precise pointer that hovers" is a better proxy for
 * that than any device name. A bare tablet reports `pointer: coarse` and gets
 * the restricted screen.
 *
 * Returns `null` until the first check has run, so the caller can render
 * nothing rather than flashing the wrong branch — importantly, nothing means
 * the heavy chunk is not requested either.
 */

const QUERIES = ["(pointer: fine)", "(hover: hover)", "(min-width: 1024px)"];

/** Minimum short-edge, in CSS px. See reason 3 above. */
const MIN_SHORT_EDGE = 620;

function evaluate() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  if (!QUERIES.every((q) => window.matchMedia(q).matches)) return false;
  return Math.min(window.innerWidth, window.innerHeight) >= MIN_SHORT_EDGE;
}

export default function useCapabilityDevice() {
  const [capable, setCapable] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setCapable(false);
      return undefined;
    }

    const lists = QUERIES.map((q) => window.matchMedia(q));
    // Re-evaluated on a real change only. `resize` is included because the
    // short-edge rule is not expressible as a media query the way the other
    // three are — a window dragged between screens has to be caught somewhere.
    let queued = 0;
    const update = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => setCapable(evaluate()));
    };

    setCapable(evaluate());
    for (const l of lists) l.addEventListener("change", update);
    window.addEventListener("resize", update, { passive: true });

    return () => {
      cancelAnimationFrame(queued);
      for (const l of lists) l.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return capable;
}
