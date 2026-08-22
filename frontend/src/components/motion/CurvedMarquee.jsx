import { useEffect, useId, useMemo, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * A line of type running along a curve, looping forever, draggable.
 *
 * Origin: React Bits `CurvedLoop`. Its registry entry ships a stylesheet whose
 * first rule is `min-height: 100vh` on the wrapper — on this site that is
 * precisely the empty-screen problem we are removing, so the CSS file was not
 * installed at all and the geometry is owned here. Other changes:
 *
 *  - The original called setOffset() inside its animation frame, i.e. a React
 *    re-render 60 times a second, while also writing the same value straight
 *    to the DOM. The state write is gone; only the attribute is touched.
 *  - Its own requestAnimationFrame loop is replaced by gsap.ticker so it
 *    shares a frame with Lenis and ScrollTrigger.
 *  - It never re-measured on resize, so the loop seam drifted after a
 *    viewport change. A ResizeObserver handles that now.
 *  - Drag had no touch-action, so grabbing the ribbon on a phone ate the
 *    vertical scroll. `touch-action: pan-y` gives the page back.
 *  - Under prefers-reduced-motion it renders as static type, still legible.
 */
export default function CurvedMarquee({
  text = "",
  className,
  textClassName,
  speed = 1.6,
  curve = 110,
  direction = "left",
  interactive = true,
}) {
  const uid = useId().replace(/:/g, "");
  const pathId = `ts-curve-${uid}`;

  const phrase = useMemo(() => `${String(text).replace(/\s+$/, "")} `, [text]);

  const measureRef = useRef(null);
  const textPathRef = useRef(null);
  const jacketRef = useRef(null);
  const [span, setSpan] = useState(0);

  const dragging = useRef(false);
  const lastX = useRef(0);
  const dir = useRef(direction === "right" ? 1 : -1);

  // one phrase width, measured from a hidden copy in the same SVG text context
  useEffect(() => {
    const measure = () => {
      if (!measureRef.current) return;
      const len = measureRef.current.getComputedTextLength();
      if (len > 0) setSpan(len);
    };
    measure();

    const ro = new ResizeObserver(measure);
    if (jacketRef.current) ro.observe(jacketRef.current);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => ro.disconnect();
  }, [phrase, textClassName]);

  const repeats = span ? Math.ceil(1800 / span) + 2 : 1;
  const ribbon = span ? phrase.repeat(repeats) : phrase;
  const ready = span > 0;

  useEffect(() => {
    if (!ready || !textPathRef.current) return undefined;
    const node = textPathRef.current;
    node.setAttribute("startOffset", `${-span}px`);

    if (prefersReducedMotion()) return undefined;

    const wrap = (value) => {
      let v = value;
      if (v <= -span) v += span;
      if (v > 0) v -= span;
      return v;
    };

    const tick = () => {
      if (dragging.current) return;
      const current = parseFloat(node.getAttribute("startOffset")) || 0;
      node.setAttribute("startOffset", `${wrap(current + dir.current * speed)}px`);
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [ready, span, speed]);

  const onPointerDown = (e) => {
    if (!interactive || prefersReducedMotion()) return;
    dragging.current = true;
    lastX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current || !textPathRef.current || !span) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    dir.current = dx > 0 ? 1 : -1;

    const node = textPathRef.current;
    let next = (parseFloat(node.getAttribute("startOffset")) || 0) + dx;
    if (next <= -span) next += span;
    if (next > 0) next -= span;
    node.setAttribute("startOffset", `${next}px`);
  };

  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={jacketRef}
      className={cn(
        "relative w-full touch-pan-y select-none overflow-hidden",
        interactive && "cursor-grab active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      aria-hidden="true"
    >
      {/* The block is sized by the SVG's own aspect ratio rather than a fixed
          pixel height, so the ribbon scales with the viewport and can never be
          cropped. The upstream component used a fixed height with
          preserveAspectRatio="slice", which sheared the tops off the letters
          at every width but one. */}
      <svg
        viewBox="0 0 1440 176"
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full"
        style={{ visibility: ready ? "visible" : "hidden" }}
      >
        <defs>
          <path id={pathId} d={`M-160,88 Q720,${88 + curve} 1600,88`} fill="none" />
        </defs>

        {/* hidden ruler — same class list, so it measures the real type */}
        <text
          ref={measureRef}
          xmlSpace="preserve"
          className={textClassName}
          style={{ visibility: "hidden", pointerEvents: "none" }}
        >
          {phrase}
        </text>

        {ready && (
          <text xmlSpace="preserve" className={textClassName}>
            <textPath ref={textPathRef} href={`#${pathId}`} xmlSpace="preserve">
              {ribbon}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
}
