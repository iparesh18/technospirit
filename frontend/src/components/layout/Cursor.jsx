import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const LABELS = {
  open: "OPEN",
  start: "START",
  explore: "EXPLORE",
  drag: "DRAG",
};

/**
 * Capsule microcopy, keyed by `data-cursor-capsule`. One short line each —
 * what the stage *means*, never the word itself echoed back.
 */
const CAPSULES = {
  build: "IDEA → INTERFACE",
  automate: "IT RUNS WITHOUT YOU",
  scale: "BUILT TO OUTGROW",
};

/**
 * The follower is ONE fixed box of constant size, and every state — the idle
 * square, the interactive square, the labelled disc, the capsule — is just a
 * different `clip-path` window onto it.
 *
 * Sizing by clip instead of by width/height keeps this off the layout path:
 * the box never resizes, so nothing reflows, and the corner radius rides in
 * the same value as the shape, which is what makes square → capsule a single
 * continuous move rather than two animations fighting. It also leaves
 * `scaleX/scaleY/rotation` free for the velocity lean, which the old
 * scale-based sizing had occupied.
 */
const BOX_W = 340;
const BOX_H = 96;

/** Square window sizes for the three pre-existing states. */
const DISC = { idle: 30, interactive: 58, labelled: 96 };

const CAP_H = 54;
const CAP_PAD = 26; // per side, around the measured copy
const CAP_MAX = BOX_W - 24; // never let a long line reach the box edge

/** Hairline that separates the capsule from the black hero type. Invisible
    on white paper; only reads where the capsule crosses a glyph. */
const CAP_RING = 1.5;

const SIGNAL = "#ff2d16";
const INK = "#000000";

