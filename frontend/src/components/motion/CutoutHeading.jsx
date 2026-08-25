import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * A headline cut out of a picture.
 *
 * Adapted from React Bits' `MaskedHeading`. The idea is the good part: lay the
 * words out as ordinary text, mirror their geometry into an SVG <clipPath>,
 * and show a media layer through it — so the type is a window rather than a
 * fill. Nothing else survived contact with this codebase.
 *
 * What was rewritten, and why each one mattered here:
 *
 * 1. THE WIDTH AXIS. The original copies fontFamily/Size/Weight/Style/
 *    letterSpacing onto the SVG <text> and stops. This site's art direction is
 *    Archivo's `wdth 62..125` axis — `ts-display-tight` runs at 78%. The mask
 *    would have rendered at 100% while the measured layer rendered at 78%, so
 *    the clip sat wider than the words it was supposed to be cut from and the
 *    picture leaked out of every glyph. `font-stretch` and
 *    `font-variation-settings` are now copied too.
 * 2. TEXT-TRANSFORM. `ts-display-tight` uppercases in CSS. SVG <text> does not
 *    reliably inherit that, which is the same misregistration by another
 *    route, so the string is uppercased in JS and both layers get the same
 *    glyphs.
 * 3. THE RAF LOOP. It ran a sine-wave drift forever, on or off screen —
 *    the defect `SignalField` was rewritten to remove. There is no loop now:
 *    parallax is a ScrollTrigger scrub, pointer drift is `gsap.quickTo`, and
 *    both are idle when nothing is happening.
 * 4. `root.style.fontSize = clientWidth * textScale` overwrote the size the
 *    caller set. The size is the caller's; this component only measures it.
 * 5. `mediaType="video"` mounted an autoplaying looping <video>. This page
 *    already owns a video and it is explicitly not allowed to autoplay, so
 *    the media here is a still — and the still is the sequence's own final
 *    frame, which is what makes the handoff continuous.
 * 6. Global `.masked-heading` class names became scoped `ts-cutout-*`.
 */
export default function CutoutHeading({
  lines,
  src,
  className = "",
  parallax = 40,
  drift = 14,
  fillScale = 1.18,
  as: Tag = "h2",
  ...rest
}) {
  const root = useRef(null);
  const measure = useRef(null);
  const media = useRef(null);
  const words = useRef([]);
  const bases = useRef([]);
  const glyphs = useRef([]);

  const clipId = `ts-cutout-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // One flat list of words, but remembering which line each belongs to, so a
  // caller can control the break instead of leaving it to text-wrap.
  const flat = useMemo(() => {
    const out = [];
    lines.forEach((line, li) => {
      String(line)
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => out.push({ word, line: li }));
    });
    return out;
  }, [lines]);

  /**
   * Mirror the laid-out words into the clip path.
   *
   * Every font property that can change a glyph's advance width has to travel
   * with it, or the mask and the measured text disagree and the picture leaks
   * around the letters.
   */
  const sync = useCallback(() => {
    const measureEl = measure.current;
    if (!measureEl) return;
    const cs = window.getComputedStyle(measureEl);

    for (let i = 0; i < flat.length; i += 1) {
      const box = words.current[i];
      const base = bases.current[i];
      const glyph = glyphs.current[i];
      if (!box || !base || !glyph) continue;

      glyph.setAttribute("x", `${box.offsetLeft}`);
      glyph.setAttribute("y", `${base.offsetTop}`);
      glyph.style.fontFamily = cs.fontFamily;
      glyph.style.fontSize = cs.fontSize;
      glyph.style.fontWeight = cs.fontWeight;
      glyph.style.fontStyle = cs.fontStyle;
      glyph.style.letterSpacing = cs.letterSpacing;
      // The two that the original drops, and the whole art direction.
      glyph.style.fontStretch = cs.fontStretch;
      glyph.style.fontVariationSettings = cs.fontVariationSettings;
    }
  }, [flat]);

  useEffect(() => {
    const rootEl = root.current;
    const mediaEl = media.current;
    if (!rootEl || !mediaEl) return undefined;

    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(rootEl);
    // Webfont arrival changes every advance width, so the mask has to be
    // rebuilt after it — the same reason App.jsx refreshes ScrollTrigger on
    // document.fonts.ready.
    document.fonts?.ready?.then(sync).catch(() => {});

    if (prefersReducedMotion()) {
      mediaEl.style.transform = `scale(${fillScale})`;
      return () => ro.disconnect();
    }

    // Held in the same two numbers so parallax and pointer drift compose into
    // one transform write rather than fighting over the property.
    const offset = { x: 0, y: 0 };
    const paint = () => {
      mediaEl.style.transform = `translate3d(${offset.x.toFixed(2)}px, ${offset.y.toFixed(2)}px, 0) scale(${fillScale})`;
    };
    paint();

    const setY = gsap.quickTo(offset, "y", { duration: 0.5, ease: "power3.out", onUpdate: paint });
    const setX = gsap.quickTo(offset, "x", { duration: 0.9, ease: "power3.out", onUpdate: paint });

    // Parallax: the picture behind the words travels slower than the page, so
    // the letters read as a hole in something further away.
    const st = ScrollTrigger.create({
      trigger: rootEl,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => setY((self.progress - 0.5) * parallax),
    });

    // Pointer drift only where there is a real pointer to drift toward.
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)");
    let onMove = null;
    if (fine.matches) {
      onMove = (e) => {
        const box = rootEl.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        setX(((e.clientX - box.left) / box.width - 0.5) * drift * 2);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    return () => {
      ro.disconnect();
      st.kill();
      if (onMove) window.removeEventListener("pointermove", onMove);
      gsap.killTweensOf(offset);
    };
  }, [sync, parallax, drift, fillScale]);

  return (
    <Tag ref={root} className={`ts-cutout ${className}`.trim()} {...rest}>
      {/* The real text. Transparent, but present and in reading order, so the
          heading is a heading to a screen reader and to a crawler — and it is
          what the clip path is measured from, so the two can never drift. */}
      <span ref={measure} className="ts-cutout-measure">
        {flat.map((item, i) => (
          <span key={`${item.word}-${i}`}>
            <span
              ref={(el) => {
                words.current[i] = el;
              }}
              className="ts-cutout-word"
            >
              {item.word}
              <i
                ref={(el) => {
                  bases.current[i] = el;
                }}
                className="ts-cutout-base"
              />
            </span>
            {i < flat.length - 1 && flat[i + 1].line !== item.line ? <br /> : " "}
          </span>
        ))}
      </span>

      <svg className="ts-cutout-defs" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {flat.map((item, i) => (
              <text
                key={`${item.word}-${i}`}
                ref={(el) => {
                  glyphs.current[i] = el;
                }}
              >
                {item.word}
              </text>
            ))}
          </clipPath>
        </defs>
      </svg>

      <span className="ts-cutout-reveal" aria-hidden="true">
        <span className="ts-cutout-clip" style={{ clipPath: `url(#${clipId})` }}>
          <span ref={media} className="ts-cutout-media">
            <img src={src} alt="" draggable={false} className="ts-cutout-src" decoding="async" />
          </span>
        </span>
      </span>
    </Tag>
  );
}
