import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Word-level clip-path reveal. Each word rides up out of an overflow-hidden
 * mask, so the type appears to be "printed" line by line rather than faded in.
 *
 * `lines` is an array of strings — one entry per visual line, which keeps the
 * line breaks art-directed instead of left to the browser.
 */
export default function MaskText({
  lines = [],
  as: Tag = "h2",
  className,
  wordClassName,
  stagger = 0.055,
  delay = 0,
  start = "top 88%",
  scrub = false,
  once = true,
}) {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const words = root.current.querySelectorAll(".ts-mask > span");
      if (!words.length) return;

      // Both halves of the Y offset are stated explicitly — yPercent *and* y.
      //
      // The resting state comes from CSS: the rule on
      // '.ts-motion [data-anim="mask"] .ts-mask > *' sets
      // transform: translate3d(0, 108%, 0). By the time GSAP reads that back
      // it is a resolved matrix — the browser has already turned 108% into
      // pixels and thrown the unit away — so GSAP records it as y: 110px with
      // yPercent: 0. Animating yPercent alone then leaves that 110px pixel
      // component untouched: the tween finishes at "yPercent 0 + y 110px",
      // which is still a full line below the mask, so the headline renders as
      // a stack of empty boxes even though the animation reports progress 1.
      //
      // Pinning y to 0 makes the percentage the only thing carrying the word,
      // so the reveal resolves to a true zero whatever GSAP inherited from the
      // stylesheet. Without it the bug is invisible on a hard load (the class
      // that seeds the CSS lands after this hook on the very first mount) and
      // appears on every client-side remount, where the rule is already live.
      gsap.fromTo(
        words,
        { yPercent: 108, y: 0 },
        {
          yPercent: 0,
          y: 0,
          duration: 1.05,
          ease: "expo.out",
          stagger,
          delay,
          scrollTrigger: scrub
            ? { trigger: root.current, start, end: "bottom 60%", scrub: 1 }
            : {
                trigger: root.current,
                start,
                toggleActions: once ? "play none none none" : "play none none reverse",
              },
        },
      );
    },
    { scope: root },
  );

  return (
    <Tag ref={root} data-anim="mask" className={cn(className)}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {String(line)
            .split(" ")
            .map((word, j) => (
              <span key={j} className="ts-mask inline-block">
                <span className={cn("inline-block will-change-transform", wordClassName)}>
                  {word}
                  {j < String(line).split(" ").length - 1 ? " " : ""}
                </span>
              </span>
            ))}
        </span>
      ))}
    </Tag>
  );
}
