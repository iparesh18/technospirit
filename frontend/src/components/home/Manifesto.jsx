import ScrubWords from "@/components/ui/ScrubWords";
import SignalField from "@/components/motion/SignalField";
import CurvedMarquee from "@/components/motion/CurvedMarquee";
import Reveal from "@/components/ui/Reveal";
import { SystemLabel } from "@/components/ui/SystemLabel";

const PILLARS = [
  {
    id: "MISSION",
    body: "Help businesses use genuinely powerful technology without inheriting unnecessary complexity.",
  },
  {
    id: "VISION",
    body: "Build digital systems that can operate, adapt and scale across markets and time zones.",
  },
  {
    id: "METHOD",
    body: "Design for humans, engineer for scale, automate the repetitive, measure what matters.",
  },
];

export default function Manifesto() {
  return (
    <section
      data-zone="ink"
      aria-label="What TechnoSpirit stands for"
      className="relative overflow-hidden bg-black text-white"
    >
      {/* cursor-reactive field behind the structure (React Bits DotGrid, rebuilt) */}
      <SignalField proximity={210} gap={38} dot={3} />

      {/* structural rules carried through onto black */}
      <div className="ts-rules [--rule-count:3] lg:[--rule-count:6]" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-full border-r border-white/[0.07] ${i > 2 ? "hidden lg:block" : ""}`}
          />
        ))}
      </div>

      <div className="ts-shell ts-act relative">
        <div className="ts-grid">
          <div className="col-span-12 mb-9 flex items-center justify-between gap-6 border-b border-white/16 pb-5">
            <SystemLabel className="text-white/50">
              WHAT WE STAND FOR
            </SystemLabel>
            <SystemLabel className="hidden text-white/40 sm:inline-flex">
              DIGITAL INFRASTRUCTURE
            </SystemLabel>
          </div>

          <div className="col-span-12 lg:col-span-10">
            <ScrubWords
              as="h2"
              className="ts-display text-[clamp(1.75rem,5.4vw,4.6rem)] leading-[1.02] text-white"
              text="We build the digital infrastructure businesses actually run on. Websites that carry the work. AI that removes the repetition. Growth systems that keep the pipeline full."
              accent={["ai", "growth", "websites"]}
              from={0.14}
            />
          </div>
        </div>

        {/* three pillars, hairline-separated — no cards, no boxes */}
        <Reveal className="mt-12 grid gap-px border-t border-white/16 sm:mt-16 md:grid-cols-3" staggerChildren y={18}>
          {PILLARS.map((p) => (
            <div key={p.id} className="border-b border-white/16 py-6 md:border-b-0 md:pr-10">
              <div className="ts-label mb-5 flex items-center gap-2.5 text-signal">
                <span className="size-1.5 bg-signal" aria-hidden="true" />
                {p.id}
              </div>
              <p className="ts-body max-w-xs text-[0.98rem] text-white/65">{p.body}</p>
            </div>
          ))}
        </Reveal>
      </div>

      {/* ── transition into the horizontal act ─────────────────────────
          A curved ribbon of red type on black. It is the join between the
          calm manifesto and the loudest section on the page, and it doubles
          as the section label so the handoff carries information. */}
      <div className="relative border-t border-white/16 bg-black">
        <CurvedMarquee
          text="ENGINEER — AUTOMATE — GROW — OPERATE"
          curve={100}
          speed={1.5}
          textClassName="ts-display-tight fill-signal text-[78px]"
        />
        <div className="ts-shell flex items-center justify-between gap-6 pb-5">
          <SystemLabel className="text-white/40">WHAT WE DO</SystemLabel>
          <SystemLabel className="hidden text-white/30 sm:inline-flex">
            SCROLL
          </SystemLabel>
        </div>
      </div>
    </section>
  );
}
