import PageOpener from "@/components/layout/PageOpener";
import Reasons from "@/components/why-us/Reasons";
import NoList from "@/components/why-us/NoList";
import usePageMeta from "@/hooks/usePageMeta";
import { siteGraph, webPage, breadcrumbList } from "@/lib/structuredData";

// Title realigned to the nav label ("Why Us") and to the pattern every other
// route uses. It read "Why TechnoSpirit", which was the one page whose title,
// nav anchor and URL slug all disagreed — and a sitelink label is chosen from
// exactly that agreement.
const NAME = "Why Us — TechnoSpirit";
const DESCRIPTION =
  "Custom engineering, AI-first development, interface quality, performance, scalability and long-term support — stated plainly, without invented proof.";

const JSON_LD = [
  ...siteGraph,
  webPage({ path: "/why-us", name: NAME, description: DESCRIPTION, breadcrumb: true }),
  breadcrumbList({ path: "/why-us", name: "Why Us" }),
];

export default function WhyUs() {
  usePageMeta({ title: NAME, description: DESCRIPTION, jsonLd: JSON_LD });

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
