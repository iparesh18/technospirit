import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useStageProgress, span, ease } from "@/components/capabilities/capabilitiesStage";
import usePointerLens from "@/components/capabilities/usePointerLens";
import {
  SNEAKER_RAW,
  SNEAKER_REFINED,
  BEATS,
  CONTACT_FY,
} from "@/components/capabilities/capabilitiesAssets";

/**
 * BEAT 3 + 4 — the aperture, and RAW -> REFINED.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE APERTURE
 *
 * The red point does not cut to a new page; it opens into one that is already
 * there. This whole layer is mounted and painted underneath the hands from the
 * moment the beat before it begins, and the transition is nothing more than
 * how much of it is allowed through — a circle whose centre is exactly the
 * contact point and whose radius runs from zero to the far corner.
 *
 * `clip-path: circle()` was chosen over the alternative (a `border-radius:50%`
 * disc scaled up with a counter-scaled child) after both were built. The disc
 * is pure transform and therefore cheaper on paper, but it has to start at a
 * scale near zero, which means its content starts at a counter-scale in the
 * hundreds — and a browser asked to rasterise a viewport-sized video at 300x
 * either blows up its texture memory or clamps and pops when it corrects. The
 * clip is exact at every radius, including the first one, and Chromium
 * composites a basic-shape clip rather than repainting under it. Measured, it
 * holds 60fps through the whole expansion.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * THE TWO VIDEOS
 *
 * They occupy the same box, not two boxes side by side. RAW is the ground;
 * REFINED sits above it inside the lens window and is *uncovered*, never
 * faded in — a crossfade between two shots of the same object goes to mush in
 * the middle, and the point of this interaction is that the object is being
 * changed, not blended.
 *
 * Both were re-encoded from the same 240-frame, 24fps, 10.006s masters and
 * come out bit-identical in duration, frame count and frame rate, so keeping
 * them together is a matter of not letting them drift rather than of
 * correcting an offset. See `syncCheck` below.
 */

/** One frame at 24fps is 41.7ms. Below half a frame the two are showing the
    same picture and there is nothing to correct. */
const DRIFT_TOLERANCE = 0.02;
/** Past this, the follower has wrapped or stalled rather than drifted, and
    there is no gap to ease across — it is seeked. */
const RESYNC_JUMP = 0.34;
/** How often to compare. Four times a second is far more often than a healthy
    pair actually separates, and it is nothing next to decoding them. */
const SYNC_INTERVAL = 250;

