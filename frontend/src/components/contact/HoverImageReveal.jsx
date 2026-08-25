import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { SystemLabel } from "@/components/ui/SystemLabel";

/**
 * The left half: five words, and one image plate riding the pointer.
 *
 * Two moves, and only two. Hovering a word rolls it up and puts an identical
 * copy in its place while the other four step back; the plate follows the
 * pointer and the images inside it slide as a reel — everything above the
 * hovered index sits at -100%, everything below at 100%, the hovered one at 0.
 * Nothing here is a control. This side browses; the form on the right is what
 * gets sent.
 *
 * Contract:
 *   items  [{ key, word, src }]  — src is a path under /public
 *
 * HOVER is React state: it changes once per row, not once per frame. POSITION
 * never touches React — every pointer frame is written straight to the
 * transform with gsap.quickTo, the same way <Magnet> and <Cursor> do it, so
 * moving across five rows and a live form re-renders nothing.
 */

/** Gap held between the pointer and the plate's leading edge. */
const CLEAR_X = 44;
/** How close to the stage's side the plate's box is allowed to travel. */
const EDGE_PAD = 12;
/**
 * How much of its own height the plate may hang below the list, as a share of
 * that height. Held to the stage exactly it could only travel ~120px across
 * five rows and stopped reading as attached to the pointer; held to nothing it
 * gets cut in half by the section's own overflow clip. It is allowed to hang
 * downward only — above the list is the header rail and then the headline,
 * and a plate crossing those reads as a layer that escaped rather than one
 * that belongs to the words.
 */
const OVERHANG = 0.45;

export default function HoverImageReveal({ items }) {
  const stage = useRef(null);
  const plate = useRef(null);
  const [hovered, setHovered] = useState(null);

  /* ── pointer tracking ──────────────────────────────────────────────── */
  useEffect(() => {
    const el = plate.current;
    const host = stage.current;
    if (!el || !host) return undefined;

    // Reduced motion gets no tracking at all: the plate is parked by CSS and
    // the reveal becomes a plain opacity change. Everything still happens, it
    // just stops chasing anything.
    if (prefersReducedMotion()) return undefined;

    // Overdamped on purpose — the plate trails the pointer rather than being
    // welded to it, which is what makes it read as a separate object.
    const xTo = gsap.quickTo(el, "x", { duration: 1, ease: "power2.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 1, ease: "power2.out" });

    /** Stage box, cached. Reading it per pointermove is a layout read per
        event — the exact mistake <Magnet> was rewritten to remove. */
    let box = null;
    let half = { w: 0, h: 0 };
    const measure = () => {
      box = host.getBoundingClientRect();
      half = { w: el.offsetWidth / 2, h: el.offsetHeight / 2 };
    };
    measure();

    let queued = false;
    const invalidate = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        measure();
      });
    };

    const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

    /**
     * The plate hangs off the pointer's right shoulder, vertically centred on
     * it. Sitting under the cursor it would cover the word being read, which
     * is the one thing this interaction exists to show.
     *
     * The clamp is the single departure from a plain offset: this stage is a
     * grid column, not a full-bleed panel, so an unclamped plate would spill
     * over the seam and land on top of the form.
     */
    const target = (clientX, clientY) => {
      if (!box) return null;
      return {
        x: clamp(
          clientX - box.left + half.w + CLEAR_X,
          half.w + EDGE_PAD,
          box.width - half.w - EDGE_PAD,
        ),
        y: clamp(
          clientY - box.top,
          half.h,
          box.height - half.h + half.h * 2 * OVERHANG,
        ),
      };
    };

    // The first frame is placed, not tweened. It happens while the plate is
    // still invisible — the pointer has to cross the stage to reach a word —
    // so easing it in from the corner buys a diagonal flight nobody sees.
    let placed = false;

    const onMove = (e) => {
      const p = target(e.clientX, e.clientY);
      if (!p) return;
      if (!placed) {
        placed = true;
        gsap.set(el, { x: p.x, y: p.y });
        return;
      }
      xTo(p.x);
      yTo(p.y);
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    ScrollTrigger.addEventListener("refresh", measure);

    return () => {
      host.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      ScrollTrigger.removeEventListener("refresh", measure);
      gsap.killTweensOf(el);
    };
  }, []);

  /**
   * Rows are contiguous — the spacing between the words is padding inside each
   * row, not a gap between them — so sliding straight down from BUILD to
   * AUTOMATE never passes through nothing. But pointerleave and pointerenter
   * are still two separate native events, and clearing on the first would
   * collapse the reel for one frame between every pair of words. So the clear
   * is deferred a frame and the enter cancels it.
   */
  const pending = useRef(0);
  useEffect(() => () => cancelAnimationFrame(pending.current), []);

  const enter = (i) => {
    cancelAnimationFrame(pending.current);
    setHovered(i);
  };

  const leave = () => {
    cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => setHovered(null));
  };

  /**
   * The reel. Every image is mounted once and parked; only its Y changes, so a
   * swap is two images sliding past each other rather than a fade — a
   * crossfade between two high-contrast plates goes grey in the middle.
   */
  const railY = (i) => {
    if (hovered == null) return "100%";
    if (i < hovered) return "-100%";
    if (i > hovered) return "100%";
    return "0%";
  };

  return (
    <div
      ref={stage}
      // The one place on the page where the follower gets out of the way: the
      // plate is what is attached to the pointer here, and a labelled disc
      // riding on top of it would be a second cursor competing with the first.
      data-cursor-mute=""
      className="ts-intent-stage relative"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-4">
        <SystemLabel className="text-ink">I WANT TO —</SystemLabel>
        <SystemLabel className="hidden text-ash sm:inline-flex">
          {String(items.length).padStart(2, "0")} WAYS IN
        </SystemLabel>
      </div>

      <div
        ref={plate}
        aria-hidden="true"
        data-active={hovered != null ? "" : undefined}
        className="ts-intent-plate"
      >
        {items.map((item, i) => (
          <div
            key={item.key}
            className="ts-intent-cell"
            style={{ transform: `translate3d(0, ${railY(i)}, 0)` }}
          >
            <img
              src={item.src}
              alt=""
              width="800"
              height="1000"
              decoding="async"
              // Five plates, all small. Eager is correct here: a lazy fetch
              // would land its first byte on the first hover, which is exactly
              // the frame that has to be perfect.
              fetchPriority="low"
              className="ts-intent-img"
            />
          </div>
        ))}
      </div>

      {/* The boundary is the word itself: leave the type and the plate goes,
          whether that is off the bottom of the list or sideways into the empty
          half of the column. The list-level leave is only a backstop for a
          pointer that jumps the stage in one frame. */}
      <ul className="ts-intent-list" onPointerLeave={leave}>
        {items.map((item, i) => (
          <li
            key={item.key}
            className="ts-intent-item"
            data-state={hovered === i ? "active" : undefined}
          >
            <div
              className="ts-intent-row"
              onPointerEnter={() => enter(i)}
              onPointerLeave={leave}
            >
              <span className="ts-mask ts-intent-linemask">
                {/* Two nested transforms, deliberately on two elements: the
                    entrance timeline owns this one (yPercent), the roll owns
                    the one inside it (CSS). One element carrying both would be
                    GSAP and a CSS transition writing the same property. */}
                <span data-c-rowword className="ts-intent-lift">
                  <span className="ts-intent-roll">
                    <span className="ts-intent-word">{item.word}</span>
                    <span className="ts-intent-word ts-intent-ghost" aria-hidden="true">
                      {item.word}
                    </span>
                  </span>
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
