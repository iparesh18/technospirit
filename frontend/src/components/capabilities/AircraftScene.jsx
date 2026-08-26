import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useStageProgress, span, ease } from "@/components/capabilities/capabilitiesStage";
import { AIRCRAFT, BEATS } from "@/components/capabilities/capabilitiesAssets";

/**
 * BEAT 5 — the statement, and the engineering.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * WHY THIS SCRUBS AND /lab COULD NOT
 *
 * /lab has the same shape of problem and solved it at the wrong end. Its
 * source has 2 keyframes in 10 seconds, so a <video> asked for t = 6.0s must
 * decode 150 inter-frames to get there; every scrub position was a fresh
 * several-hundred-millisecond job, the browser coalesced the ones it could not
 * service, and the picture arrived in chunks while the scrollbar moved
 * smoothly. The fix there was to stop seeking altogether: decode all 240
 * frames up front into ~833MB of ImageBitmaps, behind a 2.6-6.5s prepare gate,
 * on devices with 8GB of RAM and WebCodecs — and let everything else fall back
 * to the broken path. PROJECT_MEMORY records that a re-encode would "fix it
 * properly for every device at once", and this is that re-encode.
 *
 * `aircraft.mp4` is ALL-INTRA: 240 keyframes in 240 frames, one per frame.
 * Every seek costs exactly one frame decode, and — this is the part that
 * matters for the brief — a backward seek costs precisely the same as a
 * forward one, because there is no GOP to restart. That buys back the whole
 * WebCodecs path, the 833MB, the prepare gate, and the device gate. There is no
 * decoder here, no canvas, no frame cache and no second fetch: this file just
 * sets `currentTime`.
 *
 * WHAT ALL-INTRA COSTS, and what that cost was originally paid with.
 * It throws away temporal prediction, which on footage of a slowly rotating
 * airframe is most of the compression there is. The first encode paid for that
 * by dropping to CRF 28, and the result measured 38.10 dB PSNR-Y — softer than
 * the source while spending MORE bits than it. The file is now CRF 21 at
 * 42.37 dB and 6.27 MB, and the seek numbers barely moved: median 20 ms
 * against 14 ms, worst case 46 ms against 49 ms, in headless Chromium with no
 * GPU. The full measured table, including the short-GOP encodes that measure
 * better and seek three times slower, is in
 * `scripts/optimize-capabilities-video.mjs`.
 *
 * The larger file is also why `LOAD_STAGES` moved: stage 5 now fires at 0.80
 * of act one rather than 0.90, so the runway before the first frame is needed
 * grew from 180svh to 256svh.
 *
 * WHICH IS WHY THERE IS NO INTERPOLATION.
 * The brief asks for SCROLL = VIDEO, not scroll -> delay -> catch up. Lenis has
 * already smoothed the scroll before ScrollTrigger reports it; easing an eased
 * value a second time is exactly what produces "scrolling stopped, the picture
 * kept going". The target frame is written on the tick it is computed, with a
 * follow of 1, and the picture settles on the frame the scroll settles on.
 * ════════════════════════════════════════════════════════════════════════════
 */

/** Targeting the middle of a frame rather than its boundary. At the edge the
    browser is free to resolve either side; at the centre it cannot. */
const FRAME_CENTRE = 0.5;

/** Progress 0..1 -> the whole frame it lands on. The scrub and the warm-up
    below both go through this, so they can never disagree about where "here"
    is — which is the whole reason the warm-up is allowed to move the playhead
    at all. */
function frameAt(p) {
  const f = Math.round(p * (AIRCRAFT.frames - 1));
  return f < 0 ? 0 : f > AIRCRAFT.frames - 1 ? AIRCRAFT.frames - 1 : f;
}

const CHAPTERS = [
  { at: 0.0, id: "01", label: "COMPLETE" },
  { at: 0.17, id: "02", label: "SEPARATION" },
  { at: 0.4, id: "03", label: "EXPLODED" },
  { at: 0.6, id: "04", label: "CORE" },
  { at: 0.81, id: "05", label: "REASSEMBLY" },
];

