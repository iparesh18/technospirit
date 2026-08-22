import Reveal from "@/components/ui/Reveal";
import MaskText from "@/components/ui/MaskText";
import { SystemLabel } from "@/components/ui/SystemLabel";

const REFUSALS = [
  { title: "No invented metrics", body: "We won't quote numbers we can't show you the source of." },
  { title: "No borrowed logos", body: "Client marks appear here when there are clients who've agreed to appear here." },
  { title: "No template resold as custom", body: "If a template genuinely fits, we'll say so — and charge accordingly." },
  { title: "No lock-in", body: "You own the code, the accounts and the infrastructure. Always." },
  { title: "No silent handoff", body: "Nothing gets delivered as a zip file and a good-luck message." },
];

/**
 * The counterpoint. A "why us" page that only lists strengths is unfalsifiable;
 * naming what we refuse to do is the part that can actually be held against us.
 */
export default function NoList() {
  return (
    <section
      data-zone="ink"
      aria-label="What we don't do"
      className="relative overflow-hidden bg-black ts-act text-white"
    >
      <div className="ts-shell">
        <div className="ts-grid items-end border-b border-white/16 pb-12">
          <div className="col-span-12 lg:col-span-7">
            <SystemLabel className="mb-8 text-white/50">
              THE COUNTERPOINT
            </SystemLabel>
            <MaskText
              as="h2"
              lines={["And what", "we won't do."]}
              className="ts-display-tight text-[clamp(2.4rem,8vw,6.5rem)] text-white"
            />
          </div>
          <div className="col-span-12 mt-8 lg:col-span-5 lg:mt-0 lg:pl-8">
            <p className="ts-body max-w-sm text-[0.98rem] text-white/60">
              A list of strengths proves nothing on its own. This is the half you can hold
              us to.
            </p>
          </div>
        </div>

        <Reveal className="mt-9 border-t border-white/16" staggerChildren y={16}>
          {REFUSALS.map((r, i) => (
            <div
              key={r.title}
              className="group/n flex flex-col gap-3 border-b border-white/12 py-7 transition-colors duration-500 hover:bg-white/[0.03] sm:flex-row sm:items-baseline sm:gap-10"
            >
              <span className="ts-label shrink-0 text-signal tabular-nums sm:w-12">
                {String(i + 1).padStart(2, "0")}
              </span>

              <h3 className="ts-display-wide flex-1 text-[clamp(1.15rem,3.2vw,1.9rem)] text-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/n:translate-x-1.5">
                {r.title}
              </h3>

              <p className="ts-body max-w-sm text-[0.92rem] text-white/50 sm:w-80 sm:shrink-0">
                {r.body}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
