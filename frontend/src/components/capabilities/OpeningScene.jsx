import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useStageProgress, span } from "@/components/capabilities/capabilitiesStage";
import usePointerLens from "@/components/capabilities/usePointerLens";
import ImageTrail from "@/components/capabilities/ImageTrail";
import { REVEAL_BG, BEATS } from "@/components/capabilities/capabilitiesAssets";

/**
 * BEAT 1 — the opening.
 *
 * One word on white paper, and nothing else moving. The brief for this beat is
 * restraint: it has to feel almost uncomfortably plain for a moment, so that
 * the first pointer movement lands as a discovery rather than as the next
 * thing in a queue of effects.
 *
 * Behind the paper is the reveal image, and the window that opens onto it
 * carries a dispersing rim — three colour rings that separate along the
 * direction of travel, the way light splits at the edge of real glass. At rest
 * they settle into three clean concentric lines; in motion they pull apart and
 * the boundary reads as disturbed. It is the one ornamental thing in the beat,
 * and it is on the one element whose whole job is to be looked through.
 *
 * The word itself is white type in `difference`, so the paper renders it black
 * and the lens renders it white wherever it passes underneath. One blend
 * layer, no duplicated element, and nothing to keep in sync with the pointer.
 */
export default function OpeningScene({ active }) {
  const root = useRef(null);
  const lens = useRef(null);
  const lensInner = useRef(null);
  const lensFrame = useRef(null);
  const wakeLens = useRef(null);
  const wakeInner = useRef(null);
  const wakeFrame = useRef(null);
  const fringeR = useRef(null);
  const fringeG = useRef(null);
  const fringeB = useRef(null);
  const hint = useRef(null);
  const title = useRef(null);

  /**
   * The hint retires the first time the reader moves fast enough to have
   * actually found the lens — and it does so WITHOUT React.
   *
   * This started as `useState`, which was wrong twice over. It re-rendered the
   * scene from inside a pointer frame, which is the one thing this codebase
   * has a standing rule against; and because the re-render changed the props
   * <usePointerLens> was keyed on, the state change tore down the very
   * interaction that produced it. A ref and one tween do the whole job, and
   * the render never happens.
   */
  const found = useRef(false);

  const reduced = prefersReducedMotion();
  const lensLive = active && !reduced;

  usePointerLens({
    active: lensLive,
    lens,
    inner: lensInner,
    frame: lensFrame,
    wake: { lens: wakeLens, inner: wakeInner, frame: wakeFrame },
    fringe: { r: fringeR, g: fringeG, b: fringeB },
    size: 300,
    wakeSize: 190,
    onEnergy: (e) => {
      if (e < 0.12 || found.current) return;
      found.current = true;
      gsap.to(hint.current, { opacity: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });
    },
  });

  // Offered a beat late, so the plain composition gets its moment first, and
  // withdrawn the instant it has been acted on.
  useEffect(() => {
    if (reduced || !hint.current) return undefined;
    const tw = gsap.to(hint.current, {
      opacity: 1,
      duration: 0.9,
      delay: 1.1,
      ease: "power2.out",
      overwrite: "auto",
    });
    return () => tw.kill();
  }, [reduced]);

  /**
   * The beat retires itself. Opacity is the only property touched, and the
   * promotion hint goes with it — a paper layer that is no longer on screen
   * has no business holding a compositor layer while the reader is three beats
   * further down the page.
   */
  useStageProgress(({ act1 }) => {
    const el = root.current;
    if (!el || reduced) return;
    const out = 1 - span(act1, BEATS.act1.openOut[0], BEATS.act1.openOut[1]);
    el.style.opacity = String(out);
    el.style.willChange = out > 0 && out < 1 ? "opacity" : "";
    el.style.visibility = out <= 0.001 ? "hidden" : "";
  });

  return (
    <div ref={root} className="cap-layer cap-open" data-zone="paper">
      {/* The intent trail. Under the lens and under the type, on top of the
          rules — see the layer table in capabilities.css. It takes the same
          `active` flag the lens does, so the two arrive and retire together and
          neither one is running while the beat is off screen. */}
      <ImageTrail active={lensLive} quietRef={title} />

      {/* The window, and its wake. Both are pure transform every frame — see
          usePointerLens for why this is not a clip-path. */}
      <div ref={wakeLens} className="cap-lens cap-lens-wake" aria-hidden="true">
        <div ref={wakeInner} className="cap-lens-inner">
          <img
            ref={wakeFrame}
            className="cap-lens-img"
            src={REVEAL_BG.avif}
            alt=""
            decoding="async"
          />
        </div>
      </div>

      <div ref={lens} className="cap-lens" aria-hidden="true">
        <div ref={lensInner} className="cap-lens-inner">
          <img
            ref={lensFrame}
            className="cap-lens-img"
            src={REVEAL_BG.avif}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </div>

        {/* The rim. Outside .cap-lens-inner deliberately — see usePointerLens. */}
        <i ref={fringeR} className="cap-fringe cap-fringe-r" />
        <i ref={fringeG} className="cap-fringe cap-fringe-g" />
        <i ref={fringeB} className="cap-fringe cap-fringe-b" />
      </div>

      <div className="cap-open-rules" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <i key={i} />
        ))}
      </div>

      <div className="cap-open-frame">
        <h1 ref={title} className="cap-open-title ts-display-tight">
          Capabilities
        </h1>

        <div className="cap-open-sub" aria-hidden="true">
          <span className="ts-label">HUMAN INTENT</span>
          <span className="ts-label">MACHINE PRECISION</span>
          <span className="ts-label">ONE SYSTEM</span>
        </div>
      </div>

      <span ref={hint} className="cap-open-hint ts-label" style={{ opacity: 0 }}>
        MOVE TO LOOK THROUGH
      </span>
    </div>
  );
}
