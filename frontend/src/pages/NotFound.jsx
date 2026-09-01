import { ActionLink } from "@/components/ui/ActionLink";
import { SystemLabel } from "@/components/ui/SystemLabel";
import usePageMeta from "@/hooks/usePageMeta";

export default function NotFound() {
  /**
   * noindex is the important part here.
   *
   * nginx serves the SPA shell for every unmatched path, so this page is
   * reached with HTTP 200 — a soft 404, which Google treats as a thin
   * indexable page rather than a missing one. Until the server returns a real
   * 404 status (see SEO-NOTES.md), this directive is what keeps unmatched
   * URLs out of the index.
   */
  usePageMeta({
    title: "404 — Page not found — TechnoSpirit",
    description: "That route doesn't resolve.",
    noindex: true,
  });

  return (
    <section
      data-zone="paper"
      className="relative flex min-h-[100svh] flex-col justify-center bg-white py-32"
    >
      <div className="ts-shell">
        <SystemLabel node="ERR 404" className="mb-8">
          SIGNAL LOST
        </SystemLabel>

        <h1 className="ts-display-tight text-[clamp(4rem,20vw,16rem)] text-ink">
          404
        </h1>

        <div className="mt-10 max-w-lg border-t-2 border-ink pt-6">
          <p className="ts-body text-lg text-ash">
            That route doesn't resolve. The node either moved or never existed.
          </p>
        </div>

        <div className="mt-10">
          <ActionLink to="/">RETURN TO BASE</ActionLink>
        </div>
      </div>
    </section>
  );
}
