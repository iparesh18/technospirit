import { SystemLabel } from "@/components/ui/SystemLabel";

/**
 * What a phone gets instead of the experience.
 *
 * Everything here is type and rules — no image, no video, no GSAP, no
 * stylesheet of its own. It is in the route chunk rather than the experience
 * chunk precisely so that reaching it costs one small download and stops.
 *
 * The register is deliberate rather than apologetic. This is not an error
 * state and it does not ask for forgiveness: the same page that tells you a
 * screening has a room says so plainly, and so does this. The red square is
 * the site's signal mark doing what it always does — marking the one thing on
 * screen that is an instruction.
 */
export default function CapabilitiesRestricted() {
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

        <h1 className="ts-display-tight mt-8 text-[clamp(3rem,17vw,9rem)]">Capabilities</h1>

        <div className="mt-10 flex items-start gap-4 border-t-2 border-ink pt-6">
          <span
            aria-hidden="true"
            className="mt-[0.35rem] size-3 shrink-0 bg-signal"
          />
          <p className="ts-display max-w-md text-[clamp(1.25rem,5.5vw,2rem)] leading-[1.05]">
            Open this experience on a laptop or PC.
          </p>
        </div>

        <p className="ts-body mt-8 max-w-sm text-ash">
          It is built around a pointer, a wide frame and a scroll that controls
          the picture. Those are the instrument — so it waits for one.
        </p>
      </div>
    </section>
  );
}
