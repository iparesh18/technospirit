import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import MaskText from "@/components/ui/MaskText";
import Reveal from "@/components/ui/Reveal";
import { SystemLabel } from "@/components/ui/SystemLabel";

const FLOW = [
  { id: "IN", label: "Signal In", items: ["Inbound call", "Website chat", "WhatsApp", "Form"] },
  { id: "AGENT", label: "Agent", items: ["Qualify", "Answer", "Book", "Escalate"] },
  { id: "OUT", label: "Outcome", items: ["Transcript", "Summary", "Lead record", "Follow-up"] },
];

const REGISTERS = [
  {
    kicker: "VOICE",
    title: "AI Voice Calling Agents",
    body: "Agents that hold a real conversation — inbound and outbound — and hand people over the moment a person is what's needed.",
    items: [
      "Inbound Calls",
      "Outbound Calls",
      "Customer Support",
      "Lead Qualification",
      "Follow-Ups",
      "Appointment Booking",
      "FAQ Handling",
    ],
    readout: ["Recordings", "Transcripts", "Summaries", "Analytics", "Performance Reports", "Lead Data"],
  },
  {
    kicker: "TEXT",
    title: "AI Chatbots",
    body: "One assistant across the website, WhatsApp and messaging platforms — answering at 3am the same way it answers at 3pm.",
    items: [
      "Website Chat",
      "WhatsApp",
      "Messaging Platforms",
      "Support",
      "Lead Capture",
      "Conversation Automation",
      "24/7 Engagement",
    ],
    readout: ["Conversation Logs", "Intent Reports", "Handover Rules", "Lead Routing"],
  },
];

export default function AiSystem() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      gsap
        .timeline({ scrollTrigger: { trigger: q("[data-flow]")[0], start: "top 80%" } })
        .fromTo(
          q("[data-flow-stage]"),
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.14 },
        )
        .fromTo(
          q("[data-flow-link]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power2.inOut", stagger: 0.14 },
          0.25,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="ink"
      aria-label="AI solutions and automation"
      className="relative overflow-hidden bg-black ts-act text-white"
    >
      <div className="ts-shell">
        {/* ── header ────────────────────────────────────────────────── */}
        <div className="ts-grid items-end border-b border-white/16 pb-12">
          <div className="col-span-12 lg:col-span-8">
            <SystemLabel className="mb-8 text-white/50">
              CAPABILITY / AI
            </SystemLabel>
            <MaskText
              as="h2"
              lines={["Systems that", "answer for you."]}
              className="ts-display-tight text-[clamp(2.6rem,8.6vw,7rem)] text-white"
            />
          </div>
          <div className="col-span-12 mt-8 lg:col-span-4 lg:mt-0">
            <p className="ts-body max-w-sm text-[0.98rem] text-white/60">
              AI tools integrated into the workflow you already have, plus custom automation
              for the tasks nobody should still be doing by hand.
            </p>
          </div>
        </div>

        {/* ── the flow diagram ──────────────────────────────────────── */}
        <div data-flow className="relative mt-10 sm:mt-12">
          <div className="grid gap-y-10 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-y-0">
            {FLOW.map((stage, i) => (
              <div key={stage.id} className="contents">
                <div
                  data-flow-stage
                  className="border border-white/16 bg-white/[0.02] p-6 transition-colors duration-500 hover:border-signal"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="ts-label text-signal">{stage.id}</span>
                  </div>
                  <h3 className="ts-display-wide text-[1.35rem] text-white">{stage.label}</h3>
                  <ul className="mt-5 space-y-2">
                    {stage.items.map((item) => (
                      <li
                        key={item}
                        className="ts-body flex items-center gap-2.5 text-[0.9rem] text-white/55"
                      >
                        <span className="size-1 shrink-0 bg-white/30" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {i < FLOW.length - 1 && (
                  <div className="hidden items-center px-4 md:flex" aria-hidden="true">
                    <span data-flow-link className="h-px w-10 origin-left bg-signal lg:w-16" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── voice + chat registers ────────────────────────────────── */}
        <Reveal className="mt-12 grid gap-px border-t border-white/16 lg:grid-cols-2" staggerChildren y={20}>
          {REGISTERS.map((reg) => (
            <div
              key={reg.kicker}
              className="border-b border-white/16 py-10 lg:border-b-0 lg:first:pr-12 lg:last:border-l lg:last:border-white/16 lg:last:pl-12"
            >
              <div className="ts-label mb-6 text-signal">{reg.kicker}</div>
              <h3 className="ts-display text-[clamp(1.5rem,3.4vw,2.4rem)] text-white">
                {reg.title}
              </h3>
              <p className="ts-body mt-4 max-w-md text-[0.95rem] text-white/55">{reg.body}</p>

              <ul className="mt-8 flex flex-wrap gap-2">
                {reg.items.map((item) => (
                  <li
                    key={item}
                    className="ts-label border border-white/20 px-3 py-2 text-white/70 transition-colors duration-300 hover:border-signal hover:bg-signal hover:text-white"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 border-t border-white/12 pt-5">
                <div className="ts-label mb-3 text-white/35">DASHBOARD READOUT</div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {reg.readout.map((r) => (
                    <span key={r} className="ts-body text-[0.85rem] text-white/50">
                      <span className="mr-2 text-signal" aria-hidden="true">
                        /
                      </span>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
