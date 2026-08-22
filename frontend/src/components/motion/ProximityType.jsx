import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Cursor-reactive variable typography.
 *
 * Origin: React Bits `TextPressure`, installed from the @react-bits shadcn
 * registry, inspected, then rebuilt for this project. What changed and why:
 *
 *  - It shipped an `@import url(fonts.googleapis.com/...Roboto Flex)` inside a
 *    <style> tag. This project self-hosts its fonts on purpose, so the import
 *    is gone and the axes are Archivo's real ones (wdth 62-125, wght 100-900).
 *    Archivo has no `ital` axis, so that channel was dropped rather than
 *    faked with a synthetic oblique.
 *  - It ran its own requestAnimationFrame loop. Everything here shares
 *    gsap.ticker with Lenis and ScrollTrigger — two RAF loops is exactly what
 *    causes the pin jitter this site was built to avoid.
 *  - It emitted global `.flex` and `.stroke` class names, which collide with
 *    Tailwind utilities. No global CSS now.
 *  - It hard-coded an <h1>. The tag is a prop, so it can't wreck the heading
 *    outline of whatever section it lands in.
 *  - It animated unconditionally. This one is inert under
 *    prefers-reduced-motion, ignores touch input, and parks itself when the
 *    cursor is nowhere near the element.
 *
 * INPUT DETECTION — do not reintroduce a `(pointer: fine)` media query here.
 * This component used to refuse to run unless `matchMedia("(pointer: fine)")`
 * matched. That query describes the *primary* pointer, and a Windows laptop
 * with a touchscreen reports it as `false` even while a mouse is plugged in
 * and in use — so the effect was silently dead on exactly the hardware it was
 * written for, with no error to show for it. Input capability is now inferred
 * from real events: the field wakes on the first `pointermove` that is not a
 * touch, which is true on a mouse or pen and never true on a phone.
 *
 * Per frame it reads every glyph rect *before* writing any style, so the reads
 * resolve against the previous frame's layout instead of forcing a sync reflow
 * mid-frame. Keep `text` short (a line, not a paragraph).
 */
/** Forgiveness around the line's own box before the field switches on, in px. */
const HOVER_PAD = 6;

