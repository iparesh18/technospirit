import { SystemLabel } from "@/components/ui/SystemLabel";

/**
 * What a phone gets instead of the sequence.
 *
 * Deliberately the same object as <CapabilitiesRestricted>: same rules, same
 * header stamp, same red signal square marking the one instruction on screen.
 * The two device-gated routes should not invent two different ways of saying
 * the same thing, and a visitor who meets both should recognise the second.
 *
 * Type and rules only — no video, no GSAP, no canvas, no stylesheet of its
 * own. It lives in the route chunk while the sequence sits behind a dynamic
 * import, so reaching this costs one small download and stops.
 */
export default function LabRestricted() {
  return (
    <section
      data-zone="paper"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-paper text-ink"
    >
      <div className="ts-rules [--rule-count:3]" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-full border-r border-hair" />
        ))}
      </div>

      <div className="ts-shell relative py-24">
        <div className="flex items-center justify-between gap-4 border-b border-ink pb-4">
          <SystemLabel className="text-ink">TECHNOSPIRIT</SystemLabel>
          <SystemLabel className="text-ash">DESKTOP</SystemLabel>
        </div>

        <h1 className="ts-display-tight mt-8 text-[clamp(3rem,17vw,9rem)]">Lab</h1>

        <div className="mt-10 flex items-start gap-4 border-t-2 border-ink pt-6">
          <span aria-hidden="true" className="mt-[0.35rem] size-3 shrink-0 bg-signal" />
          <p className="ts-display max-w-md text-[clamp(1.25rem,5.5vw,2rem)] leading-[1.05]">
            Lab is built for a bigger canvas.
          </p>
        </div>

        <p className="ts-body mt-8 max-w-sm text-ash">
          Open it on a desktop or laptop for the full sequence. The scroll
          drives the picture frame by frame — that is the instrument, so it
          waits for one.
        </p>
      </div>
    </section>
  );
}
