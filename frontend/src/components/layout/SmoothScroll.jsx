import { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

const ScrollContext = createContext({
  lenis: null,
  stop: () => {},
  start: () => {},
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(ScrollContext);

/**
 * Lenis <-> ScrollTrigger bridge.
 *
 * Lenis drives the real window scroll position, so ScrollTrigger needs no
 * scrollerProxy — it only needs to be told to update on every Lenis frame,
 * and Lenis needs to be driven by GSAP's ticker so the two never run on
 * separate RAF loops (which is what causes pinned-section jitter).
 *
 * When prefers-reduced-motion is set, Lenis is never instantiated: the page
 * falls back to plain native scrolling and ScrollTrigger works as normal.
 */
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null);
  const [, setReady] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // Native scroll only. The "ts-motion" flag is owned by main.jsx, so the
      // entrance resting states are already armed either way.
      ScrollTrigger.refresh();
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.05,          // premium, not sluggish
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      syncTouch: false,        // native momentum on touch — do not fight the OS
      autoRaf: false,          // GSAP's ticker owns the loop instead
    });

    lenisRef.current = lenis;

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    setReady(true);
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onLenisScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const value = {
    lenis: lenisRef.current,
    stop: () => lenisRef.current?.stop(),
    start: () => lenisRef.current?.start(),
    scrollTo: (target, options) => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { offset: -80, duration: 1.2, ...options });
      } else if (typeof target === "string") {
        document.querySelector(target)?.scrollIntoView({ behavior: "auto", block: "start" });
      } else if (typeof target === "number") {
        window.scrollTo(0, target);
      }
    },
  };

  return <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>;
}
