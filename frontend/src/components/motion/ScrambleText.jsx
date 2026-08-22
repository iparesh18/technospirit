import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * System microcopy that decodes itself when it scrolls into view.
 *
 * The technique comes from React Bits `ScrambledText`, but that component is
 * built around a cursor-proximity SplitText field over a paragraph — 200-odd
 * lines to make body copy wobble under the mouse, which is exactly the kind of
 * gimmick this site avoids. What is worth keeping is the plugin: GSAP's
 * ScrambleTextPlugin (free since 3.13) resolving a string character by
 * character reads as a machine acquiring a signal, which is the register the
 * whole `.ts-label` system already speaks in.
 *
 * So this is a small purpose-built component instead: mono labels only, fires
 * once on scroll-in, and under prefers-reduced-motion the text is simply
 * there.
 */
export default function ScrambleText({
  text = "",
  as: Tag = "span",
  className,
  duration = 1.1,
  delay = 0,
  chars = "upperCase",
  start = "top 92%",
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !ref.current) return;

      gsap.from(ref.current, {
        duration,
        delay,
        ease: "none",
        scrambleText: { text, chars, speed: 0.55, revealDelay: 0.15 },
        scrollTrigger: {
          trigger: ref.current,
          start,
          once: true,
        },
      });
    },
    { scope: ref, dependencies: [text] },
  );

  return (
    <Tag ref={ref} className={cn(className)}>
      {text}
    </Tag>
  );
}
