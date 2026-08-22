import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";

/**
 * Route change = one continuous wipe pass. A red rule leads, a black panel
 * sweeps up behind it, the scroll position resets under cover, then the panel
 * clears off the top. ~0.9s door to door — long enough to read as intentional,
 * short enough that it never feels like waiting.
 */
export default function RouteTransition() {
  const panel = useRef(null);
  const rule = useRef(null);
  const location = useLocation();
  const { lenis } = useSmoothScroll();
  const first = useRef(true);

  const resetScroll = () => {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  };

  useGSAP(
    () => {
      // no wipe on first paint — the hero has its own entrance
      if (first.current) {
        first.current = false;
        return;
      }

      if (prefersReducedMotion()) {
        resetScroll();
        return;
      }

      const tl = gsap.timeline();
      tl.set(panel.current, { transformOrigin: "bottom center", scaleY: 0, visibility: "visible" })
        .set(rule.current, { scaleX: 0, transformOrigin: "left center" })
        .to(rule.current, { scaleX: 1, duration: 0.34, ease: "power3.inOut" })
        .to(panel.current, { scaleY: 1, duration: 0.42, ease: "power4.inOut" }, "-=0.18")
        .add(resetScroll)
        .set(panel.current, { transformOrigin: "top center" })
        .to(panel.current, { scaleY: 0, duration: 0.5, ease: "power4.inOut" }, "+=0.04")
        .to(rule.current, { scaleX: 0, transformOrigin: "right center", duration: 0.3 }, "-=0.4")
        .set(panel.current, { visibility: "hidden" });
    },
    // revertOnUpdate: without it useGSAP defers cleanup to unmount, and this
    // component never unmounts — every route change left the previous wipe
    // timeline in the context. It also means a navigation fired mid-wipe kills
    // the timeline in flight and restores the panel, instead of two timelines
    // writing to the same element at once.
    { dependencies: [location.pathname], revertOnUpdate: true },
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[110]">
      <div ref={panel} className="absolute inset-0 invisible bg-black" />
      <div
        ref={rule}
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-signal"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
