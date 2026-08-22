import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Subtle/Standard-tier entrance. Small offsets only (8–24px) so it reads as a
 * fade rather than a slide, per the motion spec. Children stagger, capped at
 * 8 items before the tail starts to feel laggy.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  className,
  y = 20,
  stagger = 0.07,
  delay = 0,
  duration = 0.7,
  start = "top 88%",
  staggerChildren = false,
}) {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const targets = staggerChildren
        ? Array.from(root.current.children).slice(0, 10)
        : root.current;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: "power2.out",
          stagger: staggerChildren ? stagger : 0,
          scrollTrigger: {
            trigger: root.current,
            start,
            toggleActions: "play none none none",
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <Tag ref={root} className={cn(className)}>
      {children}
    </Tag>
  );
}
