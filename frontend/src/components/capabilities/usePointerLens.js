import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * The reveal interaction this page is built on, used twice: once to open the
 * paper in the opening beat, and once to refine the sneaker.
 *
 * WHAT IT IS NOT
 * It is not `clip-path: circle()` following the cursor. A clip-path that moves
 * every frame re-rasterises whatever it clips, and what is being clipped here
 * is a full-viewport image in one case and a playing video in the other — the
 * two most expensive things on the page to repaint.
 *
 * WHAT IT IS
 * A fixed-size window whose *shape never changes*, and a copy of the content
 * inside it that is counter-transformed to stay welded to the viewport. Every
 * frame of it is `transform` on three elements and nothing else: no layout, no
 * paint, no clip recalculation. The window is masked once, statically, so even
 * the soft edge is free.
 *
 * THE GEOMETRY
 * The window sits at `left:0; top:0` with `transform-origin` at its centre, so
 * after `translate(lx - S/2, ly - S/2)` its centre is exactly on the pointer
 * and any rotate/scale happens about the pointer.
 *
 *   window   translate(lx - S/2, ly - S/2) rotate(θ) scale(sx, sy)
 *   inner    rotate(-θ) scale(1/sx^r, 1/sy^r)
 *   frame    translate(S/2 - lx, S/2 - ly)
 *
 * At r = 1 the inner exactly cancels the window's rotate and scale, so the two
 * compose to a pure translation and the frame's counter-translate lands the
 * content's top-left on (0, 0) — a genuine hole in the page, not a picture
 * riding the cursor.
 *
 * REFRACTION is the deliberate *under*-correction. At r < 1 a little of the
 * window's stretch survives into the content, and because the inner's origin
 * is the pointer, the pixel under the cursor stays exactly where it is while
 * everything toward the rim displaces outward. That is what a lens does, and
 * it costs one `Math.pow` per frame rather than a filter.
 *
 * THE MOTION
 * One damped follow produces everything. The window chases the pointer at
 * `lag`, and its own frame-to-frame delta — not the raw pointer's — is the
 * velocity that drives the squash, the rotation and the growth. Deriving the
 * velocity from the already-damped position is what keeps the deformation
 * smooth through a jittery trackpad, and it is why the shape settles by
 * itself when the pointer stops: the follow decays, so the velocity decays,
 * so the stretch decays. Nothing has to be told to relax.
 */

const DEFAULTS = {
  /** Fraction of the remaining distance covered per frame. Lower trails more. */
  lag: 0.19,
  /** How much stretch a unit of speed buys, and the ceiling on it. */
  stretch: 0.0075,
  maxStretch: 0.26,
  /** Cross-axis squash, as a share of the along-axis stretch. Volume, roughly. */
  squash: 0.62,
  /** How much the window opens up when travelling fast. */
  grow: 0.0022,
  maxGrow: 0.2,
  /** 1 = a perfect window. Below 1, the content stretches with it. */
  refract: 0.74,
  /** Below this speed the window is treated as at rest and stops rotating. */
  restSpeed: 0.35,

  /**
   * CHROMATIC FRINGE on the rim.
   *
   * Three coloured rings sit just inside the mask's falloff, and they are
   * children of the WINDOW rather than of the counter-rotated inner — which
   * means the window's local x-axis is already the direction of travel, and
   * pushing red one way and blue the other along it separates the channels
   * along the axis the lens is moving. That is what real chromatic aberration
   * does, and it costs two translates and a scale per frame instead of a
   * filter.
   *
   * `fringeBase` is the separation at rest — enough that the three lines are
   * a property of the glass rather than something that only appears when you
   * shake it. `fringeSpread` is what motion adds on top.
   */
  fringeBase: 1.6,
  fringeSpread: 9,
  /** Rim opacity when the lens is completely still. */
  fringeRest: 0.5,
};

