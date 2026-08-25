import { ArrowUpRight } from "lucide-react";
import Magnet from "@/components/motion/Magnet";
import { cn } from "@/lib/utils";

const COPY = {
  idle: "START SOMETHING",
  sending: "SENDING",
  sent: "BRIEF LOGGED",
};

/**
 * Submit, in the ActionLink's clothes — same slab, same red panel wiping up
 * from the baseline, same arrow. It is a real <button type="submit"> rather
 * than ActionLink itself, because ActionLink is a router <Link> and this has
 * to submit a form.
 *
 * The magnet is the site's existing one, at the same settings the hero and
 * FinalCta use, so the pull feels identical wherever a primary action appears.
 */
export default function ContactCTA({ status = "idle", className }) {
  const busy = status === "sending" || status === "sent";

  return (
    <Magnet padding={70} strength={4} disabled={busy} innerClassName="w-full" className={cn("w-full", className)}>
      <button
        type="submit"
        data-cursor="start"
        disabled={busy}
        aria-live="polite"
        className="group/cta ts-cta"
      >
        <span aria-hidden="true" className="ts-cta-fill" />
        <span className="ts-label ts-cta-label">{COPY[status] ?? COPY.idle}</span>
        <ArrowUpRight className="ts-cta-arrow" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </Magnet>
  );
}
