import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Magnetic hover. The child drifts toward the cursor once the cursor is
 * within `padding` of its box, then springs back.
 *
 * Origin: React Bits `Magnet`, installed from the @react-bits shadcn registry.
 * The original called setState on every mousemove (a React re-render per
 * pointer event) and read getBoundingClientRect() on every event as well.
 * This version drives the transform with gsap.quickTo — no re-renders, no
 * layout read per event — and caches the box, invalidating it on scroll,
 * resize and ScrollTrigger refresh. It is also inert under
 * prefers-reduced-motion and on coarse pointers, where a magnet does nothing
 * but add jitter.
 */
export default function Magnet({
  children,
  className,
  innerClassName,
  /** how far outside the box the field reaches, in px */
  padding = 90,
  /** higher = weaker pull */
  strength = 3.2,
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const innerRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner || disabled) return undefined;
    if (prefersReducedMotion()) return undefined;
    if (!window.matchMedia("(pointer: fine)").matches) return undefined;

    const xTo = gsap.quickTo(inner, "x", { duration: 0.55, ease: "expo.out" });
    const yTo = gsap.quickTo(inner, "y", { duration: 0.55, ease: "expo.out" });

    let box = null;
    const measure = () => {
      box = wrap.getBoundingClientRect();
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

    const onMove = (e) => {
      if (!box) return;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      if (Math.abs(dx) < box.width / 2 + padding && Math.abs(dy) < box.height / 2 + padding) {
        xTo(dx / strength);
        yTo(dy / strength);
      } else {
        xTo(0);
        yTo(0);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    ScrollTrigger.addEventListener("refresh", measure);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      ScrollTrigger.removeEventListener("refresh", measure);
      gsap.killTweensOf(inner);
      gsap.set(inner, { x: 0, y: 0 });
    };
  }, [padding, strength, disabled]);

  return (
    <div ref={wrapRef} className={cn("inline-block", className)}>
      <div ref={innerRef} className={cn("will-change-transform", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
