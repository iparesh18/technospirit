import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { INTENT_TRAIL } from "@/components/capabilities/capabilitiesAssets";

/**
 * THE INTENT TRAIL — React Bits `ImageTrail` (JS/CSS), variant 1, adapted.
 *
 * Installed with `npx shadcn@latest add @react-bits/ImageTrail-JS-CSS`. The CLI
 * itself fails on that registry entry — its `ImageTrail.css` file carries no
 * `target`, so shadcn tries to parse the stylesheet as a module and dies with
 * `Unexpected token (1:0)` on 4.19, 4.18 and 4.17 alike — so the payload was
 * taken from the same registry URL (`https://reactbits.dev/r/ImageTrail-JS-CSS.json`)
 * and placed here by hand. Same bytes, same component, one broken CLI step.
 *
 * WHAT WAS KEPT
 * The idea, which is a good one: a pool of image elements, a damped chase
 * position that lags the pointer, a distance gate that decides when the next
 * plate is laid down, and a per-plate timeline that carries it from where the
 * lag was to where the pointer is now and then retires it. Variant 1 is the
 * one of the eight that trails rather than sprays, and trailing is what this
 * page wants.
 *
 * WHAT WAS THROWN AWAY, and why each one mattered here
 *
 *  - ITS OWN `requestAnimationFrame` LOOP, started on the first pointer move
 *    and never stopped while mounted. This page has exactly one clock —
 *    gsap.ticker drives Lenis, Lenis updates ScrollTrigger — and the standing
 *    rule (see CapabilitiesExperience, rule 2) is that no scene starts a second
 *    one. It is now a ticker callback that is added and removed with `active`.
 *  - THE SEVEN OTHER VARIANTS. 1,200 lines of near-duplicate classes, all of
 *    them reachable through `variantMap`, so none of them tree-shake. This is
 *    the beat's first paint and it is inside a lazily-imported chunk; shipping
 *    eight implementations to run one is not a rounding error.
 *  - `mousemove` / `touchmove` ON THE CONTAINER. A container that receives
 *    pointer events is a container in the hit-test path, and the fixed header
 *    decides its own light/dark state by hit-testing what is painted under it
 *    (`elementsFromPoint` -> `closest("[data-zone]")`). A full-viewport
 *    listener target over the opening beat would have been the first thing that
 *    test found. Now: one passive `pointermove` on `window`, and the layer
 *    itself is `pointer-events: none` — same construction as usePointerLens,
 *    which is the other thing following this pointer.
 *  - `getBoundingClientRect()` PER IMAGE, on construction and on every resize.
 *    Every plate is the same size, so one read answers for all ten, and it is
 *    invalidated rather than repeated.
 *  - A FIXED 80px GATE. That is the demo's whole velocity model, and the brief
 *    for this beat is the opposite of a fixed one — see THE VELOCITY MODEL.
 *  - `border-radius: 15px`, `.content` / `.content__img` (global class names —
 *    `.ts-field` is what happens when one of those lands on a site that already
 *    owns the name), `z-index: 100`, `scale: 0.2` on exit, and permanent
 *    `will-change: transform, filter`.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * THE ART DIRECTION
 *
 * The pictures are not decoration and they are not stock. They are the five
 * plates `/contact` already puts on the pointer — BUILD, AUTOMATE, SCALE,
 * COLLABORATE, SOMETHING ELSE — and this beat's sub-line reads HUMAN INTENT.
 * So moving the pointer here spills the site's own five intents across the
 * paper while the lens opens a hole to what is underneath them. The trail is
 * the sentence's first half; the lens is the second.
 *
 * Each plate is a PRINT, not a floating photo: paper margin, square corners
 * (this brand has no radius anywhere), and an index and a word set in the same
 * mono label the nav numbers its routes with. Six of them on white paper reads
 * as a contact sheet being laid out, which is the register the page opens in.
 *
 * THE VELOCITY MODEL — the one thing the demo does not have.
 *   A slow pointer is browsing. The gate opens at 208px, so a careful sweep
 *   across the stage lays down two or three prints, they arrive nearly
 *   monochrome and slightly under size, and they sit square.
 *   A fast pointer is searching. The gate closes to 96px, the prints arrive at
 *   full colour and full size, they tilt toward the heading, and the trail
 *   becomes a run of them.
 * Nothing is thresholded: `energy` is a smoothed 0..1 read off the DAMPED
 * position — the same trick usePointerLens uses to keep a jittery trackpad from
 * shaking the lens — and every one of those four values is a lerp along it.
 *
 * THE TITLE STAYS THE HERO, structurally rather than by restraint.
 * `CAPABILITIES` is white type in `mix-blend-mode: difference`, painted ABOVE
 * this layer, so a print passing under it does not cover it — it inverts
 * through it, and the word is legible on every frame by construction. On top of
 * that, a print whose centre lands inside the headline's own band arrives at
 * roughly half strength: the trail defers where the word is, and only there.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * WHAT BOUNDS THE COST
 *   - Ten plates exist. They are built once, never added or removed, and the
 *     pool is walked round-robin, so a plate is reused rather than created.
 *     Ten is two passes over five pictures, which is what stops the same
 *     picture from ever landing twice in a row.
 *   - At most MAX_ACTIVE of them are alive at once, enforced two ways: a
 *     minimum interval between spawns that mathematically bounds it
 *     (LIFE / MIN_GAP), and a live count that refuses the spawn if the maths is
 *     ever wrong.
 *   - Every frame of every plate is `transform` and `opacity` on two elements,
 *     plus one `clip-path` wipe over the first 360ms. `filter: grayscale()` is
 *     WRITTEN ONCE per spawn and never tweened — a static filter is rasterised
 *     into the plate's layer and costs nothing to composite afterwards, which
 *     is not true of one that animates.
 *   - `will-change` goes on at spawn and comes off at retirement, so an idle
 *     pool holds no compositor layers.
 *   - `active` false removes the listener, removes the ticker callback, kills
 *     every timeline and parks the pool. Scrolling out of the beat costs
 *     nothing; scrolling back in re-arms on the reader's next pointer move.
 */

