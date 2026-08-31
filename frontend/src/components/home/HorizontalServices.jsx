import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { SystemLabel } from "@/components/ui/SystemLabel";
import { SignalLink } from "@/components/ui/ActionLink";

export const ACTS = [
  {
    index: "01",
    verb: "Engineer.",
    zone: "paper",
    statement: ["Websites aren't pages.", "They're business infrastructure."],
    note: "Built to carry traffic, transactions and the people who run them.",
    items: [
      "Website Development",
      "E-Commerce",
      "LMS & Online Classes",
      "CRM Systems",
      "Booking Systems",
      "Admin Dashboards",
      "SaaS Platforms",
      "SEO",
    ],
  },
  {
    index: "02",
    verb: "Automate.",
    zone: "ink",
    statement: ["Every repeated task", "is a system waiting to be written."],
    note: "AI that answers, qualifies and follows up — while the team does the work only people can do.",
    items: [
      "AI Tools Integration",
      "Custom AI Automation",
      "AI Voice Calling Agents",
      "AI Chatbots",
      "Lead Automation",
      "Workflow Automation",
    ],
  },
  {
    index: "03",
    verb: "Grow.",
    zone: "paper",
    statement: ["Reach is a system too.", "Planned, produced, measured."],
    note: "Content and campaigns that compound instead of disappearing into the feed.",
    items: [
      "Social Media Management",
      "Meta Ads",
      "Content Creation",
      "Campaign Strategy",
      "Audience Development",
    ],
  },
  {
    index: "04",
    verb: "Operate.",
    zone: "ink",
    statement: ["Launch is the start", "of the work, not the end of it."],
    note: "Monitoring, updates and reporting — so the thing we built keeps earning its place.",
    items: [
      "Website Maintenance",
      "Security & Updates",
      "Performance Tuning",
      "Analytics Dashboards",
      "Business Reporting",
      "Long-Term Support",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  A single scene                                                            */
/* -------------------------------------------------------------------------- */
function Act({ act, mobile = false }) {
  const ink = act.zone === "ink";

  return (
    <article
      data-act
      data-zone={act.zone}
      className={[
        "relative flex flex-col justify-center overflow-hidden",
        ink ? "bg-black text-white" : "bg-white text-black",
        mobile
          // Content-height, not 100svh. The snap-start class was inert (no
          // snap container above it) and four forced full screens turned the
          // act into a third of the mobile page for the same information.
          ? "w-full border-b border-[var(--line)] py-14"
          : "h-full w-screen shrink-0 border-r border-[var(--line)] px-[max(1.25rem,4vw)] py-10",
      ].join(" ")}
    >
      {/* oversized ghost numeral, parallaxed against the content */}
      <span
        data-act-numeral
        aria-hidden="true"
        className={[
          "ts-display-tight pointer-events-none absolute select-none leading-none",
          ink ? "text-white/[0.055]" : "text-black/[0.045]",
          mobile
            ? "-right-6 top-8 text-[38vw]"
            : "-bottom-[8vh] right-[3vw] text-[46vh] lg:text-[58vh]",
        ].join(" ")}
      >
        {act.index}
      </span>

      <div className={mobile ? "ts-shell relative" : "relative w-full"}>
        <div className="ts-grid items-start gap-y-10">
          {/* left column — the verb */}
          <div className="col-span-12 lg:col-span-7">
            <div className="mb-8 flex items-center gap-5">
              <span
                className={`h-px flex-1 max-w-24 ${ink ? "bg-white/25" : "bg-black/20"}`}
                aria-hidden="true"
              />
              <SystemLabel className={ink ? "text-white/45" : "text-ash"}>
                SERVICE
              </SystemLabel>
            </div>

            <h3
              data-act-verb
              className={[
                "ts-display-tight",
                mobile
                  ? "text-[clamp(3.2rem,19vw,7rem)]"
                  : "text-[clamp(3.5rem,11vw,11rem)]",
              ].join(" ")}
            >
              {act.verb}
            </h3>

            <div className={`mt-8 max-w-xl border-t-2 pt-6 ${ink ? "border-white" : "border-black"}`}>
              {act.statement.map((line, i) => (
                <p
                  key={i}
                  className={[
                    "ts-body text-[1.05rem] sm:text-xl lg:text-[1.4rem]",
                    i === 0 ? (ink ? "text-white" : "text-black") : ink ? "text-white/55" : "text-ash",
                  ].join(" ")}
                >
                  {line}
                </p>
              ))}
              <p className={`ts-body mt-5 max-w-md text-sm ${ink ? "text-white/45" : "text-ash"}`}>
                {act.note}
              </p>
            </div>
          </div>

          {/* right column — the capability register */}
          <div className="col-span-12 lg:col-span-5 lg:pl-6">
            <ul className={`border-t ${ink ? "border-white/20" : "border-black/15"}`}>
              {act.items.map((item) => (
                <li key={item}>
                  <div
                    className={[
                      "group/item flex items-baseline gap-4 border-b py-3.5 transition-colors duration-300 sm:py-4",
                      ink
                        ? "border-white/12 hover:bg-white/[0.04]"
                        : "border-black/10 hover:bg-black/[0.03]",
                    ].join(" ")}
                  >
                    <span className="ts-body flex-1 text-[0.95rem] sm:text-base">{item}</span>
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 scale-0 bg-signal transition-transform duration-300 group-hover/item:scale-100"
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <SignalLink to="/services" className="ts-label text-[0.7rem]">
                FULL SERVICE INDEX
              </SignalLink>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                   */
/* -------------------------------------------------------------------------- */
export default function HorizontalServices() {
  const root = useRef(null);
  const track = useRef(null);
  const progress = useRef(null);
  const counter = useRef(null);

  useGSAP(
    () => {
      // gsap.matchMedia handles breakpoint teardown/rebuild for us, and
      // useGSAP's context reverts the whole thing on unmount.
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (!context.conditions.desktop) return;

          const panels = gsap.utils.toArray("[data-act]", track.current);
          if (panels.length < 2) return;

          // How far the track has to move to show every panel.
          const travel = () => track.current.scrollWidth - window.innerWidth;

          // How much page scroll that travel is worth. At 1:1 the act ate
          // ~3 viewport heights of scrolling and felt like wading; 0.62 makes
          // the same journey land in roughly two, which reads as quick and
          // deliberate without turning into a jump-cut.
          const SCROLL_RATIO = 0.62;
          const distance = () => Math.round(travel() * SCROLL_RATIO);

          const tween = gsap.to(track.current, {
            x: () => -travel(),
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              pin: true,
              pinSpacing: true,
              scrub: 0.8,
              start: "top top",
              end: () => "+=" + distance(),
              invalidateOnRefresh: true,
              anticipatePin: 1,
              // The act is the last thing that measures on this page; without
              // this the sections after it keep the pre-pin offsets and open
              // a dead band under the section.
              refreshPriority: -1,
              onUpdate: (self) => {
                if (progress.current) {
                  progress.current.style.transform = `scaleX(${self.progress})`;
                }
                if (counter.current) {
                  const i = Math.min(
                    panels.length,
                    Math.floor(self.progress * panels.length) + 1,
                  );
                  const next = String(i).padStart(2, "0");
                  if (counter.current.textContent !== next) counter.current.textContent = next;
                }
              },
            },
          });

          // the giant numerals drift against the horizontal travel
          panels.forEach((panel) => {
            const numeral = panel.querySelector("[data-act-numeral]");
            if (!numeral) return;
            gsap.fromTo(
              numeral,
              { xPercent: 12 },
              {
                xPercent: -12,
                ease: "none",
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: tween,
                  start: "left right",
                  end: "right left",
                  scrub: true,
                },
              },
            );
          });
        },
      );

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="services"
      aria-label="What TechnoSpirit builds"
      data-zone="ink"
      className="relative"
    >
      {/* ── desktop: pinned horizontal track, letterboxed ─────────────
          The act runs between two black rails. The top rail gives the fixed
          nav a single consistent ground to sit on while the panels alternate
          white and black underneath, and the pair frames the section like a
          film strip rather than letting it collide with the chrome. */}
      <div className="relative hidden h-[100svh] overflow-hidden bg-black lg:block">
        <div
          ref={track}
          className="absolute top-[96px] bottom-[72px] left-0 flex w-max will-change-transform"
        >
          {ACTS.map((act) => (
            <Act key={act.index} act={act} />
          ))}
        </div>

        {/* top rail */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[96px] bg-black" />

        {/* progress HUD — a fixed black rail so it reads over every scene */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[72px] flex-col justify-end bg-black text-white">
          <div className="ts-shell flex items-center gap-6 py-3.5">
            <span className="ts-label text-signal tabular-nums">
              <span ref={counter}>01</span>
              <span className="text-white/35"> / 04</span>
            </span>
            <span className="ts-label hidden text-white/40 xl:inline">
              KEEP SCROLLING
            </span>
            <div className="h-px flex-1 bg-white/15" aria-hidden="true" />
            <span className="ts-label text-white/40">WEB · AI · GROWTH · OPERATE</span>
          </div>
          <div className="h-[3px] w-full bg-white/10" aria-hidden="true">
            {/* inline transform, not scale-x-0 — see the note in Principles:
                Tailwind v4's scale utilities write the standalone `scale`
                property and would multiply this bar back to zero. */}
            <div
              ref={progress}
              className="h-full w-full origin-left bg-signal will-change-transform"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>
      </div>

      {/* ── mobile/tablet: vertical snap scenes, same content ─────────── */}
      <div className="lg:hidden">
        {ACTS.map((act) => (
          <Act key={act.index} act={act} mobile />
        ))}
      </div>
    </section>
  );
}