export default function SneakerScene({ active, stage }) {
  const root = useRef(null);
  const stack = useRef(null);
  const rawVideo = useRef(null);
  const refinedVideo = useRef(null);
  const holder = useRef(null);
  const lens = useRef(null);
  const lensInner = useRef(null);
  const lensFrame = useRef(null);
  const fringeR = useRef(null);
  const fringeG = useRef(null);
  const fringeB = useRef(null);
  const wordRaw = useRef(null);
  const wordRefined = useRef(null);
  const note = useRef(null);

  /**
   * Whether the reader has drawn the lens across the object yet. A ref, not
   * state, for the same reason as the opening hint: this is decided inside a
   * pointer frame, and re-rendering from there would tear down the lens that
   * decided it. Nothing in the swap needs React — it is two tweens.
   */
  const refining = useRef(false);
  const reduced = prefersReducedMotion();

  usePointerLens({
    active: active && !reduced,
    lens,
    inner: lensInner,
    frame: lensFrame,
    bounds: root,
    fringe: { r: fringeR, g: fringeG, b: fringeB },
    size: 380,
    // Softer and heavier than the opening lens. That one is a probe; this one
    // is a tool being drawn across a surface, so it trails further, its
    // deformation is gentler, and its rim disperses less — the object under it
    // is the subject here, and the glass should not compete with it.
    options: {
      lag: 0.155,
      stretch: 0.0062,
      maxStretch: 0.2,
      refract: 0.8,
      grow: 0.0016,
      fringeBase: 1.2,
      fringeSpread: 6.5,
      fringeRest: 0.38,
    },
    onEnergy: (e) => {
      if (e < 0.1 || refining.current || reduced) return;
      refining.current = true;
      reveal();
    },
  });

  /* ── the words ────────────────────────────────────────────────────────── */
  // Rest position stated before anything tweens it. GSAP would otherwise read
  // the untransformed element as yPercent 0 and the swap would send REFINED
  // downward out of its mask, in full view, on the first run.
  useLayoutEffect(() => {
    if (wordRefined.current) gsap.set(wordRefined.current, { yPercent: 112, y: 0 });
  }, []);

  /**
   * The answer to the interaction: RAW leaves upward through its mask as
   * REFINED arrives from below — the site's own word-roll, the same grammar
   * the intent list on /contact uses — and the window that reveals the refined
   * object appears with it.
   *
   * It happens once and stays. This is a statement about the object, not a
   * live meter of how much of it is currently covered; a word that flickered
   * back and forth with the pointer would be a readout, and readouts are what
   * this page is trying not to be.
   */
  const reveal = () => {
    gsap
      .timeline({ defaults: { duration: 0.72, ease: "expo.out" } })
      .to(wordRaw.current, { yPercent: -112 }, 0)
      .to(wordRefined.current, { yPercent: 0 }, 0)
      .to(holder.current, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0)
      .to(note.current, { opacity: 1, duration: 0.6 }, 0.22);
  };

  /* ── playback, synchronisation and the offscreen stop ─────────────────── */
  useEffect(() => {
    const raw = rawVideo.current;
    const refined = refinedVideo.current;
    if (!raw || !refined) return undefined;

    if (reduced) {
      // A still composition: one frame of the refined object, and no decoding.
      raw.pause();
      refined.pause();
      return undefined;
    }

    if (!active) {
      // Nothing decodes off screen, and the sync loop stops with it. A reader
      // deep inside the aircraft sequence is not paying for two sneakers.
      raw.pause();
      refined.pause();
      return undefined;
    }

    let cancelled = false;
    const start = async () => {
      try {
        await raw.play();
        await refined.play();
      } catch {
        // Autoplay refusal on a muted inline video is not a real failure mode
        // here, but it must not take the beat down if it happens.
      }
      if (cancelled) return;
      refined.currentTime = raw.currentTime;
    };
    start();

    /**
     * KEEPING THE TWO SHOES ON THE SAME FRAME.
     *
     * Two <video> elements have two independent clocks. Both files were cut
     * from the same 240-frame, 24fps, 10.006s master and come out identical in
     * duration, frame count and rate, so there is no structural reason for them
     * to separate — but a dropped frame, a tab throttle, or the two of them
     * wrapping their loop a few milliseconds apart will do it, and at 24fps the
     * reader sees that immediately: the shoe inside the lens sits at a
     * different angle from the shoe around it.
     *
     * RAW is the master. REFINED is corrected onto it TWO different ways, and
     * which one is used matters:
     *
     *   Small drift (under ~a third of a second) is corrected with
     *   `playbackRate`. Nudging the follower a few percent fast or slow closes
     *   the gap over the next second without ever showing a discontinuity.
     *   Seeking here would be worse than the problem: a seek drops the picture
     *   for a frame or two and lands with its own latency, during which the
     *   master has moved on — so a tight threshold plus seeking produces a
     *   visible stutter and then drifts again anyway.
     *
     *   Large drift is a wrap or a stall, not drift. There is nothing to ease
     *   toward, so it is seeked. The 1s GOP the sneakers were encoded with is
     *   what keeps that seek cheap.
     */
    const syncCheck = () => {
      if (raw.readyState < 2 || refined.readyState < 2) return;
      const drift = refined.currentTime - raw.currentTime;
      const mag = Math.abs(drift);

      if (mag > RESYNC_JUMP) {
        refined.currentTime = raw.currentTime;
        refined.playbackRate = 1;
        return;
      }

      if (mag < DRIFT_TOLERANCE) {
        if (refined.playbackRate !== 1) refined.playbackRate = 1;
        return;
      }

      // Behind -> run fast, ahead -> run slow. Held inside a few percent so the
      // correction is never audible as a change of pace in the rotation.
      const rate = 1 - Math.max(-0.06, Math.min(0.06, drift * 1.6));
      refined.playbackRate = rate;
    };
    const id = window.setInterval(syncCheck, SYNC_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      refined.playbackRate = 1;
      raw.pause();
      refined.pause();
    };
  }, [active, reduced]);

  /* ── the aperture, and the beat's own arrival and exit ────────────────── */
  const box = useRef({ w: 0, h: 0, r: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const cx = w * 0.5;
      const cy = h * CONTACT_FY;
      // Far corner from the contact point — the radius at which the circle has
      // certainly covered every pixel of the stage.
      box.current = {
        w,
        h,
        r: Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)),
      };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useStageProgress(({ act1 }) => {
    const el = root.current;
    if (!el || reduced) return;

    const { circle, sneakerOut } = BEATS.act1;
    const { w, h, r } = box.current;

    const p = span(act1, circle[0], circle[1]);
    // Eased, because a linear radius reads as a mechanical iris. This arrives
    // quickly and finishes slowly, which is how an aperture actually opens.
    const radius = ease(p) * r;
    const cx = w * 0.5;
    const cy = h * CONTACT_FY;

    el.style.clipPath = `circle(${radius.toFixed(1)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px)`;
    // Promoted only while it is actually moving.
    el.style.willChange = p > 0.001 && p < 0.999 ? "clip-path" : "";
    el.style.visibility = p <= 0.001 ? "hidden" : "";

    // The beat hands over to the statement by leaving, not by being cut away.
    const out = span(act1, sneakerOut[0], sneakerOut[1]);
    stack.current.style.opacity = String(1 - out);
  });

  const srcReady = stage >= 2;
  const preload = stage >= 3 ? "auto" : "metadata";

  return (
    <div ref={root} className="cap-layer cap-world" data-zone="ink">
      <div ref={stack} className="cap-sneaker">
        <div className="cap-sneaker-stack">
          {/* RAW — the ground. */}
          <video
            ref={rawVideo}
            className="cap-video"
            src={srcReady ? SNEAKER_RAW.mp4 : undefined}
            poster={SNEAKER_RAW.poster}
            preload={preload}
            muted
            loop
            playsInline
            disablePictureInPicture
            aria-hidden="true"
          />

          {/* REFINED — the same object, above, uncovered by the window. */}
          <div ref={holder} className="cap-refined-holder" aria-hidden="true">
            <div ref={lens} className="cap-refine-lens">
              <div ref={lensInner} className="cap-refine-inner">
                <div ref={lensFrame} className="cap-refine-frame">
                  <video
                    ref={refinedVideo}
                    className="cap-video"
                    src={srcReady ? SNEAKER_REFINED.mp4 : undefined}
                    poster={SNEAKER_REFINED.poster}
                    preload={preload}
                    muted
                    loop
                    playsInline
                    disablePictureInPicture
                  />
                </div>
              </div>

              {/* Same rim as the opening lens — one piece of glass, used twice. */}
              <i ref={fringeR} className="cap-fringe cap-fringe-r" />
              <i ref={fringeG} className="cap-fringe cap-fringe-g" />
              <i ref={fringeB} className="cap-fringe cap-fringe-b" />
            </div>
          </div>
        </div>

        <div className="cap-sneaker-copy">
          <span className="cap-word-swap" aria-hidden="true">
            <span ref={wordRaw} className="ts-display-tight">
              Raw.
            </span>
            <span ref={wordRefined} className="cap-word-refined ts-display-tight">
              Refined.
            </span>
          </span>
          <p ref={note} className="cap-sneaker-note ts-label">
            FUNCTION ISN&rsquo;T ENOUGH.
          </p>
        </div>

        <p className="sr-only">
          The same shoe, twice: an untextured grey model, and the finished
          object in black and signal red. Moving the pointer across the frame
          refines it.
        </p>
      </div>
    </div>
  );
}
