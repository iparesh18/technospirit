import PageOpener from "@/components/layout/PageOpener";
import ServiceGroup from "@/components/services/ServiceGroup";
import Marquee from "@/components/ui/Marquee";
import usePageMeta from "@/hooks/usePageMeta";
import { siteGraph, webPage, breadcrumbList, serviceCatalog } from "@/lib/structuredData";

const GROUPS = [
  {
    id: "01",
    slug: "web",
    tag: "WEB",
    name: "Web",
    lead: "The part of the business that runs whether or not anyone is at a desk.",
    entries: [
      {
        name: "Website Creation",
        body: "Modern, responsive websites built around how a business actually presents and sells — structure and content decided before styling begins.",
      },
      {
        name: "Responsive Web Design",
        body: "Composed for desktop, laptop, tablet and phone as separate design problems, not one layout squeezed through breakpoints.",
      },
      {
        name: "Website Maintenance",
        body: "Security patching, dependency updates, performance monitoring and ongoing technical support once the site is live.",
      },
      {
        name: "SEO",
        body: "Technical and on-page search optimisation — semantics, performance, crawlability and content structure — for durable organic visibility.",
      },
      {
        name: "Website Dashboard",
        body: "A private control surface for the people running the business: analytics, user activity, content management, reports and business statistics in one place.",
        items: ["Analytics", "User Monitoring", "Content Management", "Reports", "Statistics"],
      },
      {
        name: "Custom Web Solutions",
        body: "When an off-the-shelf product would mean changing how the business works, we build the system around the operation instead.",
        items: [
          "E-Commerce",
          "LMS",
          "Online Classes",
          "CRM",
          "Booking Systems",
          "Dashboards",
          "SaaS",
          "Custom Business Software",
        ],
      },
    ],
  },
  {
    id: "02",
    slug: "ai",
    tag: "AI",
    name: "AI",
    lead: "Applied where it removes real work — and deliberately left out where it doesn't.",
    entries: [
      {
        name: "AI Tools Integration",
        body: "Modern AI capability connected into the workflows and tools a team already uses, rather than added as another place to log in.",
      },
      {
        name: "Custom AI Automation",
        body: "Repetitive operational work — triage, routing, drafting, data entry, follow-up — moved into systems that run without supervision.",
      },
      {
        name: "AI Voice Calling Agents",
        body: "Agents that handle real conversations on the phone, in both directions, and escalate to a person the moment that's the right call.",
        items: [
          "Inbound Calls",
          "Outbound Calls",
          "Customer Support",
          "Lead Qualification",
          "Follow-Ups",
          "Appointment Booking",
          "FAQs",
        ],
      },
      {
        name: "Voice Agent Dashboards",
        body: "Everything the agent did, reviewable: what was said, what it concluded, and what it produced.",
        items: [
          "Recordings",
          "Transcripts",
          "Summaries",
          "Analytics",
          "Performance Reports",
          "Lead Information",
        ],
      },
      {
        name: "AI Chatbots",
        body: "One assistant across the website, WhatsApp and messaging platforms — same knowledge, same tone, available continuously.",
        items: [
          "Websites",
          "WhatsApp",
          "Messaging Platforms",
          "Support",
          "Lead Capture",
          "FAQs",
          "Conversation Automation",
          "24/7 Engagement",
        ],
      },
    ],
  },
  {
    id: "03",
    slug: "growth",
    tag: "GROWTH",
    name: "Growth",
    lead: "Building it is half the job. Being found is the other half.",
    entries: [
      {
        name: "Social Media Management",
        body: "Strategy, content production, scheduling and audience development held to one consistent brand voice across channels.",
        items: ["Strategy", "Content", "Scheduling", "Audience Development", "Brand Consistency"],
      },
      {
        name: "Meta Ads",
        body: "Facebook and Instagram campaigns built for lead generation, then actively managed and optimised against what converts.",
        items: [
          "Facebook",
          "Instagram",
          "Lead Generation",
          "Campaign Management",
          "Campaign Optimisation",
        ],
      },
      {
        name: "Content Creation",
        body: "Graphics, video, captions and advertising creative produced as an ongoing system rather than one-off assets.",
        items: ["Graphics", "Videos", "Captions", "Advertising Content", "Digital Assets"],
      },
    ],
  },
];

const NAME = "Services — TechnoSpirit";
const DESCRIPTION =
  "Web development, custom web solutions, AI automation, voice agents, chatbots, social media, Meta Ads and content creation.";

/**
 * The catalogue is derived from GROUPS, not restated alongside it.
 *
 * `serviceCatalog` walks the same array that renders the page below, so the
 * Service names and descriptions in the markup are the ones a visitor reads —
 * they cannot drift apart, and adding a service to GROUPS adds it to the
 * structured data without anyone remembering to. That equivalence between
 * visible content and markup is the thing Google actually checks for.
 */
const JSON_LD = [
  ...siteGraph,
  webPage({ path: "/services", name: NAME, description: DESCRIPTION, breadcrumb: true }),
  breadcrumbList({ path: "/services", name: "Services" }),
  serviceCatalog(GROUPS),
];

export default function Services() {
  usePageMeta({ title: NAME, description: DESCRIPTION, jsonLd: JSON_LD });

  return (
    <>
      <PageOpener
        kicker="SERVICES / FULL INDEX"
        lines={["Everything", "we build."]}
        lead="Three groups of capability that are normally sold by three different companies. Here they're decided together, which is the only way the handoffs stop costing you anything."
        register={["Web", "AI", "Growth"]}
      />

      <div className="border-y border-ink bg-white py-4">
        <Marquee
          items={[
            "WEB DEVELOPMENT",
            "AI AUTOMATION",
            "VOICE AGENTS",
            "CHATBOTS",
            "CUSTOM SOFTWARE",
            "META ADS",
            "CONTENT",
          ]}
          duration={42}
          itemClassName="ts-display-wide text-[clamp(1.1rem,3vw,2.2rem)] text-ink"
          separator="／"
        />
      </div>

      {GROUPS.map((group, i) => (
        <ServiceGroup key={group.id} group={group} zone={i % 2 === 1 ? "ink" : "paper"} />
      ))}
    </>
  );
}
