import { ArrowUpRight } from "lucide-react";
import { SystemLabel } from "@/components/ui/SystemLabel";

/**
 * The second way in.
 *
 * Sits under the brief, in the same column, deliberately quieter than the
 * black slab above it: an outline rather than a fill, so the page still has
 * one primary action and this reads as the alternative it is. Everything else
 * — the hairline, the mono label, the red panel wiping up from the baseline,
 * the arrow leaving on hover — is the site's existing CTA grammar, unchanged.
 *
 * A <button>, not a link. It opens a dialog over this page; it does not
 * navigate, and a link that does not navigate is a lie to anyone reading the
 * status bar or using a screen reader.
 */
export default function BookCallCta({ onOpen, buttonRef }) {
  return (
    <div className="ts-bookcta">
      <div className="ts-bookcta-head">
        <SystemLabel className="text-ink">RATHER TALK IT THROUGH?</SystemLabel>
      </div>

      <p className="ts-body ts-bookcta-lead">
        Choose a convenient time and we&rsquo;ll call you.
      </p>

      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        data-cursor="start"
        aria-haspopup="dialog"
        className="group/book ts-bookcta-btn"
      >
        <span aria-hidden="true" className="ts-bookcta-fill" />
        <span className="ts-label ts-bookcta-label">BOOK A CALL</span>
        <ArrowUpRight className="ts-bookcta-arrow" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
