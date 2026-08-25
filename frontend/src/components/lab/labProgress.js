import { createContext, useContext, useEffect, useLayoutEffect, useRef } from "react";

/**
 * A one-value publish/subscribe store for the /lab sequence position.
 *
 * The pinned stage updates on every scroll frame. Putting that number in React
 * state would re-render the video host, the beats, the discipline list and the
 * HUD sixty times a second — the exact mistake `Magnet` and the horizontal
 * act's progress counter were both rewritten to remove.
 *
 * So the number never enters React. The stage writes it here, and every
 * consumer subscribes with a plain function that does imperative GSAP or
 * textContent work. React renders each of these components exactly once.
 *
 * Two values are published together because they are not the same thing:
 *   scroll — 0..1 through the pinned section
 *   video  — 0..1 through the footage, which is `scroll` put through the
 *            pacing curve in <ScrollVideoStage> (the sequence deliberately
 *            slows to a near-hold while the four systems are on screen)
 */
export function createProgressStore() {
  const state = { scroll: 0, video: 0 };
  const subs = new Set();

  return {
    get: () => state,
    set(scroll, video) {
      state.scroll = scroll;
      state.video = video;
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state); // arrive at the current position, not at zero
      return () => subs.delete(fn);
    },
  };
}

export const LabProgressContext = createContext(null);

/**
 * Subscribe to the sequence position for the lifetime of the component.
 *
 * The callback is held in a ref so a consumer can close over fresh values
 * without re-subscribing (and therefore without tearing down whatever GSAP
 * setters it built) on every render.
 */
export function useLabProgress(fn) {
  const store = useContext(LabProgressContext);
  const held = useRef(fn);
  // Assigned in a layout effect rather than during render: it runs
  // synchronously after commit and before paint, so no scroll frame can land
  // between the render that produced a new callback and this picking it up.
  useLayoutEffect(() => {
    held.current = fn;
  });

  useEffect(() => {
    if (!store) return undefined;
    return store.subscribe((state) => held.current(state));
  }, [store]);
}

export default LabProgressContext;
