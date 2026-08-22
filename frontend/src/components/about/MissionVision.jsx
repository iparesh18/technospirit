import ScrubWords from "@/components/ui/ScrubWords";
import { SystemLabel } from "@/components/ui/SystemLabel";

export default function MissionVision() {
  return (
    <section
      data-zone="ink"
      aria-label="Mission and vision"
      className="relative overflow-hidden bg-black ts-act text-white"
    >
      <div className="ts-rules [--rule-count:2] lg:[--rule-count:4]" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-full border-r border-white/[0.07] ${i > 1 ? "hidden lg:block" : ""}`}
          />
        ))}
      </div>

      <div className="ts-shell relative space-y-14 sm:space-y-20">
        <div className="ts-grid">
          <div className="col-span-12 lg:col-span-3">
            <SystemLabel className="text-white/50">
              MISSION
            </SystemLabel>
          </div>
          <div className="col-span-12 mt-6 lg:col-span-9 lg:mt-0">
            <ScrubWords
              as="p"
              className="ts-display text-[clamp(1.6rem,4.8vw,3.8rem)] leading-[1.05] text-white"
              text="Help businesses use genuinely powerful technology without inheriting unnecessary complexity."
              accent={["technology"]}
            />
          </div>
        </div>

        <div className="ts-grid">
          <div className="col-span-12 lg:col-span-3">
            <SystemLabel className="text-white/50">
              VISION
            </SystemLabel>
          </div>
          <div className="col-span-12 mt-6 lg:col-span-9 lg:mt-0">
            <ScrubWords
              as="p"
              className="ts-display text-[clamp(1.6rem,4.8vw,3.8rem)] leading-[1.05] text-white"
              text="Create digital systems capable of operating, adapting and scaling globally."
              accent={["globally"]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