/** Plates in the pool. Two passes over five pictures — see WHAT BOUNDS THE COST. */
const POOL = INTENT_TRAIL.length * 2;

/**
 * Hard ceiling on simultaneously visible prints.
 *
 * Six is a composition decision before it is a performance one: seven is a
 * scatter and four cannot read as a trail. LIFE / MIN_GAP is 5.6, so the count
 * below is a guard against arithmetic drift rather than the mechanism.
 */
const MAX_ACTIVE = 6;

/** Fraction of the remaining distance the birth point covers per frame. The
    print is laid down HERE and travels to the pointer, which is what makes it
    read as something the pointer dragged out rather than something it dropped. */
const CHASE = 0.16;

/** Damped speed, in px/frame, that counts as "searching". */
const SPEED_FULL = 22;
/** How quickly `energy` follows the speed. Slow enough that one flick does not
    swing the whole model; fast enough to answer within about six frames. */
const ENERGY_LAG = 0.13;

/** Pointer distance between prints: browsing, then searching. */
const GATE_SLOW = 208;
const GATE_FAST = 96;

/** Scale, tilt and colour at rest and at speed. */
const SCALE_SLOW = 0.86;
const SCALE_FAST = 1.06;
const TILT_MAX = 4.5;
const MONO_SLOW = 0.94;
const MONO_FAST = 0.06;

/** Opacity on open paper, and under the headline's own band. */
const ALPHA = 0.94;
const ALPHA_QUIET = 0.5;

/* ── the timeline, in seconds ─────────────────────────────────────────────
   Travel is the longest leg and is the only one that reads as motion; the
   wipe is the site's own masked reveal, at the site's own display speed; the
   exit starts before the travel finishes, so a print is always leaving while
   the next is arriving and the trail never resolves into a queue of stills.
   0.30 + 0.34 = 0.64s of life, which is the number MIN_GAP is derived from. */
const T_TRAVEL = 0.5;
const T_WIPE = 0.36;
const T_OUT_AT = 0.3;
const T_OUT = 0.34;
const LIFE = T_OUT_AT + T_OUT;

/**
 * Minimum seconds between prints, whatever the distance gate says.
 *
 * Derived rather than picked: a print lives LIFE seconds, so laying one down
 * every LIFE / MAX_ACTIVE seconds is precisely the rate at which the ceiling is
 * reached and never passed. That makes the bound arithmetic rather than a hope,
 * and leaves the `live` counter in `spawn` as a guard against this going stale
 * rather than as the mechanism.
 */
const MIN_GAP = LIFE / MAX_ACTIVE;

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const mix = (a, b, t) => a + (b - a) * t;

/**
 * The wipe starts from the leading edge, so the print is uncovered in the
 * direction the pointer is already going. Apple's rule for this is "hint in the
 * direction of the gesture" — the in-between frames should point at the
 * outcome rather than interpolate blindly toward it.
 */
function wipeFrom(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
  }
  return dy >= 0 ? "inset(0% 0% 100% 0%)" : "inset(100% 0% 0% 0%)";
}

