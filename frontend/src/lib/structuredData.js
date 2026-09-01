import { SITE_ORIGIN, SITE_NAME } from "@/hooks/usePageMeta";

/**
 * Schema.org graphs for the public site.
 *
 * Ground rule for everything in this file: every value is a fact that is
 * already stated somewhere a visitor can read it — the footer's registered
 * address, the services catalogue on /services, the page titles. Nothing here
 * is inferred, rounded up, or filled in with a plausible-sounding guess.
 *
 * That is why several properties Google will happily consume are absent:
 *
 *   telephone, email      the footer marks both "pending" — they are genuinely
 *                         unpublished, and inventing them would put a wrong
 *                         contact route into a rich result
 *   foundingDate,         no public source on the site
 *   numberOfEmployees
 *   sameAs                no social profiles are linked anywhere on the site,
 *                         and sameAs is an identity claim — a guessed handle
 *                         is a claim about someone else's account
 *   aggregateRating,      there are no published reviews. Marking up ratings
 *   review                that do not exist is the single fastest way to earn
 *                         a manual action, quite apart from being false
 *
 * They can all be added later, from real data, without changing the shape.
 */

/** Stable @id anchors, so the nodes can reference each other by identity. */
const ORG_ID = `${SITE_ORIGIN}/#organization`;
const SITE_ID = `${SITE_ORIGIN}/#website`;

/**
 * Organization, not LocalBusiness.
 *
 * The registered address is real and is published in the footer, so it is
 * included. But LocalBusiness is a claim about a *place of business a customer
 * visits* — it carries openingHours, priceRange, areaServed and a Maps-facing
 * intent that this business does not match: TechnoSpirit sells remote
 * engineering across time zones, publishes no phone number, and keeps no
 * public premises. Marking it up as a local business would be asking Google to
 * rank it in a map pack it has no reason to appear in, on the strength of an
 * address that is administrative rather than commercial.
 *
 * ProfessionalService/LocalBusiness becomes the right type the day there is a
 * published phone number and stated hours. Until then Organization is both the
 * honest type and the one that actually feeds the knowledge panel.
 */
export const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  legalName: "TechnoSpirit LLC",
  url: `${SITE_ORIGIN}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_ORIGIN}/images/logo-nav.png`,
    width: 1200,
    height: 469,
  },
  image: `${SITE_ORIGIN}/images/og-technospirit.png`,
  description:
    "TechnoSpirit is a technology company that builds websites, custom web software, AI automation, AI voice calling agents and digital growth systems for businesses operating across time zones.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "319 Upas Ave S",
    addressLocality: "Galloway",
    addressRegion: "NJ",
    postalCode: "08205",
    addressCountry: "US",
  },
  /**
   * The entity's subject matter, in the site's own words.
   *
   * This is the property that does the most work for AI search: it states, in
   * one machine-readable place, the set of things this company is about,
   * rather than leaving a model to infer it from prose scattered over seven
   * routes. Every entry below is a service with its own section on /services.
   */
  knowsAbout: [
    "Web development",
    "Website creation",
    "Responsive web design",
    "Website maintenance",
    "Search engine optimisation",
    "Custom web software",
    "AI integration",
    "AI automation",
    "AI voice calling agents",
    "Voice agent dashboards",
    "AI chatbots",
    "Digital growth",
  ],
};

/**
 * No `potentialAction`/SearchAction here on purpose: the sitelinks search box
 * it powers requires a real on-site search endpoint, and this site has none.
 * Declaring one would point Google at a URL that 404s into the SPA shell.
 */
export const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": SITE_ID,
  url: `${SITE_ORIGIN}/`,
  name: SITE_NAME,
  publisher: { "@id": ORG_ID },
  inLanguage: "en-US",
};

/** A WebPage node bound to the site and organisation by reference. */
export function webPage({ path, name, description, breadcrumb }) {
  const url = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;

  const node = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en-US",
  };

  if (breadcrumb) node.breadcrumb = { "@id": `${url}#breadcrumb` };

  return node;
}

/**
 * BreadcrumbList for a one-level-deep page.
 *
 * The site's hierarchy really is this flat — Home, then six siblings — and
 * saying so plainly is the useful thing. A fabricated intermediate tier
 * ("Home › Company › About") would describe a structure the navigation does
 * not have and no link on the site follows.
 */
export function breadcrumbList({ path, name }) {
  const url = `${SITE_ORIGIN}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_ORIGIN}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: url,
      },
    ],
  };
}

/**
 * The services catalogue as an OfferCatalog.
 *
 * Names and descriptions are lifted verbatim from the GROUPS array that
 * renders /services, so the markup and the visible page cannot drift apart —
 * which is both a correctness property and the thing Google checks for.
 *
 * No `offers`/`price`: nothing on this site publishes a price, and an empty or
 * invented one is worse than none.
 */
export function serviceCatalog(groups) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${SITE_ORIGIN}/services#catalog`,
    name: "TechnoSpirit services",
    url: `${SITE_ORIGIN}/services`,
    provider: { "@id": ORG_ID },
    itemListElement: groups.map((group, i) => ({
      "@type": "OfferCatalog",
      position: i + 1,
      name: group.name,
      description: group.lead,
      itemListElement: group.entries.map((entry, j) => ({
        "@type": "Offer",
        position: j + 1,
        itemOffered: {
          "@type": "Service",
          name: entry.name,
          description: entry.body,
          serviceType: entry.name,
          provider: { "@id": ORG_ID },
        },
      })),
    })),
  };
}

/**
 * The two nodes every public page carries.
 *
 * Repeating the organisation on each route is deliberate and is how a
 * client-rendered site has to do it: there is no shared server-rendered shell
 * to hang a site-wide graph on, and a crawler that lands directly on /contact
 * should still learn who publishes it. The @id keeps the repetitions the same
 * entity rather than seven different ones.
 */
export const siteGraph = [organization, website];
