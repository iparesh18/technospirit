import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * ShinyText — a soft highlight band that sweeps across type.
 *
 * Origin: React Bits `ShinyText` (`@react-bits/ShinyText-JS-CSS`). As with
 * `Aurora` and `SignalField`, the shadcn CLI still cannot install a React Bits
 * item that ships a `.css` file — it parses the stylesheet as JS and dies on
 * "Unexpected token (1:0)" — so the item was lifted from the registry JSON by
 * hand. The gradient itself is upstream's, unchanged, and so is the prop API:
 * `text`, `speed`, `color`, `shineColor`, `spread`, `direction`, `delay`,
 * `yoyo`, `pauseOnHover` and `disabled` all mean what they mean upstream.
 *
 * Two things were rebuilt:
 *
 *  - Upstream drives the sweep with `motion`'s `useAnimationFrame` and hand-
 *    rolled elapsed-time bookkeeping — a second frame loop and a second
 *    animation library, in a project whose whole scroll layer exists to keep
 *    everything on GSAP's single ticker. It is a `gsap.to` on a plain object
 *    now: `repeat: -1` + `repeatDelay` + `yoyo` express the same cycle
 *    (including the hold at the end of each pass) in four lines instead of
 *    forty, and it costs no new dependency and no extra requestAnimationFrame.
 *  - `background-clip: text` cannot paint SVG text, and the footer wordmark
 *    has to stay SVG — `textLength` + `lengthAdjust` is the only way to land
 *    the word exactly on both margins whatever the webfont does. So the same
 *    sweep is also published as an SVG `<linearGradient>` (`ShinyGradient`)
 *    that a `<text>` can reference through `fill`. One timing implementation,
 *    two paint targets.
 *
 * Under prefers-reduced-motion the band parks off the far edge, which leaves
 * the type in its plain base colour — readable, and never mid-sweep.
 */

/* -------------------------------------------------------------------------- */
/*  Shared sweep                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Emits progress 0 → 100 for one pass, then holds for `delay` and repeats.
 * `direction: "right"` mirrors the pass without touching the gradient.
 */
function useSweep({ speed, delay, yoyo, direction, disabled, onProgress }) {
  const emitRef = useRef(onProgress);
  const tween = useRef(null);

  // Keep the writer current without making it a dependency of the tween — a
  // new closure every render must not restart the sweep.
  useLayoutEffect(() => {
    emitRef.current = onProgress;
  });

  useEffect(() => {
    const forward = direction !== "right";
    const emit = (p) => emitRef.current(forward ? p : 100 - p);

    if (disabled || prefersReducedMotion()) {
      emit(100);
      return undefined;
    }

    const state = { p: 0 };
    tween.current = gsap.to(state, {
      p: 100,
      duration: speed,
      ease: "none",
      repeat: -1,
      repeatDelay: delay,
      yoyo,
      onUpdate: () => emit(state.p),
    });

    return () => {
      tween.current?.kill();
      tween.current = null;
    };
  }, [speed, delay, yoyo, direction, disabled]);

  return tween;
}

/**
 * Where the highlight's ramp starts and ends, as offsets into a gradient that
 * is twice the width of the element it paints.
 *
 * `band` is the width of that ramp expressed as a fraction of the *element*,
 * which is the number you can actually judge by eye: 0.6 is upstream's 35% →
 * 65%, a highlight covering well over half the word at once. Anything set on
 * type this large wants far less than that.
 */
function stops(band) {
  const half = gsap.utils.clamp(1, 24, band * 25);
  return [50 - half, 50 + half];
}

/* -------------------------------------------------------------------------- */
/*  HTML text                                                                 */
/* -------------------------------------------------------------------------- */

export default function ShinyText({
  text,
  className,
  disabled = false,
  speed = 5,
  color = "#b5b5b5",
  shineColor = "#ffffff",
  spread = 120,
  band = 0.6,
  yoyo = false,
  pauseOnHover = false,
  direction = "left",
  delay = 0,
}) {
  const el = useRef(null);
  const [a, b] = stops(band);

  // p=0 parks the band off the left edge, p=100 off the right — the same
  // 150% → -50% background-position ramp upstream uses.
  const tween = useSweep({
    speed,
    delay,
    yoyo,
    direction,
    disabled,
    onProgress: (p) => {
      if (el.current) el.current.style.backgroundPosition = `${150 - p * 2}% center`;
    },
  });

  return (
    <span
      ref={el}
      className={cn("inline-block", className)}
      onMouseEnter={pauseOnHover ? () => tween.current?.pause() : undefined}
      onMouseLeave={pauseOnHover ? () => tween.current?.resume() : undefined}
      style={{
        backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} ${a}%, ${shineColor} 50%, ${color} ${b}%, ${color} 100%)`,
        backgroundSize: "200% auto",
        backgroundPosition: "150% center",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {text}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  SVG text                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The same sweep as a paint server. Drop it in `<defs>` and point a `<text>`
 * at it with `fill={`url(#${id})`}`.
 *
 * The gradient is twice the width of the element's bounding box (x from -0.5
 * to 1.5 in objectBoundingBox units, highlight at its midpoint) and is walked
 * across by `gradientTransform`, which is the SVG equivalent of upstream's
 * 200%-wide background sliding under a `background-clip: text` mask. Because
 * the units are relative to each glyph run's own box, one gradient serves a
 * one-line and a stacked wordmark alike.
 */
export function ShinyGradient({
  id,
  color = "currentColor",
  shineColor = "#ffffff",
  spread = 120,
  band = 0.6,
  speed = 5,
  delay = 0,
  yoyo = false,
  direction = "left",
  disabled = false,
}) {
  const grad = useRef(null);
  const [a, b] = stops(band);

  useSweep({
    speed,
    delay,
    yoyo,
    direction,
    disabled,
    onProgress: (p) => {
      // p 0 → 100 maps to a −1 → +1 walk, putting the highlight at −0.5 then
      // 1.5: fully off one edge of the box, then fully off the other.
      grad.current?.setAttribute("gradientTransform", `translate(${(p / 50 - 1).toFixed(4)} 0)`);
    },
  });

  // `spread` is upstream's CSS gradient angle. Converted to a gradient vector
  // it becomes a vertical drop across a fixed horizontal span — clamped so an
  // extreme angle can never turn the pass vertical and stall it over the type.
  const rad = (spread * Math.PI) / 180;
  const ax = Math.max(Math.abs(Math.sin(rad)), 0.35);
  const dy = gsap.utils.clamp(-3, 3, (-Math.cos(rad) / ax) * 2);

  return (
    <linearGradient
      ref={grad}
      id={id}
      x1="-0.5"
      x2="1.5"
      y1={0.5 - dy / 2}
      y2={0.5 + dy / 2}
      gradientTransform="translate(-1 0)"
    >
      <stop offset="0%" style={{ stopColor: color }} />
      <stop offset={`${a}%`} style={{ stopColor: color }} />
      <stop offset="50%" style={{ stopColor: shineColor }} />
      <stop offset={`${b}%`} style={{ stopColor: color }} />
      <stop offset="100%" style={{ stopColor: color }} />
    </linearGradient>
  );
}