export default function ImageTrail({ active, quietRef }) {
  const root = useRef(null);
  /** [positioner, card] per plate, filled by the ref callbacks below. */
  const plates = useRef([]);

  // `quietRef` is an object literal from the caller's render, so it is held in
  // a ref for the same reason usePointerLens holds its callbacks: the effect
  // below must not rebuild on a render, because rebuilding it drops the
  // listener and the pool's live timelines with it.
  const quiet = useRef(quietRef);
  useLayoutEffect(() => {
    quiet.current = quietRef;
  });

  useEffect(() => {
    const host = root.current;

    /**
     * THE POOL IS CAPTURED AS ELEMENTS, NOT AS THE REF HOLDERS.
     *
     * `plates.current` holds one small object per plate whose `pos` and `card`
     * properties are written by the JSX ref callbacks below. React sets those
     * callbacks to `null` during the MUTATION phase of an unmount, which runs
     * BEFORE this effect's cleanup. So an effect that closed over those holder
     * objects would find both properties null by the time it tried to tidy up.
     *
     * That is not theoretical: it threw
     * `TypeError: Cannot read properties of null (reading 'style')` out of the
     * cleanup, and because the throw happened inside React's unmount commit it
     * took the whole tree down with it — leaving a blank page and no header on
     * every navigation AWAY from /capabilities.
     *
     * Copying the element references into objects this effect owns fixes it at
     * the root. A DOM node stays a perfectly valid object after React forgets
     * about it, so the cleanup below can always finish its work: no null
     * checks, and — the part the null checks got wrong — no silently skipped
     * teardown leaving `will-change` set on ten promoted layers.
     *
     * `alive` lives on these objects too, so the round-robin state is scoped to
     * the run of the effect that owns it and can never leak into the next one.
     */
    const pool = plates.current
      .filter((p) => p && p.pos && p.card)
      .map((p) => ({ pos: p.pos, card: p.card, alive: false }));
    if (!host || pool.length === 0) return undefined;

    const park = () => {
      for (const p of pool) {
        gsap.killTweensOf([p.pos, p.card]);
        p.alive = false;
        p.card.style.opacity = "0";
        p.pos.style.willChange = "";
        p.card.style.willChange = "";
      }
    };

    if (!active) {
      park();
      return undefined;
    }

    /* ── geometry, read once and invalidated rather than repeated ───────── */
    let box = { left: 0, top: 0 };
    let pw = 0;
    let ph = 0;
    /** The headline's band, in stage coordinates. See THE TITLE STAYS THE HERO. */
    let quietBand = null;

    const measure = () => {
      const r = host.getBoundingClientRect();
      box = { left: r.left, top: r.top };
      // Every plate is the same box; one read answers for all ten.
      pw = pool[0].pos.offsetWidth;
      ph = pool[0].pos.offsetHeight;

      const q = quiet.current?.current;
      if (q) {
        const b = q.getBoundingClientRect();
        // Inset to the glyph band rather than the line box: `CAPABILITIES` is
        // set at up to 15rem with display leading, so the element's own rect is
        // a good deal taller than the letters and deferring to all of it would
        // have dimmed most of the stage.
        const pad = b.height * 0.16;
        quietBand = { top: b.top - r.top + pad, bottom: b.bottom - r.top - pad };
      } else {
        quietBand = null;
      }
    };
    measure();

    let queued = 0;
    const invalidate = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(measure);
    };

    /* ── state ──────────────────────────────────────────────────────────── */
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let lastX = 0;
    let lastY = 0;
    let seeded = false;
    let energy = 0;
    let lastSpawn = -Infinity;
    let cursor = 0;
    let zTop = 1;
    let live = 0;

    const onMove = (e) => {
      tx = e.clientX - box.left;
      ty = e.clientY - box.top;
      if (!seeded) {
        // Placed, not eased in. The pointer had to cross the stage to get here;
        // flying the birth point in from wherever it was parked would lay a
        // print down along a path the reader never took.
        seeded = true;
        cx = tx;
        cy = ty;
        lastX = tx;
        lastY = ty;
      }
    };

    const spawn = (dx, dy) => {
      const p = pool[cursor];
      cursor = (cursor + 1) % pool.length;

      // Reusing a plate that is still alive: kill its timeline, and take its
      // count back before the new one adds its own.
      if (p.alive) {
        gsap.killTweensOf([p.pos, p.card]);
        p.alive = false;
        live -= 1;
      }

      const e = energy;
      const scale = mix(SCALE_SLOW, SCALE_FAST, e);
      const tilt = clamp(dx * 0.05, -TILT_MAX, TILT_MAX) * e;
      const mono = mix(MONO_SLOW, MONO_FAST, e);

      // The print is born centred on (cx, cy), so its box is that centre plus
      // and minus half a plate. It defers if that box touches the band at all.
      const inQuiet =
        !!quietBand && cy + ph / 2 > quietBand.top && cy - ph / 2 < quietBand.bottom;
      const alpha = inQuiet ? ALPHA_QUIET : ALPHA;

      p.alive = true;
      live += 1;
      zTop += 1;

      p.pos.style.willChange = "transform";
      p.pos.style.zIndex = String(zTop);
      p.card.style.willChange = "transform, opacity, clip-path";

      const tl = gsap.timeline({
        onComplete: () => {
          p.alive = false;
          live -= 1;
          p.pos.style.willChange = "";
          p.card.style.willChange = "";
          // The pool is walked round-robin, so z can be reset whenever the
          // stage is empty and never has to grow without bound.
          if (live === 0) zTop = 1;
        },
      });

      tl.set(p.pos, { x: cx - pw / 2, y: cy - ph / 2 })
        .set(p.card, {
          opacity: alpha,
          scale,
          rotation: tilt,
          yPercent: 0,
          clipPath: wipeFrom(dx, dy),
          filter: `grayscale(${mono.toFixed(3)})`,
        })
        .to(p.pos, { duration: T_TRAVEL, ease: "power2.out", x: tx - pw / 2, y: ty - ph / 2 }, 0)
        .to(p.card, { duration: T_WIPE, ease: "expo.out", clipPath: "inset(0% 0% 0% 0%)" }, 0)
        .to(
          p.card,
          {
            duration: T_OUT,
            ease: "power2.out",
            opacity: 0,
            // Never to zero. Nothing in the world disappears from nothing, and
            // the demo's 0.2 reads as a print being sucked away rather than
            // set down. This one settles: it loses a little size, drifts 5% of
            // its own height downward, and goes.
            scale: scale * 0.955,
            yPercent: 5,
          },
          T_OUT_AT,
        );
    };

    const tick = () => {
      if (!seeded) return;

      const px = cx;
      const py = cy;
      cx += (tx - cx) * CHASE;
      cy += (ty - cy) * CHASE;

      // Speed off the DAMPED position, not the raw pointer: a trackpad's
      // per-event jitter would otherwise swing `energy` between browsing and
      // searching several times a second.
      const speed = Math.hypot(cx - px, cy - py);
      energy += (Math.min(speed / SPEED_FULL, 1) - energy) * ENERGY_LAG;

      const dx = tx - lastX;
      const dy = ty - lastY;
      const gate = mix(GATE_SLOW, GATE_FAST, energy);
      const now = gsap.ticker.time;

      if (
        Math.hypot(dx, dy) > gate &&
        now - lastSpawn >= MIN_GAP &&
        live < MAX_ACTIVE
      ) {
        spawn(dx, dy);
        lastX = tx;
        lastY = ty;
        lastSpawn = now;
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", invalidate);
    window.addEventListener("scroll", invalidate, { passive: true });
    gsap.ticker.add(tick);

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("scroll", invalidate);
      gsap.ticker.remove(tick);
      // Kills every timeline on the pool and clears both promotions. The
      // locals above die with the closure, so there is nothing else to reset.
      park();
    };
  }, [active]);

  return (
    <div ref={root} className="cap-trail" aria-hidden="true">
      {Array.from({ length: POOL }).map((_, i) => {
        const item = INTENT_TRAIL[i % INTENT_TRAIL.length];
        return (
          <div
            key={i}
            className="cap-trail-plate"
            ref={(el) => {
              if (!plates.current[i]) plates.current[i] = {};
              plates.current[i].pos = el;
            }}
          >
            <div
              className="cap-trail-card"
              ref={(el) => {
                if (!plates.current[i]) plates.current[i] = {};
                plates.current[i].card = el;
              }}
            >
              <picture>
                <source type="image/avif" srcSet={item.avif} />
                <img
                  className="cap-trail-img"
                  src={item.webp}
                  alt=""
                  width={item.width}
                  height={item.height}
                  decoding="async"
                  // Low, deliberately. These are ~102 KB in total and they are
                  // wanted before the first pointer move, but not before the
                  // reveal image and the two hand plates the prepare gate is
                  // already waiting on.
                  fetchPriority="low"
                />
              </picture>
              <span className="cap-trail-cap ts-label">
                <b>{item.index}</b>
                <i>{item.word}</i>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