export default function usePointerLens({
  active,
  lens,
  inner,
  frame,
  fringe,
  wake,
  size,
  wakeSize,
  bounds,
  onEnergy,
  options,
}) {
  /**
   * The callback and the tuning object are held in refs, and the effect below
   * depends on NOTHING that is rebuilt per render.
   *
   * This is not a micro-optimisation, it is a correctness fix. `onEnergy` is
   * an arrow function and `wake`/`options` are object literals, so React sees
   * three new values on every render. With those in the dependency array the
   * effect tore itself down and rebuilt on any state change — and the first
   * thing `onEnergy` does is set state. So moving the pointer fast enough to
   * be noticed destroyed the very interaction that noticed it: the listeners
   * were removed and re-added, `seeded` went back to false, and the lens froze
   * wherever it happened to be until the next pointer event. It looked exactly
   * like a rendering bug and was a dependency bug.
   */
  const energyRef = useRef(onEnergy);
  const optionsRef = useRef(options);
  const wakeRef = useRef(wake);
  const fringeRef = useRef(fringe);
  useLayoutEffect(() => {
    energyRef.current = onEnergy;
    optionsRef.current = options;
    wakeRef.current = wake;
    fringeRef.current = fringe;
  });

  useEffect(() => {
    const lensEl = lens.current;
    const innerEl = inner.current;
    const frameEl = frame.current;
    if (!lensEl || !innerEl || !frameEl) return undefined;

    const cfg = { ...DEFAULTS, ...optionsRef.current };
    const w = wakeRef.current;
    const wakeEls = w?.lens?.current
      ? { lens: w.lens.current, inner: w.inner.current, frame: w.frame.current }
      : null;
    const f = fringeRef.current;
    const fringeEls = f?.r?.current ? { r: f.r.current, g: f.g.current, b: f.b.current } : null;

    // Everything is parked and the listeners are gone when the beat is not on
    // screen. This is the rule for the whole page: no pointer maths, no ticker
    // callback and no promoted layers survive the beat that needed them.
    if (!active) {
      gsap.set(lensEl, { opacity: 0 });
      if (wakeEls) gsap.set(wakeEls.lens, { opacity: 0 });
      for (const el of [lensEl, innerEl, frameEl]) el.style.willChange = "";
      if (wakeEls) for (const el of Object.values(wakeEls)) el.style.willChange = "";
      if (fringeEls) for (const el of Object.values(fringeEls)) el.style.willChange = "";
      return undefined;
    }

    for (const el of [lensEl, innerEl, frameEl]) el.style.willChange = "transform";
    if (wakeEls) for (const el of Object.values(wakeEls)) el.style.willChange = "transform";
    if (fringeEls) for (const el of Object.values(fringeEls)) el.style.willChange = "transform, opacity";

    // The box size is written here rather than in CSS so it and the geometry
    // below can never disagree — a lens whose element is a different size from
    // the `size` the counter-transform was computed with does not read as a
    // window, it reads as a bug.
    const half = size / 2;
    lensEl.style.width = `${size}px`;
    lensEl.style.height = `${size}px`;
    if (wakeEls) {
      const ws = wakeSize ?? size;
      wakeEls.lens.style.width = `${ws}px`;
      wakeEls.lens.style.height = `${ws}px`;
    }

    /** Pointer, in the coordinate space the content is laid out in. When
        `bounds` is given the lens lives inside that element, so the pointer has
        to be expressed relative to it — and the box is cached rather than read
        per event, which is the layout read <Magnet> was rewritten to remove. */
    let box = null;
    const measure = () => {
      box = bounds?.current ? bounds.current.getBoundingClientRect() : null;
    };
    measure();

    let queued = false;
    const invalidate = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        measure();
      });
    };

    let tx = 0;
    let ty = 0;
    let lx = 0;
    let ly = 0;
    let px = 0;
    let py = 0;
    let wx = 0;
    let wy = 0;
    let seeded = false;
    let visible = false;
    let angle = 0;

    const show = () => {
      if (visible) return;
      visible = true;
      gsap.to(lensEl, { opacity: 1, duration: 0.42, ease: "power2.out", overwrite: "auto" });
    };

    const onMove = (e) => {
      tx = box ? e.clientX - box.left : e.clientX;
      ty = box ? e.clientY - box.top : e.clientY;

      if (!seeded) {
        // Placed, not tweened. The pointer has to cross the stage to arrive, so
        // easing in from wherever the lens was parked buys a diagonal flight
        // nobody asked to see.
        seeded = true;
        lx = tx;
        ly = ty;
        px = tx;
        py = ty;
        wx = tx;
        wy = ty;
      }
      show();
    };

    const onLeave = () => {
      visible = false;
      gsap.to(lensEl, { opacity: 0, duration: 0.3, overwrite: "auto" });
      if (wakeEls) gsap.to(wakeEls.lens, { opacity: 0, duration: 0.3, overwrite: "auto" });
    };

    const write = (els, x, y, s, sx, sy, deg, r) => {
      const h = s / 2;
      const csx = 1 / (Math.pow(sx, r) || 1);
      const csy = 1 / (Math.pow(sy, r) || 1);
      els.lens.style.transform = `translate3d(${x - h}px, ${y - h}px, 0) rotate(${deg}deg) scale(${sx}, ${sy})`;
      els.inner.style.transform = `rotate(${-deg}deg) scale(${csx}, ${csy})`;
      els.frame.style.transform = `translate3d(${h - x}px, ${h - y}px, 0)`;
    };

    const tick = () => {
      if (!seeded) return;

      px = lx;
      py = ly;
      lx += (tx - lx) * cfg.lag;
      ly += (ty - ly) * cfg.lag;

      const vx = lx - px;
      const vy = ly - py;
      const speed = Math.hypot(vx, vy);

      // Hold the last heading below the rest threshold. Without this the angle
      // thrashes through 360 degrees on the final sub-pixel frames of a settle
      // and the window spins as it comes to rest.
      if (speed > cfg.restSpeed) angle = (Math.atan2(vy, vx) * 180) / Math.PI;

      const stretch = Math.min(speed * cfg.stretch, cfg.maxStretch);
      const grow = 1 + Math.min(speed * cfg.grow, cfg.maxGrow);
      const sx = (1 + stretch) * grow;
      const sy = (1 - stretch * cfg.squash) * grow;

      // The grow is fully cancelled — a faster window shows MORE content at the
      // same scale, it does not zoom. Only the stretch is under-corrected.
      const csx = 1 / (Math.pow(1 + stretch, cfg.refract) * grow);
      const csy = 1 / (Math.pow(1 - stretch * cfg.squash, cfg.refract) * grow);

      lensEl.style.transform = `translate3d(${lx - half}px, ${ly - half}px, 0) rotate(${angle}deg) scale(${sx}, ${sy})`;
      innerEl.style.transform = `rotate(${-angle}deg) scale(${csx}, ${csy})`;
      frameEl.style.transform = `translate3d(${half - lx}px, ${half - ly}px, 0)`;

      const energy = Math.min(speed / 26, 1);

      if (fringeEls) {
        /**
         * The rim, dispersing along the direction of travel.
         *
         * These rings are children of the WINDOW, not of the counter-rotated
         * inner — so the window's local +x is already the heading, and no angle
         * maths is needed here at all. Red leads, blue trails, green sits
         * between them and barely moves: the order a real lens disperses in.
         *
         * Each ring also breathes by a slightly different amount, so while the
         * lens is travelling the three lines are never quite concentric and the
         * boundary reads as disturbed glass. It resolves to three clean rings
         * the moment the pointer stops.
         */
        const d = cfg.fringeBase + energy * cfg.fringeSpread;
        fringeEls.r.style.transform = `translate3d(${d}px, 0, 0) scale(${1 + energy * 0.013})`;
        fringeEls.g.style.transform = `translate3d(${d * 0.14}px, 0, 0) scale(${1 + energy * 0.004})`;
        fringeEls.b.style.transform = `translate3d(${-d}px, 0, 0) scale(${1 - energy * 0.011})`;
        const o = cfg.fringeRest + energy * (1 - cfg.fringeRest);
        fringeEls.r.style.opacity = String(o);
        fringeEls.g.style.opacity = String(o * 0.8);
        fringeEls.b.style.opacity = String(o);
      }

      if (wakeEls) {
        // The wake is the same construction a beat further behind, and it only
        // exists while the pointer is actually travelling. At rest there is
        // exactly one window on screen, which is the restraint that keeps this
        // from reading as a particle effect.
        const wLag = cfg.lag * 0.42;
        wx += (tx - wx) * wLag;
        wy += (ty - wy) * wLag;
        const trail = Math.min(Math.hypot(lx - wx, ly - wy) / 90, 1);
        wakeEls.lens.style.opacity = visible ? String(trail * 0.5) : "0";
        if (trail > 0.001) {
          write(wakeEls, wx, wy, wakeSize ?? size, sx, sy, angle, cfg.refract);
        }
      }

      energyRef.current?.(energy);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", invalidate);
    window.addEventListener("scroll", invalidate, { passive: true });
    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("scroll", invalidate);
      gsap.ticker.remove(tick);
      gsap.killTweensOf(lensEl);
      if (wakeEls) gsap.killTweensOf(wakeEls.lens);
      for (const el of [lensEl, innerEl, frameEl]) el.style.willChange = "";
      if (wakeEls) for (const el of Object.values(wakeEls)) el.style.willChange = "";
      if (fringeEls) for (const el of Object.values(fringeEls)) el.style.willChange = "";
    };
    // Refs are stable for the component's lifetime, so only the three values
    // that genuinely change the machine are listed.
  }, [active, size, wakeSize, lens, inner, frame, bounds]);
}
