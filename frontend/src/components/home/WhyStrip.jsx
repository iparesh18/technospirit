import Reveal from "@/components/ui/Reveal";
import MaskText from "@/components/ui/MaskText";
import { SignalLink } from "@/components/ui/ActionLink";
import { SystemLabel } from "@/components/ui/SystemLabel";

const REASONS = [
  { id: "01", title: "Custom, not templated", body: "Built for the operation in front of us." },
  { id: "02", title: "AI-first engineering", body: "Automation designed in, not bolted on later." },
  { id: "03", title: "Interface quality", body: "UI and UX treated as the product, not decoration." },
  { id: "04", title: "Performance & scale", body: "Fast under load, and architected to grow." },
  { id: "05", title: "Security & SEO aware", body: "Considered from the first commit onward." },
  { id: "06", title: "Long-term support", body: "We stay responsible after the launch date." },
];

export default function WhyStrip() {
  return (
    <section
      data-zone="ink"
      aria-label="Why TechnoSpirit"
      className="relative bg-black ts-act-sm text-white"
    >
      <div className="ts-shell">
        <div className="ts-grid items-end border-b border-white/16 pb-12">
          <div className="col-span-12 lg:col-span-8">
            <SystemLabel className="mb-8 text-white/50">
              WHY TECHNOSPIRIT
            </SystemLabel>
            <MaskText
              as="h2"
              lines={["Reasons, not", "reassurances."]}
              className="ts-display-tight text-[clamp(2.4rem,7.8vw,6rem)] text-white"
            />
          </div>
          <div className="col-span-12 mt-8 lg:col-span-4 lg:mt-0 lg:text-right">
            <SignalLink to="/why-us" className="ts-label text-[0.7rem] text-white">
              READ THE FULL CASE
            </SignalLink>
          </div>
        </div>

        <Reveal className="mt-9 grid gap-x-10 gap-y-px sm:grid-cols-2 lg:grid-cols-3" staggerChildren y={16}>
          {REASONS.map((r) => (
            <div
              key={r.id}
              className="group/r flex items-start gap-5 border-b border-white/12 py-7 transition-colors duration-500 hover:border-signal"
            >
              <div>
                <h3 className="ts-display-wide text-[1.05rem] text-white sm:text-[1.2rem]">
                  {r.title}
                </h3>
                <p className="ts-body mt-2 text-[0.9rem] text-white/50">{r.body}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
