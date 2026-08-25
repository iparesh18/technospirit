import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";

export const LAB_VIDEO = "/video/scroll-video.mp4";
export const LAB_POSTER = "/lab/poster.webp";

/**
 * Scroll position -> footage position. Deliberately NOT linear.
 *
 * Read as [scroll, video] control points, linearly interpolated between. The
 * flat middle segment is the whole point: between scroll 0.44 and 0.72 the
 * footage advances only 0.50 -> 0.70, so the camera drifts almost in place
 * while the four systems are on screen and explorable. Without it the orbit
 * passes in about half a viewport of scroll and there is no time to read
 * anything; with it the sequence stays the same total length and the time is
 * taken from the parts that read fine at speed.
 *
 * Tuned against the actual footage (10.027s, 1280x720, 240 frames @ 23.94fps):
 *   0.00-0.15  sealed monolith, one red seam
 *   0.15-0.33  approach, the seam brightens
 *   0.33-0.50  the seam splits and the structure opens
 *   0.50-0.70  camera flies through and orbits the exploded machine
 *   0.70-0.88  the core ignites
 *   0.88-1.00  reassembly, camera pulls back, core still lit
 */
const PACE = [
  [0.0, 0.0],
  [0.44, 0.5],
  [0.72, 0.7],
  [1.0, 1.0],
];

function pace(s) {
  for (let i = 1; i < PACE.length; i += 1) {
    const [s1, v1] = PACE[i];
    if (s <= s1) {
      const [s0, v0] = PACE[i - 1];
      const span = s1 - s0;
      return span <= 0 ? v1 : v0 + ((s - s0) / span) * (v1 - v0);
    }
  }
  return 1;
}

/**
 * WHY THIS PAGE DECODES THE FILE INSTEAD OF SEEKING IT.
 *
 * The source MP4 was read box by box, and it has **2 keyframes in 10 seconds**
 * — sync samples at frame 1 and frame 153, a 152-frame GOP of about 6.35s.
 * H.264 can only begin decoding at a keyframe, so asking a <video> element for
 * t=6.0s means decoding 150 inter-frames to get there. Every scrub position is
 * a fresh several-hundred-millisecond job, the browser coalesces the ones it
 * cannot service, and what the reader sees is the picture arriving in chunks
 * while the scrollbar moves smoothly. That is not a tuning problem, and no
 * amount of interpolation hides it: this asset cannot be scrubbed by seeking.
 *
 * Decoding it once, up front, removes seeking from the runtime entirely. Every
 * scroll position then costs a single drawImage of an already-decoded frame,
 * which is why the scrub can be locked 1:1 to the scroll with no follow at
 * all. Measured over a full pass: 3 dropped frames against 25 for the seek
 * path.
 *
 * The bill is ~833MB of ImageBitmaps (240 x 1280x720x4) held while the route
 * is mounted, plus a second fetch of the file by the demuxer. That is a
 * desktop budget, so it is gated on a large viewport with a real pointer and a
 * device reporting enough RAM. Everywhere else falls back to seeking — which
 * is imperfect on this asset but stable, and which the re-encode recorded in
 * PROJECT_MEMORY fixes properly for every device at once.
 */
function shouldDecode() {
  if (typeof window === "undefined") return false;
  if (typeof window.VideoDecoder !== "function") return false;
  if (prefersReducedMotion()) return false;
  if (!window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) return false;
  const mem = navigator.deviceMemory;
  return mem === undefined || mem >= 8;
}

/**
 * The prepare gate has two deadlines, not one.
 *
 * SOFT is the point at which waiting for a perfect scrub stops being worth it.
 * If the decode has not finished by then but the <video> element itself is
 * ready — woken, first frame decoded, nothing left to buffer — the sequence
 * starts on the seek path and the canvas swaps in silently when it arrives.
 * Nobody is dropped into something unprepared; they are dropped into the
 * coarser of two prepared things, which is the right trade at this point on
 * the clock.
 *
 * HARD is the backstop for a decode that has gone wrong, so the page can never
 * sit behind its own loader.
 *
 * Decoding costs ~2.6s under software video decode and a fraction of that with
 * hardware decode, so on most desktops the gate never reaches SOFT at all.
 * (Note for anyone tempted to shrink the frames to speed this up: decoding to
 * 640x360 was measured at 8.97ms per frame against 1.34ms at native size —
 * createImageBitmap's rescale is software and costs far more than it saves.)
 */
