import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import MaskText from "@/components/ui/MaskText";
import { SystemLabel } from "@/components/ui/SystemLabel";

const BRANCHES = [
  {
    id: "01",
    name: "Website Creation",
    body: "Modern, responsive websites built around how the business actually sells.",
  },
  {
    id: "02",
    name: "Responsive Web Design",
    body: "Composed for desktop, laptop, tablet and phone — not squeezed into them.",
  },
  {
    id: "03",
    name: "Website Maintenance",
    body: "Security, updates, performance and ongoing technical support after launch.",
  },
  {
    id: "04",
    name: "SEO",
    body: "Search-engine optimisation for visibility and durable organic growth.",
  },
  {
    id: "05",
    name: "Website Dashboard",
    body: "Analytics, users, content, reports and business statistics in one place.",
  },
  {
    id: "06",
    name: "Custom Web Solutions",
    body: "Systems shaped to the operation rather than the other way around.",
    children: ["E-Commerce", "LMS", "Online Classes", "CRM", "Booking", "SaaS", "Custom Software"],
  },
];

export default function WebSystem() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 72%", end: "bottom 70%", scrub: 0.9 },
      });

      tl.fromTo(q("[data-trunk]"), { scaleY: 0 }, { scaleY: 1, ease: "none" }, 0)
        .fromTo(
          q("[data-branch]"),
          { scaleX: 0 },
          { scaleX: 1, ease: "none", stagger: 0.35 },
          0.1,
        )
        .fromTo(
          q("[data-node]"),
          { scale: 0 },
          { scale: 1, ease: "none", stagger: 0.35 },
          0.14,
        )
        .fromTo(
          q("[data-row-text]"),
          { opacity: 0, x: -10 },
          { opacity: 1, x: 0, ease: "none", stagger: 0.35 },
          0.14,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="paper"
      aria-label="Website development capability"
      className="relative bg-white ts-act"
    >
      <div className="ts-shell">
        <div className="ts-grid">
          {/* ── left: the statement, sticky against the diagram ───────── */}
          <div className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <SystemLabel className="mb-8">
                CAPABILITY / WEB
              </SystemLabel>

              <MaskText
                as="h2"
                lines={["Web", "systems."]}
                className="ts-display-tight text-[clamp(3.2rem,10vw,8rem)] text-ink"
              />

              <div className="mt-8 max-w-md border-t-2 border-ink pt-6">
                <p className="ts-body text-lg text-ink sm:text-xl">
                  A website is the part of the business that never sleeps.
                </p>
                <p className="ts-body mt-4 text-[0.98rem] text-ash">
                  So we treat it as infrastructure — architected, instrumented and maintained,
                  with a dashboard that tells you what it's doing.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                <SystemLabel>DIGITAL INFRASTRUCTURE</SystemLabel>
              </div>
            </div>
          </div>

          {/* ── right: the architecture tree ──────────────────────────── */}
          <div className="col-span-12 mt-10 lg:col-span-7 lg:mt-0 lg:pl-8">
            <div className="relative pl-8 sm:pl-12">
              {/* trunk */}
              <span
                data-trunk
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-0 w-px origin-top bg-ink"
              />

              <ul className="space-y-0">
                {BRANCHES.map((b) => (
                  <li key={b.id} className="relative border-b border-hair py-6 first:pt-0">
                    {/* connector */}
                    <span
                      data-branch
                      aria-hidden="true"
                      className="absolute top-[2.35rem] left-[-2rem] h-px w-8 origin-left bg-ink sm:left-[-3rem] sm:w-12"
                    />
                    <span
                      data-node
                      aria-hidden="true"
                      className="absolute top-[2.15rem] left-[-0.3rem] size-[7px] bg-signal"
                    />

                    <div data-row-text>
                      <div className="flex items-baseline gap-4">
                        <span className="ts-label text-ash-dim tabular-nums">{b.id}</span>
                        <h3 className="ts-display-wide text-[1.15rem] text-ink sm:text-[1.45rem]">
                          {b.name}
                        </h3>
                      </div>
                      <p className="ts-body mt-2.5 max-w-lg pl-10 text-[0.93rem] text-ash">
                        {b.body}
                      </p>

                      {b.children && (
                        <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2 pl-10">
                          {b.children.map((c) => (
                            <li
                              key={c}
                              className="ts-label border border-hair px-2.5 py-1.5 text-ash transition-colors duration-300 hover:border-ink hover:text-ink"
                            >
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