export default function AircraftScene({ active, stage, onPrepared }) {
  const root = useRef(null);
  const video = useRef(null);
  const statement = useRef(null);
  const world = useRef(null);
  const chapterId = useRef(null);
  const chapterLabel = useRef(null);
  const railFill = useRef(null);

  const [ready, setReady] = useState(false);
  const reduced = prefersReducedMotion();

  /* ── decoder preparation ──────────────────────────────────────────────── */
  useEffect(() => {
    const el = video.current;
    if (!el || reduced || stage < 5) return undefined;

    let alive = true;

    /**
     * Waking the decoder.
     *
     * A <video> that has only been preloaded has no decoder allocated, and its
     * first frame can take seconds to appear — /lab measured 2.45s against
     * 65ms once one had been requested. A play/pause pair is what allocates
     * it. Nothing is ever seen playing: the pause lands in the same frame.
     */
    const wake = () => {
      if (!alive) return;
      const played = el.play();
      if (played && typeof played.then === "function") {
        played.then(() => el.pause()).catch(() => {});
      } else {
        el.pause();
      }

      /**
       * ...AND WAKING THE SEEK PATH, which is not the same thing.
       *
       * A decoder that has been allocated has still never been asked to jump.
       * The first `currentTime` write on a fresh <video> pays for the demuxer
       * building its index and for the first random-access read against the
       * byte range the browser has actually buffered — and the reader's very
       * first scroll frame in the pinned section is exactly the wrong place to
       * discover that. So the seek path is exercised HERE, out of sight, while
       * the reader is still two beats above: one jump into the middle of the
       * file, one back to the front.
       *
       * It ends parked on frame 0, which is the frame the handoff reveals, and
       * the world layer is still at opacity 0 the whole time, so none of this
       * is ever seen. It is the difference between a first scroll that is
       * already smooth and one that settles.
       */
      const park = () => {
        if (!alive) return;
        // Wherever the reader IS, not frame 0. Normally those are the same
        // thing, because this runs two beats above the aircraft — but a reader
        // who flicks straight down can be inside the scrub before stage 5 has
        // even fired, and a warm-up that yanked the playhead back to the front
        // would be a visible jump in the one place the page cannot have one.
        el.currentTime = (frameAt(target.current) + FRAME_CENTRE) / AIRCRAFT.fps;
      };
      el.addEventListener("seeked", park, { once: true });
      el.currentTime = (Math.floor(AIRCRAFT.frames / 2) + FRAME_CENTRE) / AIRCRAFT.fps;
    };

    const onReady = () => {
      if (!alive) return;
      wake();
      setReady(true);
      onPrepared?.();
    };

    if (el.readyState >= 2) onReady();
    else el.addEventListener("loadeddata", onReady, { once: true });

    return () => {
      alive = false;
      el.removeEventListener("loadeddata", onReady);
    };
  }, [stage, reduced, onPrepared]);

  /* ── the scrub ────────────────────────────────────────────────────────── */
  const applied = useRef(-1);
  const target = useRef(0);

  useStageProgress(({ act2 }) => {
    const el = root.current;
    if (!el || reduced) return;

    const { statement: stmt, handoff, scrub } = BEATS.act2;

    // The statement arrives, holds, and leaves upward as the white world
    // comes up underneath it. No separator, no cut — one dissolve.
    const inP = ease(span(act2, stmt[0], stmt[0] + 0.06));
    const outP = ease(span(act2, handoff[0], handoff[1]));
    statement.current.style.opacity = String(inP * (1 - outP));
    statement.current.style.transform = `translate3d(0, ${-outP * 12}%, 0)`;
    statement.current.style.visibility = inP * (1 - outP) <= 0.001 ? "hidden" : "";

    world.current.style.opacity = String(ease(span(act2, handoff[0], handoff[1] + 0.02)));

    const p = span(act2, scrub[0], scrub[1]);
    target.current = p;

    // Chapter readout. textContent, never setState — this is a scroll frame.
    let chapter = CHAPTERS[0];
    for (const c of CHAPTERS) if (p >= c.at) chapter = c;
    if (chapterId.current.textContent !== chapter.id) {
      chapterId.current.textContent = chapter.id;
      chapterLabel.current.textContent = chapter.label;
    }
    railFill.current.style.transform = `scaleX(${p.toFixed(4)})`;
  });

  /**
   * One writer, on the shared ticker. No RAF loop is created here — Lenis is
   * driven by GSAP's ticker, Lenis updates ScrollTrigger, ScrollTrigger writes
   * `target`, and this reads it. That is the same single clock the rest of the
   * site runs on.
   */
  useEffect(() => {
    const el = video.current;
    if (!el || reduced || !active || !ready) return undefined;

    const tick = () => {
      const frame = frameAt(target.current);
      if (frame === applied.current) return;
      applied.current = frame;
      el.currentTime = (frame + FRAME_CENTRE) / AIRCRAFT.fps;
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active, ready, reduced]);

  /* ── offscreen stop ───────────────────────────────────────────────────── */
  useEffect(() => {
    const el = video.current;
    if (!el) return undefined;
    if (!active) el.pause();
    return undefined;
  }, [active]);

  const src = stage >= 4 ? AIRCRAFT.mp4 : undefined;
  const preload = stage >= 5 ? "auto" : "metadata";

  return (
    <div ref={root} className="cap-layer cap-layer-air">
      {/* The white world, revealed under the statement. */}
      <div
        ref={world}
        className="cap-air"
        data-zone="paper"
        // Reduced motion never runs the progress callback that would raise
        // this, so it starts where it is meant to end: fully visible, showing
        // the poster frame as a still composition.
        style={{ opacity: reduced ? 1 : 0 }}
      >
        <video
          ref={video}
          className="cap-video"
          src={src}
          preload={preload}
          muted
          playsInline
          disablePictureInPicture
          aria-hidden="true"
        />
        <img
          className="cap-air-poster"
          src={AIRCRAFT.poster}
          alt=""
          aria-hidden="true"
          data-cleared={ready ? "" : undefined}
          decoding="async"
        />

        <div className="cap-air-copy">
          <div className="cap-air-chapter ts-label">
            <b ref={chapterId}>01</b>
            <span ref={chapterLabel}>COMPLETE</span>
          </div>
        </div>
        <div className="cap-air-rail" aria-hidden="true">
          <i ref={railFill} />
        </div>

        <p className="sr-only">
          An aircraft, scrubbed by scrolling: it separates into its components,
          the camera passes through the engine core, and it reassembles.
        </p>
      </div>

      {/* The bridge. Dark, so the seam with the sneaker beat above it is
          invisible, and inverted by the white world that replaces it. */}
      <div
        ref={statement}
        className="cap-statement"
        data-zone="ink"
        style={{ opacity: reduced ? 1 : 0 }}
      >
        <div className="cap-statement-inner">
          <h2 className="ts-display-tight">
            Beauty is only <em>the surface.</em>
          </h2>
        </div>
      </div>
    </div>
  );
}
