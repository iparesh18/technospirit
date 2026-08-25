import { useRef } from "react";
import { useLabProgress } from "./labProgress";

/**
 * The instrument rail: what the sequence is, where it is, and how to move it.
 *
 * Everything here is written with `textContent` and a transform. Rendering a
 * percentage through React would be a re-render per frame for two digits —
 * the horizontal act's counter on Home is written the same way, for the same
 * reason.
 */

/**
 * What the sequence is doing right now, named. Same ranges as the statements
 * in <LabBeats>, stated as machine status rather than as a sentence.
 */
const CHAPTERS = [
  [0.15, "SEALED"],
  [0.33, "FIRST LIGHT"],
  [0.5, "OPENING"],
  [0.7, "INSIDE"],
  [0.88, "CORE / LIVE"],
  [1.01, "RESOLVED"],
];

function chapterAt(v) {
  for (const [to, name] of CHAPTERS) if (v < to) return name;
  return "RESOLVED";
}

export default function LabHud() {
  const pct = useRef(null);
  const bar = useRef(null);
  const hint = useRef(null);
  const chapter = useRef(null);

  useLabProgress((state) => {
    const n = Math.round(state.video * 100);
    if (pct.current && pct.current.textContent !== String(n)) {
      pct.current.textContent = String(n).padStart(3, "0");
    }
    if (bar.current) {
      bar.current.style.transform = `scaleX(${state.video})`;
    }
    // The scroll hint is only useful before anyone has scrolled. It goes as
    // soon as the sequence is genuinely under way, and the chapter name takes
    // over the same slot so the rail is never just an empty black band.
    const started = state.scroll > 0.03;
    if (hint.current) hint.current.style.opacity = started ? "0" : "1";
    if (chapter.current) {
      chapter.current.style.opacity = started ? "1" : "0";
      const name = chapterAt(state.video);
      if (chapter.current.textContent !== name) chapter.current.textContent = name;
    }
  });

  return (
    <div className="ts-lab-hud" aria-hidden="true">
      <div className="ts-lab-hud-top">
        <span className="ts-label text-white/55">LAB / SEQUENCE 01</span>
        <span className="ts-label text-white/55">
          <span ref={pct} className="tabular-nums text-signal">
            000
          </span>
          <span className="text-white/30"> / 100</span>
        </span>
      </div>

      <div className="ts-lab-hud-foot">
        <span ref={hint} className="ts-lab-hint ts-label text-white/45">
          SCROLL TO RUN THE SEQUENCE
        </span>
        <span ref={chapter} className="ts-lab-chapter ts-label text-white/55" />
        <span className="ts-lab-foot-right ts-label hidden sm:inline-flex">
          TECHNOSPIRIT / LAB
        </span>
        <div className="ts-lab-rail">
          <span
            ref={bar}
            className="ts-lab-rail-fill"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </div>
  );
}