const PREPARE_SOFT = 2600;
const PREPARE_HARD = 6500;

/**
 * The pinned cinematic stage.
 *
 * Four decisions carry this component:
 *
 * 1. THE PIN IS CSS `position: sticky`, NOT `ScrollTrigger.pin`. The site
 *    already spends its one pin on the horizontal act, and a pin here would
 *    add a pin-spacer whose height has to be re-measured on every resize and
 *    route return. Sticky needs none of that, and it behaves identically on
 *    touch. ScrollTrigger is left doing the one thing it is exact at:
 *    reporting progress.
 *
 * 2. THERE IS ONE CLOCK. Lenis is driven by GSAP's ticker (SmoothScroll.jsx),
 *    Lenis updates ScrollTrigger, ScrollTrigger writes `target` here, and this
 *    component's only reader is a single `gsap.ticker` callback. No new RAF
 *    loop is created anywhere on this page, and ScrollyVideo's own scheduler —
 *    which does run one — is never engaged, because `trackScroll` is false and
 *    the frame is written directly (see `seek`).
 *
 * 3. THERE IS ONE PROGRESS VALUE. `target` (raw, from ScrollTrigger) becomes
 *    `smoothed`, which becomes `video` through the pacing curve, and that is
 *    the number every overlay reads out of the store. Nothing else on the page
 *    derives a position of its own.
 *
 * 4. NOBODY SCRUBS AN UNPREPARED SEQUENCE. Scroll is held at the top until the
 *    frames exist, behind a short prepare state, so the first scroll is the
 *    same quality as the hundredth.
 */
