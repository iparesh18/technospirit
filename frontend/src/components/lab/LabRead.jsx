import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useLabProgress } from "./labProgress";

/** The stretch of footage this block owns — the orbit around the opened machine. */
const FROM = 0.5;
const TO = 0.7;

/**
 * Four disciplines. Text, and only text.
 *
 * `note` is one line, in the machine's own register, and it is the only thing
 * that changes besides the type itself. No image, no plate, no reveal: the
 * footage behind this is already the picture, and putting a second picture on
 * top of it was competing with the one thing the page is built around.
 */
const READS = [
  { key: "web", word: "Web Systems", meta: "THE SURFACE", note: "The part a visitor is allowed to touch." },
  { key: "ai", word: "AI Systems", meta: "THE JUDGEMENT", note: "The part that decides what happens next." },
  { key: "auto", word: "Automation", meta: "THE MOVING PARTS", note: "The part that repeats without being asked." },
  { key: "growth", word: "Digital Growth", meta: "THE COMPOUND", note: "The part that is worth more next quarter." },
];

/**
 * INSIDE — the four systems, told in type alone.
 *
 * This replaces a pointer-tracked image plate. That mechanic is already the
 * entire left half of /contact, so running it again here would have made the
 * two pages read as one template with the words swapped; and it was hover
 * first, which on a phone degrades to watching four pictures go past.
 *
 * The mechanic now is the brand's own: **Archivo's width axis**. Nothing on
 * this site is set at a default width — `ts-display-tight` runs at 78%,
 * `ts-display-wide` at 118%, and that range is the art direction. So focus is
 * expressed as width. The live discipline opens out to 116% and full paper
 * white; the other three compress to 68% and step back. One property, four
 * elements, and it reads as the list physically making room for whichever part
 * of the machine the camera is currently inside.
 *
 * Scroll is the input, not an afterthought: progress walks an index down the
 * list, so a phone gets the whole interaction by doing the thing it was
 * already doing. A fine pointer can take the index to a row directly.
 */
export default function LabRead() {
  const root = useRef(null);
  const rows = useRef([]);
  const noteEl = useRef(null);
  const railEl = useRef(null);

  const live = useRef(false);
  const shown = useRef(-1);
  const hovered = useRef(null);
  const api = useRef(null);

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return undefined;

    const reduced = prefersReducedMotion();
    // Rebuilt with the tweens below — refs survive the remount that this
    // effect's cleanup has just torn the tweens out of.
    shown.current = -1;
    live.current = false;

    let noteTween = null;

    api.current = {
      setLive(on) {
        if (live.current === on) return;
        live.current = on;
        rootEl.setAttribute("data-state", on ? "on" : "off");
        if (!on) {
          shown.current = -1;
          for (const el of rows.current) el?.removeAttribute("data-state");
        }
      },

      /** Where the index sits, 0..1 down the list. */
      setAt(v) {
        if (!railEl.current) return;
        railEl.current.style.transform = `translate3d(0, ${(v * 100).toFixed(2)}%, 0)`;
      },

      show(i) {
        if (i === shown.current || i < 0) return;
        shown.current = i;
        for (let n = 0; n < rows.current.length; n += 1) {
          const el = rows.current[n];
          if (!el) continue;
          if (n === i) el.setAttribute("data-state", "active");
          else el.removeAttribute("data-state");
        }

        const note = noteEl.current;
        if (!note) return;
        if (reduced) {
          note.textContent = READS[i].note;
          return;
        }
        // The line resolves rather than swapping. ScrambleTextPlugin is
        // already registered for the site's microcopy and reads as a machine
        // acquiring a signal, which is exactly the register of this moment.
        noteTween?.kill();
        noteTween = gsap.to(note, {
          duration: 0.55,
          ease: "none",
          scrambleText: { text: READS[i].note, chars: "upperCase", speed: 0.6, revealDelay: 0.12 },
        });
      },
    };

    if (reduced) {
      rootEl.setAttribute("data-state", "static");
      live.current = true;
    }

    return () => {
      noteTween?.kill();
      api.current = null;
    };
  }, []);

  useLabProgress((state) => {
    const a = api.current;
    if (!a) return;

    const on = state.video >= FROM - 0.015 && state.video < TO;
    a.setLive(on);
    if (!on) return;

    const t = Math.min(1, Math.max(0, (state.video - FROM) / (TO - FROM)));
    if (hovered.current == null) {
      const i = Math.min(READS.length - 1, Math.floor(t * READS.length));
      a.setAt((i + 0.5) / READS.length);
      a.show(i);
    }
  });

  const enter = (i) => {
    hovered.current = i;
    api.current?.setAt((i + 0.5) / READS.length);
    api.current?.show(i);
  };

  const leave = () => {
    hovered.current = null;
  };

  return (
    <div ref={root} data-state="off" className="ts-read" onPointerLeave={leave}>
      <div className="ts-read-head">
        <span className="ts-label text-signal">04</span>
        <span className="ts-label text-white/55">INSIDE / FOUR SYSTEMS</span>
      </div>

      <div className="ts-read-body">
        {/* The index. A red mark travelling a hairline, the same device as the
            sequence rail in the foot — this is the list's own position. */}
        <div className="ts-read-rail" aria-hidden="true">
          <span ref={railEl} className="ts-read-mark" />
        </div>

        <ul className="ts-read-list">
          {READS.map((r, i) => (
            <li
              key={r.key}
              ref={(el) => {
                rows.current[i] = el;
              }}
              data-cursor="explore"
              className="ts-read-row"
              onPointerEnter={() => enter(i)}
            >
              <span className="ts-read-word">{r.word}</span>
              <span className="ts-label ts-read-meta">{r.meta}</span>
            </li>
          ))}
        </ul>

        <p ref={noteEl} className="ts-read-note ts-label" />
      </div>
    </div>
  );
}
