import PageOpener from "@/components/layout/PageOpener";
import Reasons from "@/components/why-us/Reasons";
import NoList from "@/components/why-us/NoList";
import usePageMeta from "@/hooks/usePageMeta";

export default function WhyUs() {
  usePageMeta({
    title: "Why TechnoSpirit",
    description:
      "Custom engineering, AI-first development, interface quality, performance, scalability and long-term support — stated plainly, without invented proof.",
  });

  return (
    <>
      <PageOpener
        zone="ink"
        kicker="WHY / TECHNOSPIRIT"
        lines={["No claims", "we can't", "back up."]}
        lead="Most agency sites open with numbers nobody can verify. This one doesn't. What follows is what we actually do, how we work, and the things we refuse to do — all of it checkable against the work itself."
        register={["Engineering", "Interface", "Automation", "Support"]}
      />
      <Reasons />
      <NoList />
    </>
  );
}