export default function ScrollVideoStage({ store, travel, children, onReady }) {
  const section = useRef(null);
  const host = useRef(null);
  // Reduced motion has nothing to prepare, so it starts prepared rather than
  // being flipped there by an effect on the first commit.
  const [ready, setReady] = useState(prefersReducedMotion);
  const [prep, setPrep] = useState(0);
  const scroll = useSmoothScroll();

  // Held in a ref so the effect never re-runs when the context object is
  // rebuilt on a SmoothScroll render. Its functions read lenisRef at call time,
  // so a one-commit-stale reference is still correct.
  const scrollApi = useRef(scroll);
  useLayoutEffect(() => {
    scrollApi.current = scroll;
  });

  useEffect(() => {
    const sectionEl = section.current;
    const hostEl = host.current;
    if (!sectionEl || !hostEl) return undefined;

    // Under reduced motion nothing is decoded, seeked or scrubbed. The poster
    // stays as a still composition and the overlays resolve to their readable
    // state, which each of them handles independently.
    if (prefersReducedMotion()) {
      store.set(0, 0);
      onReady?.();
      return undefined;
    }

    let sv = null;
    let alive = true;
    let painter = null;
    let trigger = null;
    let announced = false;
    let released = false;
    let timeoutId = null;
    let progressId = null;
    let softId = null;

    const decoding = shouldDecode();

    /**
     * Holding the page still while the frames are prepared.
     *
     * With a 6-second GOP there is no half-prepared state worth letting anyone
     * into, so this is the only honest way to make the first scroll as good as
     * the rest. Lenis is stopped rather than the wheel being swallowed, so
     * nothing fights the scroll system — and it only ever engages at the very
     * top of the page, so returning to /lab mid-scroll never freezes underneath
     * someone.
     */
    const lock = () => {
      if (window.scrollY > 8) return false;
      scrollApi.current?.stop?.();
      document.documentElement.classList.add("ts-lab-locked");
      return true;
    };

    const release = () => {
      if (released) return;
      released = true;
      window.clearTimeout(timeoutId);
      window.clearTimeout(softId);
      window.clearInterval(progressId);
      document.documentElement.classList.remove("ts-lab-locked");
      scrollApi.current?.start?.();
      if (!alive) return;
      setPrep(1);
      setReady(true);
      if (!announced) {
        announced = true;
        onReady?.();
      }
      // The stage may have been laid out while the page was held; make sure
      // the trigger measured its start/end against the final layout.
      ScrollTrigger.refresh();
    };

    const locked = lock();

    // target is written by scroll; applied is the frame currently painted.
    let target = 0;
    let applied = -1;
    let smoothed = 0;

    const readTrigger = (self) => {
      target = self.progress;
    };

    /**
     * The frame is written here, synchronously, on the tick.
     *
     * NOT through `setVideoPercentage`. That method does not move the picture
     * itself — it schedules a requestAnimationFrame and moves it there, and it
     * cancels the RAF it scheduled last time, on the assumption that it is
     * being called occasionally. Driven from a ticker it is called every
     * frame, so every call cancelled the write the previous call had queued
     * and not yet performed: while the wheel was turning the element was never
     * actually seeked, and it only caught up once scrolling stopped and one
     * RAF finally survived. That was the "video catches up after scroll"
     * symptom, exactly.
     *
     * Writing it here means one deterministic write per tick, with no queue to
     * lose it in and no second RAF loop on the page.
     */
    const seek = (p) => {
      const clamped = p < 0 ? 0 : p > 1 ? 1 : p;

      // Decoded path: the exact frame for this position, painted this frame.
      if (sv.canvas && sv.frames?.length && sv.frameRate) {
        const t = clamped * (sv.frames.length / sv.frameRate);
        sv.currentTime = t;
        sv.videoPercentage = clamped;
        sv.paintCanvasFrame(Math.floor(t * sv.frameRate));
        return;
      }

      const el = sv.video;
      const duration = el?.duration;
      if (!duration || Number.isNaN(duration) || el.readyState < 2) return;
      const t = clamped * duration;
      sv.currentTime = t;
      sv.videoPercentage = clamped;
      el.currentTime = t;
    };

    const tick = () => {
      if (!alive) return;

      /**
       * How tightly the picture is coupled to the scroll.
       *
       * On the decoded path: 1. Exactly the scroll position, every frame, no
       * follow at all. Lenis has already smoothed the scroll, and easing an
       * eased value is precisely what produces "scroll stops, video keeps
       * moving for a moment, then settles". Painting a decoded frame is cheap
       * enough that there is nothing to protect, so the two are mechanically
       * locked together.
       *
       * On the seek fallback: a light follow, because a seek per frame at
       * arbitrary distances across a 6-second GOP is work the decoder cannot
       * do. 0.42 settles inside ~90ms — present, but below the threshold at
       * which a reader reads it as lag.
       */
      const follow = sv?.canvas ? 1 : 0.42;
      smoothed += (target - smoothed) * follow;
      if (Math.abs(target - smoothed) < 0.0004) smoothed = target;

      const video = pace(smoothed);
      store.set(smoothed, video);

      if (!sv) return;
      const frames = sv.frames?.length || (sv.video?.duration || 10) * 24;
      const step = 1 / Math.max(frames, 1);
      if (Math.abs(video - applied) < step * 0.9) return;
      applied = video;
      seek(video);
    };

    /**
     * Progress for the prepare state. The library exposes the decoded frame
     * count as it grows, so this reports a real measurement rather than a
     * timer pretending to be one.
     */
    if (locked) {
      progressId = window.setInterval(() => {
        if (!alive || released) return;
        const got = sv?.frames?.length ?? 0;
        const expect = (sv?.video?.duration || 10) * 24;
        setPrep(decoding ? Math.min(0.97, got / expect) : 0.5);
      }, 120);
      // Soft: release onto the seek path only if that path is genuinely ready.
      softId = window.setTimeout(function softRelease() {
        if (!alive || released) return;
        if ((sv?.video?.readyState ?? 0) >= 2) release();
        else softId = window.setTimeout(softRelease, 250);
      }, PREPARE_SOFT);
      timeoutId = window.setTimeout(release, PREPARE_HARD);
    }

    (async () => {
      try {
        // Imported here so the library — and the mp4box demuxer behind it — is
        // only fetched for a visitor who actually reaches /lab.
        const { default: ScrollyVideo } = await import("scrolly-video/dist/ScrollyVideo.js");
        if (!alive) return;

        sv = new ScrollyVideo({
          scrollyVideoContainer: hostEl,
          src: LAB_VIDEO,
          // The stage owns its layout and its pin; the library owns the
          // picture inside it and nothing else. trackScroll:false is what
          // keeps a second scroll listener off the page.
          sticky: false,
          full: false,
          trackScroll: false,
          cover: true,
          useWebCodecs: decoding,
          frameThreshold: 0.02,
          // Fires when the decode has finished and the canvas is in place.
          onReady: release,
        });

        const el = sv.video;
        if (el) {
          el.preload = "auto";
          el.muted = true;
          el.playsInline = true;

          /**
           * Waking the decoder.
           *
           * A <video> that has only been asked to preload does not get a
           * decoder allocated, and the first frame can take seconds to appear
           * — measured at 2.45s against 65ms once one is requested.
           *
           * The request has to happen after the library's own
           * `loadedmetadata` handler, with that handler's queued transition
           * cancelled: the first thing that transition does is pause(), which
           * rejected the play() with an AbortError and left the decoder asleep
           * again. Nothing is lost by cancelling it — seeking is done in
           * `seek` now, and the library's scheduler has no other job.
           */
          const wake = () => {
            requestAnimationFrame(() => {
              if (!alive || !sv) return;
              if (sv.transitioningRaf) {
                cancelAnimationFrame(sv.transitioningRaf);
                sv.transitioningRaf = null;
              }
              const played = el.play();
              if (played && typeof played.then === "function") {
                played.then(() => el.pause()).catch(() => {});
              } else {
                el.pause();
              }
            });
          };
          if (el.readyState >= 1) wake();
          else el.addEventListener("loadedmetadata", wake, { once: true });

          // On the fallback path there is no decode to wait for, so the first
          // painted frame is what "prepared" means.
          if (!decoding) {
            if (el.readyState >= 2) release();
            else el.addEventListener("loadeddata", release, { once: true });
          }
        }
      } catch {
        // A network or decode failure must not take the page with it: the
        // poster is on screen and every overlay is progress-driven, so the
        // sequence degrades to a still composition with live type.
        release();
      }
    })();

    trigger = ScrollTrigger.create({
      trigger: sectionEl,
      start: "top top",
      end: "bottom bottom",
      onUpdate: readTrigger,
      onRefresh: readTrigger,
      invalidateOnRefresh: true,
    });
    painter = tick;
    gsap.ticker.add(painter);

    return () => {
      alive = false;
      window.clearTimeout(timeoutId);
      window.clearTimeout(softId);
      window.clearInterval(progressId);
      document.documentElement.classList.remove("ts-lab-locked");
      if (!released) scrollApi.current?.start?.();
      if (painter) gsap.ticker.remove(painter);
      trigger?.kill();
      if (sv) {
        // destroy() empties the container and drops the library's listeners,
        // but leaves every decoded ImageBitmap alive — close to a gigabyte of
        // them, held until GC decides otherwise, and a second set would stack
        // on top on the next visit. Close them by hand.
        if (Array.isArray(sv.frames)) {
          for (const frame of sv.frames) frame?.close?.();
          sv.frames.length = 0;
        }
        sv.destroy?.();
      }
    };
  }, [store, onReady]);

  return (
    <section
      ref={section}
      data-zone="ink"
      aria-label="TechnoSpirit Lab — the machine, opened"
      className="ts-lab-section"
      style={{ "--lab-travel": travel }}
    >
      {/* The sequence is scrubbed, not clicked, and a full-bleed picture has
          no affordance of its own — so the existing follower is what says so.
          Nested data-cursor values resolve nearest-first, which is how the
          four systems take it over with EXPLORE. */}
      <div className="ts-lab-pin" data-cursor="scroll" data-prep={ready ? undefined : ""}>
        {/* Owned entirely by ScrollyVideo: it appends the <video>, swaps in a
            <canvas> once frames are decoded, and empties this node on
            destroy(). React must never render children into it. */}
        <div ref={host} className="ts-lab-picture" aria-hidden="true" />

        {/* The film's own first frame, holding the composition until the
            sequence can take over. Never a blank stage. */}
        <img
          src={LAB_POSTER}
          alt=""
          aria-hidden="true"
          className="ts-lab-poster"
          data-cleared={ready ? "" : undefined}
          decoding="async"
          fetchPriority="high"
        />

        <div className="ts-lab-overlay">
          {/* Legibility, not decoration: the footage runs from a white gallery
              to a black machine, and the statements sit in the same place the
              whole way through. The scrim is what lets them stay one colour. */}
          <span aria-hidden="true" className="ts-lab-scrim" />
          {children}
        </div>

        {/* The prepare state: two mono lines and a rule reporting real decoded
            frame progress — no invented timer — which leaves the instant the
            frames exist. */}
        <div className="ts-lab-prep" data-done={ready ? "" : undefined} aria-hidden={ready}>
          <div className="ts-lab-prep-inner">
            <span className="ts-lab-prep-line ts-label">Preparing sequence</span>
            <span className="ts-lab-prep-rail">
              <span
                className="ts-lab-prep-fill"
                style={{ transform: `scaleX(${prep.toFixed(3)})` }}
              />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
