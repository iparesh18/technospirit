import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/gsap";
import { useStageProgress, span, ease } from "@/components/capabilities/capabilitiesStage";
import { HAND_HUMAN, HAND_ROBOT, BEATS } from "@/components/capabilities/capabilitiesAssets";

/**
 * BEAT 2 — HUMAN x MACHINE, and the contact.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THERE IS NO MEASUREMENT IN HERE
 *
 * The alignment is solved in CSS, not in JavaScript. Each plate is positioned
 * so that its own measured fingertip sits on the contact point, and the ONLY
 * property this file animates is `x`. Both tips therefore travel along the
 * same horizontal line for the whole approach and arrive together, exactly, at
 * every viewport size — with nothing to re-measure on resize and no per-
 * breakpoint tuning. See `capabilities.css` for the two coordinate pairs and
 * how they were obtained.
 *
 * The failure mode this avoids is the obvious implementation: animate both
 * plates to 50%. The two tips sit at 44.208% and 38.523% of their plate's
 * height — 5.7% apart, about 60px at 1080 — so that version misses vertically
 * at every size, and misses by a different amount at each one.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * CHARACTER. The brief asks for the human to read as organic and the machine
 * as precise, and warns against overdoing it. So the difference is in the
 * pacing, not in the path:
 *
 *   robot   strictly linear. It covers equal distance for equal scroll, the
 *           whole way, and it never deviates vertically.
 *   human   runs a few percent ahead through the middle of the approach and
 *           settles back, and lifts about eight pixels and comes back down.
 *
 * Both corrections are shaped by sin(pi * p), which is zero at both ends. That
 * is not a stylistic choice — it is what guarantees the character costs the
 * alignment nothing at the moment it matters.
 */

/** How far each plate is pushed out at the start, as a share of stage width.
    At 0.35 the opening frame shows a hand entering from off-screen and about
    two thirds of the stage empty between them. */
const TRAVEL = 0.35;

/** Human lead through the middle of the approach, as a share of the travel. */
const LEAD = 0.055;
/** Human vertical drift, in px, at the midpoint. Negative lifts. */
const DRIFT = -9;