/** `inset()` window of w x h, centred in the box, with radius r. */
function clipFor(w, h, r) {
  const y = (BOX_H - h) / 2;
  const x = (BOX_W - w) / 2;
  return `inset(${y}px ${x}px ${y}px ${x}px round ${r}px)`;
}

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/**
 * Desktop cursor: a small red signal dot that expands into a labelled disc
 * over interactive elements, and morphs into a black capsule of microcopy over
 * the hero's BUILD / AUTOMATE / SCALE. Never rendered on touch/coarse pointers
 * or under prefers-reduced-motion, and never large enough to obscure what it
 * points at.
 */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const face = useRef(null);
  const labelWrap = useRef(null);
  const copy = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState(null);

  // only enable for a real fine pointer that can hover
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const update = () => setEnabled(fine.matches && !prefersReducedMotion());
    update();
    fine.addEventListener("change", update);
    return () => fine.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const dotEl = dot.current;
    const ringEl = ring.current;
    const faceEl = face.current;
    const labelEl = labelWrap.current;
    const copyEl = copy.current;
    if (!dotEl || !ringEl || !faceEl || !copyEl) return undefined;

    gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50, opacity: 0 });
    gsap.set(ringEl, { rotation: 0, scaleX: 1, scaleY: 1 });
    gsap.set(faceEl, { backgroundColor: SIGNAL });
    gsap.set(copyEl, { yPercent: 110 });

    /**
     * The shape is held as three plain numbers and written to `clip-path` on
     * each update, rather than tweened as a clip-path string.
     *
     * Tweening the string is what made the follower pulse. The browser reports
     * the computed value in its shortest form — `inset(33px 155px)` for the
     * idle square, `inset(21px 84.5px round 27px)` for the capsule — while the
     * target is always the full four-sides-plus-round form. GSAP interpolates
     * a complex string by pairing its numbers positionally, so a two-number
     * start against a five-number end has nothing stable to pair up, and each
     * restart resolved to a different set of intermediates.
     */
    const shape = { w: DISC.idle, h: DISC.idle, r: 0, o: 0 };
    const paint = () => {
      // The plate's window is the face's, grown by the hairline. At o = 0 the
      // two coincide exactly, so the squares stay edge-to-edge red and the
      // pre-existing follower is visually untouched.
      const o = shape.o;
      ringEl.style.clipPath = clipFor(shape.w + o * 2, shape.h + o * 2, shape.r + o);
      faceEl.style.clipPath = clipFor(shape.w, shape.h, shape.r);
    };
    paint();

    const dotX = gsap.quickTo(dotEl, "x", { duration: 0.12, ease: "power3.out" });
    const dotY = gsap.quickTo(dotEl, "y", { duration: 0.12, ease: "power3.out" });
    const ringX = gsap.quickTo(ringEl, "x", { duration: 0.55, ease: "power3.out" });
    const ringY = gsap.quickTo(ringEl, "y", { duration: 0.55, ease: "power3.out" });

    // Velocity lean. Separate setters so the shape and the lean never write
    // the same property.
    const leanRot = gsap.quickTo(ringEl, "rotation", { duration: 0.5, ease: "power2.out" });
    const leanX = gsap.quickTo(ringEl, "scaleX", { duration: 0.5, ease: "power2.out" });
    const leanY = gsap.quickTo(ringEl, "scaleY", { duration: 0.5, ease: "power2.out" });

    /**
     * Copy widths are measured once per key and cached. The box is far wider
     * than any line and the span is `nowrap`, so offsetWidth is the natural
     * text width and the read never fights a constrained flex item.
     */
    const widths = new Map();
    const measure = (key) => {
      if (widths.has(key)) return widths.get(key);
      const prev = copyEl.textContent;
      copyEl.textContent = CAPSULES[key];
      const w = Math.min(Math.ceil(copyEl.offsetWidth) + CAP_PAD * 2, CAP_MAX);
      copyEl.textContent = prev;
      widths.set(key, w);
      return w;
    };

    let visible = false;
    let inCapsule = false;
    let vx = 0;
    let lastX = null;
    let lastT = 0;
    let idle = null;
    let copyTl = null;

    /**
     * What the follower is currently showing. `pointerover` bubbles and fires
     * on every element boundary the pointer crosses — including elements that
     * slide under a *stationary* pointer, which the hero's running marquee
     * does continuously. Re-running the morph on each of those was the other
     * half of the pulsing. Nothing animates now unless the state the pointer
     * is over actually changed.
     */
    let state = "idle";

    const morph = (w, h, r, o, duration, ease) =>
      gsap.to(shape, { w, h, r, o, duration, ease, overwrite: true, onUpdate: paint });

    /**
     * The lean is written from pointermove, so when the pointer stops it stops
     * being written — and the capsule would sit there permanently skewed at
     * whatever velocity it last saw. Straightening it needs its own trigger: a
     * short idle timeout, which the quickTo setters then ease out over their
     * own 0.5s. Further movement re-arms it before it fires.
     */
    const relax = () => {
      vx = 0;
      leanRot(0);
      leanX(1);
      leanY(1);
    };

    const onMove = (e) => {
      if (!visible) {
        visible = true;
        gsap.to([dotEl, ringEl], { opacity: 1, duration: 0.3, overwrite: "auto" });
      }

      // smoothed horizontal velocity, in px per 60fps frame
      const t = e.timeStamp || performance.now();
      if (lastX !== null) {
        const dt = clamp(t - lastT, 8, 64);
        vx += (((e.clientX - lastX) / dt) * 16.67 - vx) * 0.18;
      }
      lastX = e.clientX;
      lastT = t;

      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);

      if (inCapsule) {
        leanRot(clamp(vx * 0.13, -7, 7));
        leanX(1 + Math.min(Math.abs(vx) * 0.0016, 0.07));
        leanY(1 - Math.min(Math.abs(vx) * 0.0011, 0.045));
        clearTimeout(idle);
        idle = setTimeout(relax, 90);
      }
    };

    /** square states: idle / interactive / labelled */
    const toDisc = (size, withLabel) => {
      inCapsule = false;
      relax(); // a square has no lean to carry
      copyTl?.kill();
      copyTl = null;

      morph(size, size, 0, 0, 0.45, "expo.out");
      gsap.to(faceEl, {
        backgroundColor: SIGNAL,
        duration: 0.45,
        ease: "expo.out",
        overwrite: "auto",
      });
      gsap.to(copyEl, { yPercent: 110, duration: 0.3, ease: "expo.out", overwrite: "auto" });
      gsap.to(labelEl, {
        opacity: withLabel ? 1 : 0,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(dotEl, { opacity: withLabel ? 0 : 1, duration: 0.2, overwrite: "auto" });
    };

    /** capsule state, sized to its own copy */
    const toCapsule = (key, swapping) => {
      inCapsule = true;
      const w = measure(key);

      // a touch of overshoot so the capsule arrives with weight rather than
      // easing politely into place — bounce stays inside the 0.1–0.3 band
      morph(
        w,
        CAP_H,
        CAP_H / 2,
        CAP_RING,
        swapping ? 0.42 : 0.55,
        swapping ? "expo.out" : "back.out(1.3)",
      );
      gsap.to(faceEl, { backgroundColor: INK, duration: 0.4, ease: "expo.out", overwrite: "auto" });
      gsap.to(labelEl, { opacity: 0, duration: 0.15, overwrite: "auto" });
      gsap.to(dotEl, { opacity: 0, duration: 0.2, overwrite: "auto" });

      /**
       * Masked reveal, the same move the hero words and the nav rows make.
       * A swap sends the old line up and out, so the new one still rises from
       * below and the copy reads as a conveyor rather than a string mutating
       * in place.
       *
       * The handle is not optional. `overwrite` is a tween option and is
       * ignored on a timeline, so without killing the previous one by hand the
       * timelines stack — and because the swap path schedules its .call() at
       * 0.16s while a fresh entry schedules at 0, a pending swap can land its
       * textContent *after* a later entry has already set its own. Bouncing
       * word → word → off-word → word at ~40ms reproduced exactly that: the
       * capsule sat on AUTOMATE showing BUILD's line.
       */
      copyTl?.kill();
      const tl = gsap.timeline();
      copyTl = tl;
      if (swapping) {
        tl.to(copyEl, { yPercent: -110, duration: 0.16, ease: "power2.out" });
      }
      tl.call(() => {
        copyEl.textContent = CAPSULES[key];
      })
        .set(copyEl, { yPercent: 110 })
        .to(
          copyEl,
          // snappier on a swap: moving between the words is browsing, and the
          // system should keep up rather than make the reader wait it out
          { yPercent: 0, duration: swapping ? 0.42 : 0.6, ease: "expo.out" },
          swapping ? undefined : 0.1,
        );
    };

    const onOver = (e) => {
      const el = e.target instanceof Element ? e.target : null;

      const key = el?.closest("[data-cursor-capsule]")?.getAttribute("data-cursor-capsule");
      if (key && CAPSULES[key]) {
        const next = `cap:${key}`;
        if (state === next) return;
        const swapping = state.startsWith("cap:");
        state = next;
        setLabel(null);
        toCapsule(key, swapping);
        return;
      }

      const labelKey = el?.closest("[data-cursor]")?.getAttribute("data-cursor");
      const interactive = el?.closest("a, button, [role='button']");
      const next = labelKey ? `label:${labelKey}` : interactive ? "interactive" : "idle";
      if (state === next) return;
      state = next;

      setLabel(labelKey ? LABELS[labelKey] ?? null : null);
      toDisc(labelKey ? DISC.labelled : interactive ? DISC.interactive : DISC.idle, !!labelKey);
    };

    const onLeave = () => {
      visible = false;
      lastX = null;
      clearTimeout(idle);
      relax();
      gsap.to([dotEl, ringEl], { opacity: 0, duration: 0.25, overwrite: "auto" });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      clearTimeout(idle);
      copyTl?.kill();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf([dotEl, ringEl, faceEl, labelEl, copyEl, shape]);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] hidden lg:block">
      <div ref={dot} className="fixed top-0 left-0 size-2 bg-signal" />
      {/* Two stacked plates. The outer is paper-white and its window is the
          inner's grown by the hairline, so the white only ever shows as a rim
          — which disappears against the paper and reads only where the capsule
          crosses the black headline. That keeps the type at full strength
          while still giving the capsule an edge to sit on. */}
      <div
        ref={ring}
        style={{ width: BOX_W, height: BOX_H }}
        className="fixed top-0 left-0 bg-paper will-change-[clip-path,transform]"
      >
        <div
          ref={face}
          className="absolute inset-0 flex items-center justify-center bg-signal will-change-[clip-path]"
        >
          <span ref={labelWrap} className="ts-label absolute text-[0.6rem] text-white">
            {label}
          </span>
          {/* The copy is hidden purely by riding below its own mask — no second
              opacity layer, which is what let a stale fade race the reveal and
              land the capsule on screen empty. */}
          <span className="ts-mask shrink-0">
            <span ref={copy} className="ts-label block whitespace-nowrap text-[0.6rem] text-white" />
          </span>
        </div>
      </div>
    </div>
  );
}
