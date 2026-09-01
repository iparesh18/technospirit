import { lazy, Suspense } from "react";
import usePageMeta from "@/hooks/usePageMeta";
import { siteGraph, webPage, breadcrumbList } from "@/lib/structuredData";

const NAME = "Capabilities — TechnoSpirit";
const DESCRIPTION =
  "Human intent and machine precision, meeting at a point. A scroll-controlled study of what TechnoSpirit builds and the engineering under the surface.";

const JSON_LD = [
  ...siteGraph,
  webPage({ path: "/capabilities", name: NAME, description: DESCRIPTION, breadcrumb: true }),
  breadcrumbList({ path: "/capabilities", name: "Capabilities" }),
];
import useCapabilityDevice from "@/components/capabilities/useCapabilityDevice";
import CapabilitiesRestricted from "@/components/capabilities/CapabilitiesRestricted";

/**
 * The heavy experience is behind a dynamic import that is only ever *reached*
 * on a device that passed the gate.
 *
 * This is the whole phone strategy in one line, and the reason it is a
 * `lazy()` rather than a top-level import with a CSS `display: none`. A hidden
 * desktop tree would still have cost the phone the component code, the
 * capabilities stylesheet, two 1.4MB videos, a 3.4MB video and both hand
 * plates — every byte of it downloaded and then thrown away. Nothing below
 * this boundary is requested until <CapabilitiesExperience> is actually
 * rendered, so a phone receives the route chunk, the restricted screen, and
 * nothing else.
 *
 * The scenes inside stage their own assets on top of this — see
 * `useStagedAssets` — so even a desktop does not pull the aircraft footage on
 * arrival.
 */
const CapabilitiesExperience = lazy(
  () => import("@/components/capabilities/CapabilitiesExperience"),
);

export default function Capabilities() {
  usePageMeta({ title: NAME, description: DESCRIPTION, jsonLd: JSON_LD });

  const capable = useCapabilityDevice();

  // `null` is the pre-decision frame. Rendering neither branch keeps the
  // dynamic import unrequested until the answer is known — on a phone it is
  // never requested at all.
  if (capable === null) return <div className="min-h-[100svh]" aria-hidden="true" />;
  if (!capable) return <CapabilitiesRestricted />;

  return (
    <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
      <CapabilitiesExperience />
    </Suspense>
  );
}
