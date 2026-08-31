import Reveal from "@/components/ui/Reveal";
import { SystemLabel } from "@/components/ui/SystemLabel";

const DISCIPLINES = [
  {
    id: "01",
    word: "Technology",
    body: "Engineering that holds up — architecture, performance, security and the unglamorous parts that decide whether a system lasts.",
  },
  {
    id: "02",
    word: "Design",
    body: "Interfaces built around how people actually read, decide and act. Hierarchy before decoration, always.",
  },
  {
    id: "03",
    word: "AI",
    body: "Automation and agents applied where they remove real work, and deliberately left out where they don't.",
  },
  {
    id: "04",
    word: "Growth",
    body: "Content, campaigns and measurement — so what gets built keeps meeting the people it was built for.",
  },
];

/**
 * Four full-width rows. Each inverts to black on hover/focus, so the section
 * reads as a switchboard rather than a grid of feature cards.
 */
export default function Disciplines() {
  return (
    <section
      data-zone="paper"
      aria-label="What we do"
      className="relative bg-white ts-act"
    >
      <div className="ts-shell">
        <SystemLabel className="mb-7">
          FOUR DISCIPLINES / ONE TEAM
        </SystemLabel>
      </div>

      <Reveal className="border-t border-ink" staggerChildren y={14}>
        {DISCIPLINES.map((d) => (
          <div
            key={d.id}
            tabIndex={0}
            data-cursor="explore"
            className="group/d border-b border-ink transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-black focus-visible:bg-black"
          >
            <div className="ts-shell">
              <div className="flex flex-col gap-5 py-7 lg:flex-row lg:items-center lg:gap-12 lg:py-8">
                <h3 className="ts-display-tight flex-1 text-[clamp(2.2rem,8vw,6rem)] text-ink transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/d:translate-x-3 group-hover/d:text-white group-focus-visible/d:text-white">
                  {d.word}
                </h3>

                <p className="ts-body max-w-sm text-[0.95rem] text-ash transition-colors duration-500 group-hover/d:text-white/70 group-focus-visible/d:text-white/70 lg:w-80 lg:shrink-0">
                  {d.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
