import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Statement type that resolves word by word as the section crosses the
 * viewport. Opacity only — no transform — so it stays cheap and never shifts
 * layout. Words tagged in `accent` are held in signal red.
 */
export default function ScrubWords({
  text,
  accent = [],
  className,
  as: Tag = "p",
  from = 0.16,
}) {
  const root = useRef(null);
  const words = String(text).split(" ").filter(Boolean);
  const accentSet = new Set(accent.map((w) => w.toLowerCase()));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const spans = root.current.querySelectorAll("[data-word]");
      gsap.fromTo(
        spans,
        { opacity: from },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.5,
          scrollTrigger: {
            trigger: root.current,
            start: "top 78%",
            end: "bottom 55%",
            scrub: 0.8,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <Tag ref={root} className={cn(className)}>
      {words.map((word, i) => {
        const clean = word.replace(/[^a-z]/gi, "").toLowerCase();
        return (
          <span
            key={i}
            data-word
            className={cn(
              "inline-block",
              accentSet.has(clean) ? "text-signal" : undefined,
            )}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </Tag>
  );
}
