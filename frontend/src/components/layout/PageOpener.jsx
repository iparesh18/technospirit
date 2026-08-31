import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { SystemLabel } from "@/components/ui/SystemLabel";
import { cn } from "@/lib/utils";

/**
 * Shared page opener. Same structural grammar as the home hero — rules,
 * metadata rail, masked statement — so the four routes read as one document,
 * while each page supplies its own headline shape and register.
 */
export default function PageOpener({
  index,
  kicker,
  lines = [],
  lead,
  register = [],
  zone = "paper",
}) {
  const root = useRef(null);
  const ink = zone === "ink";

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) return;

      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .fromTo(
          q("[data-open-rule]"),
          { scaleY: 0 },
          { scaleY: 1, duration: 1, stagger: 0.06, transformOrigin: "top center" },
        )
        .fromTo(
          q("[data-open-meta]"),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 },
          "-=0.7",
        )
        .fromTo(
          q("[data-open-word]"),
          { yPercent: 112 },
          { yPercent: 0, duration: 1.15, stagger: 0.08 },
          "-=0.5",
        )
        .fromTo(
          q("[data-open-body]"),
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.75, stagger: 0.08 },
          "-=0.7",
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone={zone}
      className={cn(
        "relative overflow-hidden ts-act-open",
        ink ? "bg-black text-white" : "bg-white text-black",
      )}
    >
      <div className="ts-rules [--rule-count:3] md:[--rule-count:6]" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-open-rule
            className={cn(
              "h-full origin-top border-r",
              ink ? "border-white/10" : "border-hair",
              i > 2 ? "hidden md:block" : "",
            )}
          />
        ))}
      </div>

      <div className="ts-shell relative">
        {/* metadata rail */}
        <div
          className={cn(
            "flex items-center justify-between gap-4 border-b pb-4",
            ink ? "border-white/16" : "border-hair",
          )}
        >
          <span data-open-meta>
            <SystemLabel className={ink ? "text-white/50" : undefined}>
              {kicker}
            </SystemLabel>
          </span>
          <span data-open-meta>
            <SystemLabel className={cn("hidden sm:inline-flex", ink && "text-white/40")}>
              TECHNOSPIRIT / GLOBAL
            </SystemLabel>
          </span>
        </div>

        {/* statement */}
        <h1
          className="mt-8 sm:mt-10"
          aria-label={lines.join(" ")}
        >
          {lines.map((line, i) => (
            <span key={i} className="ts-mask block" aria-hidden="true">
              <span
                data-open-word
                className={cn(
                  "ts-display-tight block text-[clamp(3rem,13vw,12rem)] will-change-transform",
                  i === lines.length - 1 && lines.length > 1 ? "text-signal" : "",
                )}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        {/* lead + register */}
        <div className="ts-grid mt-10 items-start sm:mt-14">
          <div className="col-span-12 lg:col-span-6">
            <p
              data-open-body
              className={cn(
                "ts-body max-w-xl border-t-2 pt-6 text-lg sm:text-xl",
                ink ? "border-white text-white/70" : "border-ink text-ash",
              )}
            >
              {lead}
            </p>
          </div>

          {register.length > 0 && (
            <div className="col-span-12 mt-10 lg:col-span-5 lg:col-start-8 lg:mt-0">
              <ul data-open-body className={cn("border-t", ink ? "border-white/16" : "border-hair")}>
                {register.map((item) => (
                  <li
                    key={item}
                    className={cn(
                      "flex items-baseline gap-4 border-b py-3",
                      ink ? "border-white/12" : "border-hair",
                    )}
                  >
                    <span className="ts-label opacity-70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
