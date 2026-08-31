import { useEffect, useRef } from "react";

import "./CircularText.css";

/**
 * CircularText — character-by-character circular typography.
 *
 * Installed from the React Bits registry
 * (`npx shadcn@latest add @react-bits/CircularText-JS-CSS`) and adapted, for
 * three reasons that are worth stating so nobody "restores" the original:
 *
 * 1. The registry version animates with `motion/react` (Framer Motion). That is
 *    a second animation library on a project standardised on GSAP, used by
 *    nothing else, and its rotation runs on the main thread via
 *    requestAnimationFrame — which is exactly the wrong place for a permanently
 *    spinning element on a site that already has ScrollTrigger competing for
 *    frames. Here the rotation is a CSS animation: it runs on the compositor
 *    and cannot drop a frame of anything else.
 *
 * 2. Hover speed. The registry maps "speedUp" to `spinDuration / 4` — four
 *    times faster, which on a support launcher reads as a fidget. Speed is
 *    changed here through the Web Animations API's `playbackRate`, ramped over
 *    a few hundred milliseconds, so the ring accelerates into the new speed
 *    instead of jumping to it. Changing `animation-duration` in CSS cannot do
 *    this: it re-times the animation from its current progress and visibly
 *    snaps.
 *
 * 3. Placement. The registry composes `rotateZ(...) translate3d(f*i, f*i, 0)`,
 *    where the translate is a per-index nudge rather than a radius — so letters
 *    drift outward as the string goes on and the spacing is not actually
 *    uniform. Each character here is placed at an explicit radius, so the ring
 *    is a true circle and `radius` is a real knob.
 *
 * What is kept from the registry version: the idea itself, the public API
 * (`text`, `spinDuration`, `onHover`, `className`) and the DOM shape — one span
 * per character, each with its own angular position and tangent orientation.
 *
 * No state, no re-render. Everything after mount is CSS plus one Animation
 * handle, so a spin never costs React a thing — which is what keeps the blob
 * beside it from re-rendering.
 */

/** How long the speed ramp takes. Long enough to read as acceleration rather
 *  than a switch, short enough to feel like a response to the pointer. */
const RAMP_MS = 320;

export default function CircularText({
  text,
  /** Seconds per revolution. */
  spinDuration = 20,
  /** Multiplier applied to the spin rate while the hover target is hovered. */
  onHover = 1.2,
  /** Distance from the centre to each character's baseline, in px. */
  radius = 40,
  /**
   * Element whose hover drives the speed change. The launcher passes its own
   * button, so hovering anywhere on it — blob included — accelerates the ring.
   * Binding to the ring itself would break the moment the pointer crossed onto
   * the blob, because the two are siblings and that fires `mouseleave`.
   */
  hoverTarget,
  className = "",
}) {
  const root = useRef(null);
  const animation = useRef(null);
  const raf = useRef(0);

  const letters = Array.from(text);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;

    /**
     * The CSS animation, as an object we can re-rate. Empty when the user has
     * asked for reduced motion, because the stylesheet removes the animation
     * entirely in that case — so this is also the reduced-motion guard.
     */
    animation.current = el.getAnimations().find((a) => a.playState !== "finished") ?? null;
    const anim = animation.current;
    if (!anim) return undefined;

    const target = hoverTarget?.current ?? el;

    /** Ease the rate toward a value instead of snapping to it. Bounded — it
     *  runs for RAMP_MS and stops, so there is no persistent rAF loop. */
    const rampTo = (to) => {
      cancelAnimationFrame(raf.current);
      const from = anim.playbackRate;
      if (Math.abs(to - from) < 0.001) return;

      const started = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - started) / RAMP_MS);
        // ease-out cubic: responds immediately, settles gently.
        const eased = 1 - (1 - p) ** 3;
        // Assigning playbackRate holds currentTime, so the ring changes speed
        // without changing position — no jump, whatever the ramp is doing.
        anim.playbackRate = from + (to - from) * eased;
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    };

    const enter = () => rampTo(onHover);
    const leave = () => rampTo(1);

    // Pointer events, not mouse: covers pen, and a touch tap does not leave the
    // ring stuck at the faster rate the way `mouseenter` on touch would.
    target.addEventListener("pointerenter", enter);
    target.addEventListener("pointerleave", leave);
    // A tap on touch fires pointerenter with no matching leave.
    target.addEventListener("pointercancel", leave);

    return () => {
      cancelAnimationFrame(raf.current);
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("pointercancel", leave);
      animation.current = null;
    };
  }, [onHover, hoverTarget]);

  const step = 360 / letters.length;
  const size = (radius + 10) * 2;

  return (
    <span
      ref={root}
      className={`circular-text ${className}`}
      style={{ "--ts-ct-duration": `${spinDuration}s`, width: size, height: size }}
      aria-hidden="true"
    >
      {letters.map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          style={{
            // Centre the character on the ring's centre, turn it to its own
            // angle, then push it out along the radius. Because the rotation
            // happens before the translate, the character keeps that rotation
            // — which is what makes its baseline tangent to the circle rather
            // than all letters staying upright.
            transform: `translate(-50%, -50%) rotate(${step * i}deg) translateY(-${radius}px)`,
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