export default function HandsScene({ active }) {
  const root = useRef(null);
  const human = useRef(null);
  const robot = useRef(null);
  const labels = useRef(null);
  const point = useRef(null);
  const reduced = prefersReducedMotion();

  /**
   * Whether the plates and the point are currently promoted.
   *
   * `will-change` used to be declared in the stylesheet, which meant both
   * plates — each one 106% of a full-bleed stage — and the point held
   * compositor layers for the entire page, including the ten viewports where
   * this beat is not on screen. That is precisely what the offscreen rule in
   * <CapabilitiesExperience> exists to prevent, so the promotion is written
   * here instead, on the transition rather than on every frame.
   */
  const promoted = useRef(false);
  const pointPromoted = useRef(false);

  // The progress callback returns early once the beat is switched off, so it
  // cannot clear its own promotions. This does it.
  useEffect(() => {
    if (active) return undefined;
    promoted.current = false;
    pointPromoted.current = false;
    for (const r of [human, robot, point]) {
      if (r.current) r.current.style.willChange = "";
    }
    return undefined;
  }, [active]);

  /** Stage width, cached. Read on resize and on ScrollTrigger's refresh, never
      on a scroll frame. */
  const width = useRef(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const measure = () => {
      width.current = el.clientWidth;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useStageProgress(({ act1 }) => {
    const el = root.current;
    if (!el || reduced || !active) return;

    const { handsIn, approach, contact, circle } = BEATS.act1;

    // The layer fades up under the paper, and is taken off the compositor
    // entirely once the circle has covered it. Nothing is left blending.
    const inP = span(act1, handsIn[0], handsIn[1]);
    const covered = span(act1, circle[1] - 0.02, circle[1]);
    el.style.opacity = String(inP * (1 - covered));
    el.style.visibility = inP <= 0.001 || covered >= 0.999 ? "hidden" : "";

    const hidden = el.style.visibility === "hidden";
    if (hidden !== !promoted.current) {
      promoted.current = !hidden;
      const v = hidden ? "" : "transform";
      human.current.style.willChange = v;
      robot.current.style.willChange = v;
    }

    if (hidden) return;

    const t = width.current * TRAVEL;
    const p = span(act1, approach[0], approach[1]);

    // Robot: linear in, no vertical component, ever.
    robot.current.style.transform = `translate3d(${t * (1 - p)}px, 0, 0)`;

    // Human: the same journey, arriving at the same instant, taken slightly
    // less evenly. Both corrections vanish at p = 0 and p = 1.
    const swell = Math.sin(p * Math.PI);
    const hp = Math.min(1, p + LEAD * swell);
    human.current.style.transform = `translate3d(${-t * (1 - hp)}px, ${DRIFT * swell}px, 0)`;

    // The words retire as the space between them closes — they are a caption
    // for the negative space, and there stops being any.
    labels.current.style.opacity = String(inP * (1 - span(act1, approach[0] + 0.04, approach[0] + 0.2)));

    /**
     * THE REACTION.
     *
     * The smallest thing the page can do and still be understood as an event.
     * It arrives a beat after the tips actually meet, which is what makes it
     * read as a consequence rather than as a label: contact, then signal.
     *
     * It is a square because nothing on this site has a radius, and because
     * the follower's own resting state is the same 8px red square — the page
     * answers the reader in the mark they have been carrying the whole time.
     */
    const c = span(act1, contact[0] + 0.012, contact[1]);
    const shown = ease(Math.min(c * 1.35, 1));
    // A single overshoot, resolved. Not a pulse, not a glow.
    const pop = 1 + Math.sin(Math.min(c, 1) * Math.PI) * 0.45;
    point.current.style.opacity = String(shown);
    point.current.style.transform = `scale(${shown * pop})`;

    // Promoted only while the pop is actually running.
    const popLive = c > 0.001 && c < 0.999;
    if (popLive !== pointPromoted.current) {
      pointPromoted.current = popLive;
      point.current.style.willChange = popLive ? "transform, opacity" : "";
    }
  });

  return (
    <div ref={root} className="cap-layer cap-hands" data-zone="ink">
      <picture>
        <source
          type="image/avif"
          srcSet={`${HAND_HUMAN.avifSm} 1280w, ${HAND_HUMAN.avif} 1672w`}
          sizes="106vw"
        />
        <img
          ref={human}
          className="cap-hand cap-hand-human"
          src={HAND_HUMAN.webp}
          srcSet={`${HAND_HUMAN.webpSm} 1280w, ${HAND_HUMAN.webp} 1672w`}
          sizes="106vw"
          width={HAND_HUMAN.width}
          height={HAND_HUMAN.height}
          alt=""
          decoding="async"
          // Stage 1: 21 KB, and it is the first thing under the paper. A lazy
          // fetch would land its first byte on the frame it is needed.
          fetchPriority="high"
        />
      </picture>

      <picture>
        <source
          type="image/avif"
          srcSet={`${HAND_ROBOT.avifSm} 1280w, ${HAND_ROBOT.avif} 1672w`}
          sizes="106vw"
        />
        <img
          ref={robot}
          className="cap-hand cap-hand-robot"
          src={HAND_ROBOT.webp}
          srcSet={`${HAND_ROBOT.webpSm} 1280w, ${HAND_ROBOT.webp} 1672w`}
          sizes="106vw"
          width={HAND_ROBOT.width}
          height={HAND_ROBOT.height}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
      </picture>

      <div ref={labels} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <span className="cap-hands-label cap-hands-label-human" style={{ opacity: 1 }}>
          <span className="ts-label">HUMAN</span>
          <i className="cap-hands-arrow" />
        </span>
        <span className="cap-hands-label cap-hands-label-machine" style={{ opacity: 1 }}>
          <span className="ts-label">MACHINE</span>
          <i className="cap-hands-arrow" />
        </span>
      </div>

      <span ref={point} className="cap-contact-point" aria-hidden="true" />

      {/* The alt text of the beat, for anyone who is not going to see it. */}
      <p className="sr-only">
        A human hand and a machine hand reach toward each other across an empty
        black frame and meet at a single point.
      </p>
    </div>
  );
}
