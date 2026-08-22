import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

// Registered exactly once for the whole app. Every module imports gsap from
// here rather than from "gsap" directly, so plugins are guaranteed present.
gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP);

// House easing — matches --ease-out-expo / --ease-in-out-quint in index.css.
export const EASE = {
  out: "expo.out",
  inOut: "power4.inOut",
  soft: "power2.out",
};

/**
 * True when the user has asked the OS for reduced motion.
 * Read at call time (not cached) so a mid-session OS change is respected.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Splits a string into word-level spans wrapped in overflow-hidden masks.
 * Returns JSX-ready data; the actual elements are rendered by <MaskText />.
 */
export function toWords(text) {
  return String(text).split(" ").filter(Boolean);
}

export { gsap, ScrollTrigger, ScrambleTextPlugin, useGSAP };