export default function ProximityType({
  text = "",
  as: Tag = "span",
  className,
  charClassName,
  /** influence radius in px */
  radius = 380,
  /** [resting, peak] for Archivo's width axis (62..125) */
  wdth = [72, 122],
  /** [resting, peak] for the weight axis (100..900) */
  wght = [800, 900],
  /**
   * Pointer follow smoothing, 0..1 — the fraction of the remaining distance
   * closed each frame. Higher tracks the cursor harder. At the old default of
   * 0.12 the field needed roughly half a second to catch up, which reads as
   * lag rather than weight; 0.36 arrives within a few frames and still has
   * enough give that the letters swell instead of snapping.
   */
  lerp = 0.36,
}) {
  const rootRef = useRef(null);
  const charsRef = useRef([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const chars = charsRef.current.filter(Boolean);
    if (!chars.length) return undefined;

    const rest = `"wdth" ${wdth[0]}, "wght" ${wght[0]}`;
    const setRest = () => {
      chars.forEach((el) => {
        el.style.fontVariationSettings = rest;
      });
    };
    setRest();

    if (prefersReducedMotion()) return undefined;

    const pointer = { x: -99999, y: -99999 };
    const eased = { x: -99999, y: -99999 };
    let parked = true;
    let live = false;
    /** 0 = pointer is off the line, 1 = on it. Eased, so release is not a snap. */
    let gate = 0;

    const tick = () => {
      // Cheap gate: if the element is off-screen there is nothing to react to.
      const box = root.getBoundingClientRect();
      if (box.bottom < -radius || box.top > window.innerHeight + radius) return;

      /**
       * ACTIVATION IS HOVER, NOT PROXIMITY.
       *
       * `radius` shapes the falloff *between the glyphs of this line*; it must
       * not decide whether the line reacts at all. It used to: at radius 280
       * the field reached well past the element, so hovering "Scale." — which
       * sits directly above — swelled this line along with it, and the hero
       * appeared to have two hover targets stacked on one another.
       *
       * The pad is deliberately small. The gap between the headline and this
       * line is only a few dozen px, so anything generous here would put the
       * bottom of "Scale." back inside the field.
       */
      const over =
        pointer.x >= box.left - HOVER_PAD &&
        pointer.x <= box.right + HOVER_PAD &&
        pointer.y >= box.top - HOVER_PAD &&
        pointer.y <= box.bottom + HOVER_PAD;

      // Arriving: start the falloff from where the pointer actually is, or the
      // field sweeps in from wherever it was last parked.
      if (over && gate < 0.01) {
        eased.x = pointer.x;
        eased.y = pointer.y;
      }
      gate += ((over ? 1 : 0) - gate) * 0.2;

      if (gate < 0.004) {
        if (parked) return;
        setRest();
        parked = true;
        return;
      }

      eased.x += (pointer.x - eased.x) * lerp;
      eased.y += (pointer.y - eased.y) * lerp;

      // Read every glyph first, then write — never interleave.
      const rects = chars.map((el) => el.getBoundingClientRect());

      const next = rects.map((r) => {
        const dx = r.left + r.width / 2 - eased.x;
        const dy = r.top + r.height / 2 - eased.y;
        const t = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
        // ease-out so the falloff reads as pressure rather than a linear ramp,
        // then scaled by the hover gate so leaving the line releases smoothly
        const p = t * t * (3 - 2 * t) * gate;
        return `"wdth" ${Math.round(wdth[0] + (wdth[1] - wdth[0]) * p)}, "wght" ${Math.round(
          wght[0] + (wght[1] - wght[0]) * p,
        )}`;
      });

      parked = false;
      for (let i = 0; i < chars.length; i += 1) {
        if (chars[i].style.fontVariationSettings !== next[i]) {
          chars[i].style.fontVariationSettings = next[i];
        }
      }
    };

    const onMove = (e) => {
      // A touch contact is a tap, not a hover — it would light the line up
      // under the finger and then strand it there. Mouse and pen only.
      if (e.pointerType === "touch") return;

      // First sighting of a real pointing device: only now is there any reason
      // to take a slot on the shared ticker.
      if (!live) {
        live = true;
        gsap.ticker.add(tick);
      }

      pointer.x = e.clientX;
      pointer.y = e.clientY;
      // First real reading: snap rather than easing in from the sentinel,
      // otherwise the field sweeps across the line from off-screen on the very
      // first pointer move and takes the better part of a second to arrive.
      if (eased.x < -9000) {
        eased.x = e.clientX;
        eased.y = e.clientY;
      }
      parked = false;
    };
    const onLeave = () => {
      pointer.x = -99999;
      pointer.y = -99999;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      if (live) gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  // Spread the ranges rather than passing the arrays: they are fresh literals
  // on every render, and the Hero re-renders once a minute for the clock.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, radius, lerp, wdth[0], wdth[1], wght[0], wght[1]]);

  // Split on whitespace but KEEP the separators, so a line can still break
  // between words. Every glyph needs its own box to be animated individually,
  // and a bare run of inline-block characters is breakable at every one of
  // them — which lets a narrow column split a word straight down the middle
  // ("With / out Borders."). Each word is therefore its own inline-block with
  // `whitespace-nowrap`: glyphs stay individually addressable, the word stays
  // atomic, and the spaces between words remain ordinary breakable text.
  const tokens = String(text).split(/(\s+)/).filter((t) => t !== "");
  let charIndex = 0;
  charsRef.current = [];

  return (
    <Tag ref={rootRef} className={cn("inline-block", className)} aria-label={text}>
      {tokens.map((token, t) => {
        if (/^\s+$/.test(token)) {
          return (
            <span key={`sp-${t}`} aria-hidden="true">
              {" "}
            </span>
          );
        }
        return (
          <span key={`w-${t}`} aria-hidden="true" className="inline-block whitespace-nowrap">
            {Array.from(token).map((ch, i) => {
              const at = charIndex;
              charIndex += 1;
              return (
                <span
                  key={`${ch}-${i}`}
                  ref={(el) => {
                    charsRef.current[at] = el;
                  }}
                  className={cn(
                    "inline-block will-change-[font-variation-settings]",
                    charClassName,
                  )}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
