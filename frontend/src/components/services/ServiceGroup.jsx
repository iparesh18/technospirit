import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * One capability group. The group identity pins to the left while its entries
 * scroll past on the right — the label stays with you instead of scrolling
 * away and leaving the list unattributed.
 */
export default function ServiceGroup({ group, zone = "paper" }) {
  const root = useRef(null);
  const ink = zone === "ink";

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      gsap.fromTo(
        q("[data-entry]"),
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.09,
          scrollTrigger: { trigger: root.current, start: "top 70%" },
        },
      );

      gsap.fromTo(
        q("[data-group-rule]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: "expo.out",
          transformOrigin: "left center",
          scrollTrigger: { trigger: root.current, start: "top 82%" },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone={zone}
      aria-label={group.name}
      id={group.slug}
      className={cn(
        "relative scroll-mt-28 ts-act",
        ink ? "bg-black text-white" : "bg-white text-black",
      )}
    >
      <div className="ts-shell">
        <div
          data-group-rule
          className={cn("h-px w-full origin-left", ink ? "bg-white/40" : "bg-ink")}
          aria-hidden="true"
        />

        <div className="ts-grid mt-10">
          {/* ── sticky group identity ──────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <div className="flex items-baseline gap-4">
                <span className="ts-label text-signal">{group.id}</span>
                <span className={cn("ts-label", ink ? "text-white/40" : "text-ash")}>
                  / {group.tag}
                </span>
              </div>

              <h2
                className={cn(
                  "ts-display-tight mt-5 text-[clamp(3rem,11vw,8rem)]",
                  ink ? "text-white" : "text-ink",
                )}
              >
                {group.name}
              </h2>

              <p
                className={cn(
                  "ts-body mt-6 max-w-xs border-t-2 pt-5 text-[0.95rem]",
                  ink ? "border-white text-white/60" : "border-ink text-ash",
                )}
              >
                {group.lead}
              </p>

              <div className="mt-8 flex items-center gap-3">
                <span className="size-1.5 bg-signal" aria-hidden="true" />
                <span className={cn("ts-label", ink ? "text-white/40" : "text-ash")}>
                  {group.entries.length} SERVICES
                </span>
              </div>
            </div>
          </div>

          {/* ── entries ────────────────────────────────────────────── */}
          <div className="col-span-12 mt-9 lg:col-span-8 lg:mt-0">
            <ul className={cn("border-t", ink ? "border-white/16" : "border-hair")}>
              {group.entries.map((entry, i) => (
                <li
                  key={entry.name}
                  data-entry
                  className={cn(
                    "group/e relative border-b py-8 transition-colors duration-500 sm:py-10",
                    ink ? "border-white/12" : "border-hair",
                  )}
                >
                  {/* red rule slides in from the left on hover */}
                  <span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 -left-4 w-[3px] origin-top scale-y-0 bg-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/e:scale-y-100 sm:-left-6"
                  />

                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
                    <span
                      className={cn(
                        "ts-label shrink-0 tabular-nums lg:w-12",
                        ink ? "text-white/35" : "text-ash-dim",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1">
                      <h3
                        className={cn(
                          "ts-display-wide text-[clamp(1.3rem,3.4vw,2.1rem)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/e:translate-x-1.5",
                          ink ? "text-white" : "text-ink",
                        )}
                      >
                        {entry.name}
                      </h3>

                      <p
                        className={cn(
                          "ts-body mt-3 max-w-2xl text-[0.96rem]",
                          ink ? "text-white/55" : "text-ash",
                        )}
                      >
                        {entry.body}
                      </p>

                      {entry.items && (
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {entry.items.map((item) => (
                            <li
                              key={item}
                              className={cn(
                                "ts-label border px-3 py-2 transition-colors duration-300",
                                ink
                                  ? "border-white/20 text-white/65 hover:border-signal hover:bg-signal hover:text-white"
                                  : "border-hair text-ash hover:border-signal hover:text-signal-ink",
                              )}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
