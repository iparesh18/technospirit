import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MaskText from "@/components/ui/MaskText";
import Marquee from "@/components/ui/Marquee";
import { SystemLabel } from "@/components/ui/SystemLabel";

const REGISTERS = [
  {
    id: "01",
    title: "Social Media",
    body: "Strategy, content, scheduling and audience development held to one consistent brand voice — so the feed reads like the company, not like a rota.",
    items: ["Strategy", "Content Calendar", "Scheduling", "Audience Development", "Brand Consistency"],
  },
  {
    id: "02",
    title: "Meta Ads",
    body: "Facebook and Instagram campaigns built for lead generation, then managed and optimised against what actually converts.",
    items: ["Facebook", "Instagram", "Lead Generation", "Campaign Management", "Optimisation"],
  },
  {
    id: "03",
    title: "Content",
    body: "Graphics, video, captions and advertising assets produced as a system — not one-off posts that stop the moment someone gets busy.",
    items: ["Graphics", "Video", "Captions", "Ad Creative", "Digital Assets"],
  },
];

export default function DigitalGrowth() {
  return (
    <section
      data-zone="paper"
      aria-label="Digital growth"
      className="relative overflow-hidden bg-white ts-act"
    >
      <div className="ts-shell">
        <div className="ts-grid items-end">
          <div className="col-span-12 lg:col-span-7">
            <SystemLabel className="mb-8">
              CAPABILITY / GROWTH
            </SystemLabel>
            <MaskText
              as="h2"
              lines={["Attention,", "engineered."]}
              className="ts-display-tight text-[clamp(2.8rem,9.5vw,8rem)] text-ink"
            />
          </div>
          <div className="col-span-12 mt-8 lg:col-span-5 lg:mt-0 lg:pl-8">
            <p className="ts-body max-w-sm border-t-2 border-ink pt-5 text-[0.98rem] text-ash">
              Building the product is half of it. The other half is making sure the right
              people keep finding it — deliberately, and on a schedule.
            </p>
          </div>
        </div>
      </div>

      {/* full-bleed marquee acts as the section rule */}
      <div className="my-16 border-y border-ink py-4 sm:my-20">
        <Marquee
          items={["SOCIAL MEDIA", "META ADS", "CONTENT CREATION", "CAMPAIGN STRATEGY", "DIGITAL GROWTH"]}
          duration={38}
          reverse
          itemClassName="ts-display-wide text-[clamp(1.4rem,4vw,3rem)] text-ink"
          separator="／"
        />
      </div>

      <div className="ts-shell">
        {/* giant type rows that open — shadcn Accordion, fully re-skinned */}
        <Accordion type="single" collapsible defaultValue="01" className="border-t border-ink">
          {REGISTERS.map((reg) => (
            <AccordionItem
              key={reg.id}
              value={reg.id}
              className="group/reg border-b border-ink not-last:border-b"
            >
              <AccordionTrigger
                data-cursor="explore"
                className="group/trigger flex w-full items-center justify-between gap-6 rounded-none px-0 py-7 text-left transition-colors duration-500 hover:bg-transparent sm:py-9 [&>svg]:hidden"
              >
                <span className="flex flex-1 items-baseline gap-5 sm:gap-8">
                  <span className="ts-label shrink-0 text-ash-dim transition-colors duration-300 group-aria-expanded/trigger:text-signal">
                    {reg.id}
                  </span>
                  <span className="ts-display-tight text-[clamp(2rem,7vw,5rem)] text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/trigger:translate-x-2">
                    {reg.title}
                  </span>
                </span>

                {/* plus → minus, drawn as two rules */}
                <span className="relative block size-5 shrink-0" aria-hidden="true">
                  <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-ink" />
                  <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-aria-expanded/trigger:scale-y-0" />
                </span>
              </AccordionTrigger>

              <AccordionContent className="pb-10 text-base">
                <div className="ts-grid">
                  <div className="col-span-12 md:col-span-5 md:col-start-2">
                    <p className="ts-body max-w-md text-[0.98rem] text-ash">{reg.body}</p>
                  </div>
                  <div className="col-span-12 mt-6 md:col-span-6 md:mt-0">
                    <ul className="flex flex-wrap gap-2">
                      {reg.items.map((i) => (
                        <li
                          key={i}
                          className="ts-label border border-hair px-3 py-2 text-ash transition-colors duration-300 hover:border-signal hover:text-signal-ink"
                        >
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
