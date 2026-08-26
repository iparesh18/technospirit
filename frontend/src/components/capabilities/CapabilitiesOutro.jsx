import { ActionLink } from "@/components/ui/ActionLink";
import { SystemLabel } from "@/components/ui/SystemLabel";
import MaskText from "@/components/ui/MaskText";

/**
 * The close.
 *
 * The aircraft beat ends on a near-white studio ground, so this returns to
 * paper rather than cutting back to black — the page's whole arc is paper,
 * then structure, then paper again, and ending on the ground it opened on is
 * what makes it read as one piece rather than as a sequence that stopped.
 *
 * It is also the only thing between the last frame of the aircraft and the
 * footer. Without it the footer's black slab arrives directly against white
 * film, which is the one hard cut on the page.
 */
export default function CapabilitiesOutro() {
  return (
    <section data-zone="paper" className="cap-outro ts-act">
      <div className="ts-shell">
        <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-4">
          <SystemLabel className="text-ink">CAPABILITIES / END</SystemLabel>
          <SystemLabel className="hidden text-ash sm:inline-flex">
            TECHNOSPIRIT / GLOBAL
          </SystemLabel>
        </div>

        <MaskText
          as="h2"
          lines={["Every surface", "has an engine."]}
          className="ts-display-tight mt-10 text-[clamp(2.25rem,7vw,6rem)]"
        />

        <div className="ts-grid mt-12 items-start">
          <div className="col-span-12 lg:col-span-6">
            <p className="ts-body max-w-xl border-t-2 border-ink pt-6 text-lg text-ash sm:text-xl">
              Intent is the hard part. Precision is the rest of it. What you
              have just scrolled through is the same argument we make in code:
              the finish is not the work, it is what the work makes possible.
            </p>
          </div>

          <div className="col-span-12 mt-10 lg:col-span-5 lg:col-start-8 lg:mt-0">
            <ActionLink to="/contact">START A PROJECT</ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
