import Hero from "@/components/home/Hero";
import Manifesto from "@/components/home/Manifesto";
import HorizontalServices from "@/components/home/HorizontalServices";
import WebSystem from "@/components/home/WebSystem";
import AiSystem from "@/components/home/AiSystem";
import DigitalGrowth from "@/components/home/DigitalGrowth";
import GlobalPositioning from "@/components/home/GlobalPositioning";
import Process from "@/components/home/Process";
import WhyStrip from "@/components/home/WhyStrip";
import FinalCta from "@/components/home/FinalCta";
import usePageMeta from "@/hooks/usePageMeta";

/**
 * Motion rhythm across the page:
 * HERO high → MANIFESTO calm → HORIZONTAL high → WEB medium →
 * AI medium → GROWTH medium → GLOBAL calm → PROCESS medium →
 * WHY calm → CTA strong.
 */
export default function Home() {
  usePageMeta({
    title: "TechnoSpirit — Build. Automate. Scale. Without Borders.",
    description:
      "TechnoSpirit engineers websites, AI automation and digital growth systems for businesses, teams and markets across time zones.",
  });

  return (
    <>
      <Hero />
      <Manifesto />
      <HorizontalServices />
      <WebSystem />
      <AiSystem />
      <DigitalGrowth />
      <GlobalPositioning />
      <Process />
      <WhyStrip />
      <FinalCta />
    </>
  );
}
