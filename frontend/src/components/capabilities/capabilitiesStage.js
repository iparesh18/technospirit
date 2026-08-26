import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";

/**
 * The position of the reader inside /capabilities, published imperatively.
 *
 * Same reasoning as `labProgress.js`, and for the same reason: the two acts
 * update on every scroll frame, and there are nine consumers. Putting that
 * number in React state would re-render two videos, both hand plates, the
 * lens, the copy and the HUD sixty times a second.
 *
 * So the number never enters React. The two act triggers write here, and every
 * consumer subscribes with a plain function that does imperative GSAP,
 * transform or textContent work. React renders each of these components once.
 *
 * The one thing that IS React state is `stage` — the asset-loading step, which
 * changes five times over the whole page and has to move `src`/`preload`
 * attributes. Five renders is exactly what state is for; sixty a second is not.
 */
export function createStageStore() {
  const state = { act1: 0, act2: 0, stage: 0 };
  const subs = new Set();

  return {
    get: () => state,
    set(act, progress) {
      state[act] = progress;
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state); // arrive at the current position, never at zero
      return () => subs.delete(fn);
    },

    /**
     * Push the CURRENT position to everyone without it having changed.
     *
     * Needed because the scenes are gated: a beat that is not live returns
     * early from its progress callback. Flipping a beat live is a React state
     * change, and a state change is not a scroll event — so after a jump
     * (a hash link, a restored scroll position, a fast flick that lands and
     * stops) a scene could become live on a frame where nothing further was
     * published, and sit at whatever it last wrote. It showed up as the hands
     * beat arriving at full opacity zero.
     *
     * Republishing after every gate change means a beat always sees the real
     * position on the frame it wakes up, which is what makes the first
     * interaction identical to the tenth.
     */
    republish() {
      for (const fn of subs) fn(state);
    },
  };
}

export const StageContext = createContext(null);

export const useStage = () => useContext(StageContext);

/**
 * Subscribe to the page position for the lifetime of the component.
 *
 * The callback is held in a ref so a consumer can close over fresh values
 * without re-subscribing — and therefore without tearing down whatever GSAP
 * setters or element references it built — on every render.
 */
export function useStageProgress(fn) {
  const store = useContext(StageContext);
  const held = useRef(fn);

  // Layout effect, not render and not a passive effect: it runs synchronously
  // after commit and before paint, so no scroll frame can land between the
  // render that produced a new callback and this picking it up.
  useLayoutEffect(() => {
    held.current = fn;
  });

  useEffect(() => {
    if (!store) return undefined;
    return store.subscribe((state) => held.current(state));
  }, [store]);
}

/**
 * Maps a value from one range to another and clamps it — the single arithmetic
 * primitive every beat in this page is expressed in. A beat says "I own act 1
 * from 0.17 to 0.50", and everything inside it works in its own local 0..1.
 */
export function span(value, from, to) {
  if (to === from) return value >= to ? 1 : 0;
  const t = (value - from) / (to - from);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Standard smoothstep. Used where a beat should arrive and leave without a
    corner, but does not need a full GSAP tween to do it. */
export const ease = (t) => t * t * (3 - 2 * t);
