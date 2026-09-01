import PageOpener from "@/components/layout/PageOpener";
import Disciplines from "@/components/about/Disciplines";
import MissionVision from "@/components/about/MissionVision";
import Principles from "@/components/about/Principles";
import usePageMeta from "@/hooks/usePageMeta";
import { siteGraph, webPage, breadcrumbList } from "@/lib/structuredData";

const NAME = "About — TechnoSpirit";
const DESCRIPTION =
  "TechnoSpirit works across four disciplines businesses are usually forced to buy separately: technology, design, AI and growth.";

const JSON_LD = [
  ...siteGraph,
  webPage({ path: "/about", name: NAME, description: DESCRIPTION, breadcrumb: true }),
  breadcrumbList({ path: "/about", name: "About" }),
];

export default function About() {
  usePageMeta({ title: NAME, description: DESCRIPTION, jsonLd: JSON_LD });

  return (
    <>
      <PageOpener
        kicker="ABOUT / WHO WE ARE"
        lines={["We build", "the layer", "underneath."]}
        lead="TechnoSpirit is a technology company working across four disciplines that most businesses are forced to buy separately — engineering, design, AI and growth — and that only work properly when they're decided together."
        register={["Technology", "Design", "AI", "Growth"]}
      />
      <Disciplines />
      <MissionVision />
      <Principles />
    </>
  );
}
