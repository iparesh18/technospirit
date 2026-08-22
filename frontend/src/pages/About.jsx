import PageOpener from "@/components/layout/PageOpener";
import Disciplines from "@/components/about/Disciplines";
import MissionVision from "@/components/about/MissionVision";
import Principles from "@/components/about/Principles";
import usePageMeta from "@/hooks/usePageMeta";

export default function About() {
  usePageMeta({
    title: "About — TechnoSpirit",
    description:
      "TechnoSpirit works across four disciplines businesses are usually forced to buy separately: technology, design, AI and growth.",
  });

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
