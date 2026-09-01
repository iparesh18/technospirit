import { lazy, Suspense } from "react";
import usePageMeta from "@/hooks/usePageMeta";
import { siteGraph, webPage, breadcrumbList } from "@/lib/structuredData";

const NAME = "Lab — TechnoSpirit";
// The original read as pure atmosphere and never said whose lab it was or what
// it was about, which left both a searcher and a language model with nothing to
// attach it to. The register is unchanged; the subject is now stated.
const DESCRIPTION =
  "A scroll-controlled sequence from TechnoSpirit: a closed system opens, the core lights, and the web, AI and automation running behind the interface become the point.";

const JSON_LD = [
  ...siteGraph,
  webPage({ path: "/lab", name: NAME, description: DESCRIPTION, breadcrumb: true }),
  breadcrumbList({ path: "/lab", name: "Lab" }),
];
import useCapabilityDevice from "@/components/capabilities/useCapabilityDevice";
import LabRestricted from "@/components/lab/LabRestricted";

/**
 * /lab — device-gated, on exactly the same terms as /capabilities.
 *
 * The gate is `useCapabilityDevice`, reused rather than reimplemented. That is
 * not convenience: this page is a scroll-scrubbed film, so it needs the same
 * three things that page needs — a pointer that hovers, the project's 1024px
 * desktop threshold, and enough short-edge height to hold a pinned stage. The
 * hook's own notes already name the /lab decode path as drawing the line at
 * 1024px, and `ScrollVideoStage` gates its decode on
 * `(min-width: 1024px) and (pointer: fine)`. A second, slightly different
 * definition of "desktop" here would be a bug waiting to happen.
 *
 * Because the hook re-evaluates on media-query change and on resize, rotating
 * a phone or dragging the window across the threshold swaps the branch live.
 *
 * The sequence is behind a dynamic import so the gate can be paid before the
 * weight is: a phone downloads this route chunk and the restricted screen, and
 * nothing below <LabExperience> — no footage, no GSAP stage, no HUD — is ever
 * requested.
 */
const LabExperience = lazy(() => import("@/components/lab/LabExperience"));

export default function Lab() {
  usePageMeta({ title: NAME, description: DESCRIPTION, jsonLd: JSON_LD });

  const capable = useCapabilityDevice();

  // `null` is the pre-decision frame. Rendering neither branch keeps the
  // dynamic import unrequested until the answer is known — on a phone it is
  // never requested at all.
  if (capable === null) return <div className="min-h-[100svh]" aria-hidden="true" />;
  if (!capable) return <LabRestricted />;

  return (
    <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
      <LabExperience />
    </Suspense>
  );
}
