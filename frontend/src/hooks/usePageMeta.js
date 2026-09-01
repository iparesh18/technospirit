import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * The canonical production origin: https, no www, no trailing slash.
 *
 * Every absolute URL the site emits — canonical, og:url, sitemap entries,
 * JSON-LD @id values — is built from this one constant, so the three can never
 * disagree with each other. That agreement is the whole point: Google treats a
 * canonical that contradicts the sitemap as a reason to distrust both.
 */
export const SITE_ORIGIN = "https://technospirit.tech";
export const SITE_NAME = "TechnoSpirit";

/** Share card used when a route does not name its own. 1200x630. */
export const DEFAULT_SHARE_IMAGE = `${SITE_ORIGIN}/images/og-technospirit.png`;

/**
 * Marks the head elements this hook owns.
 *
 * Without it, cleanup would have to guess which tags were ours and which came
 * from index.html — and removing index.html's own <meta name="description">
 * on a route change would leave a page with none at all for the moment before
 * the next one mounts. Tags we adopt from index.html are updated in place and
 * never removed; only tags we created carry this attribute.
 */
const MANAGED = "data-ts-meta";

/**
 * Collapses a location pathname to its canonical form.
 *
 * nginx serves the SPA shell for `/about` and `/about/` alike, so both resolve
 * and both return 200. That is two URLs for one page. Stripping the trailing
 * slash here means whichever one a visitor or a crawler arrives on, the
 * canonical points at the same single address — which is what actually
 * consolidates the ranking signals, since the redirect that would be cleaner
 * has to live in nginx and is not ours to write from the repo.
 */
function canonicalPath(pathname) {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Finds a head element by one identifying attribute and sets its content,
 * creating it if it is not already there.
 *
 * The find-then-create order is what lets the tags already present in
 * index.html be reused rather than duplicated. Two <meta name="description">
 * elements is not a syntax error, and that is exactly why it is worth
 * avoiding: nothing warns, and Google picks whichever it likes.
 */
function setTag(tagName, keyAttr, keyValue, valueAttr, value) {
  const selector = `${tagName}[${keyAttr}="${keyValue}"]`;
  let el = document.head.querySelector(selector);

  if (!el) {
    el = document.createElement(tagName);
    el.setAttribute(keyAttr, keyValue);
    el.setAttribute(MANAGED, "");
    document.head.appendChild(el);
  }

  el.setAttribute(valueAttr, value);
  return el;
}

function dropManaged(selector) {
  document.head.querySelectorAll(`${selector}[${MANAGED}]`).forEach((el) => el.remove());
}

/**
 * Per-route document head: title, description, canonical, robots directives,
 * Open Graph, Twitter cards and JSON-LD.
 *
 * This is a client-side SPA, so all of it is written after hydration. That is
 * fine for Google — it renders JavaScript before indexing and reads the head
 * as it stands at the end of the render pass — and it is the reason the tags
 * are set from an effect rather than injected into index.html, which can only
 * ever describe one route.
 *
 * It is *not* fine for the crawlers that do not run JavaScript, which is a
 * genuine limitation and the reason the og:image and site-level identity also
 * exist as static tags in index.html: a social scraper that reads only the
 * shell still gets a correct card for the site, just not a per-route one.
 *
 * @param {object}   opts
 * @param {string}   opts.title        Document title. Unique per route.
 * @param {string}   opts.description  Meta description. Unique per route.
 * @param {string}  [opts.image]       Absolute or root-relative share image.
 * @param {string}  [opts.type]        og:type. Defaults to "website".
 * @param {boolean} [opts.noindex]     Emit `noindex, nofollow`.
 * @param {object|object[]} [opts.jsonLd] Schema.org graph for this route.
 */
export default function usePageMeta({
  title,
  description,
  image,
  type = "website",
  noindex = false,
  jsonLd,
}) {
  const { pathname } = useLocation();

  /**
   * The graph is compared by value, not by reference.
   *
   * A caller that writes its schema as an inline object literal hands this
   * hook a fresh object on every render. As a dependency that object never
   * compares equal, so the effect would re-run on every render and the
   * <script> tags would be torn down and rebuilt continuously. Serialising it
   * once here makes the dependency the *content* of the graph, which is what
   * actually decides whether the head needs rewriting — and it is the string
   * the effect wants anyway.
   */
  const jsonLdKey = jsonLd
    ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    : "";

  useEffect(() => {
    const path = canonicalPath(pathname);
    const url = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
    const shareImage = image
      ? image.startsWith("http")
        ? image
        : `${SITE_ORIGIN}${image}`
      : DEFAULT_SHARE_IMAGE;

    if (title) document.title = title;

    if (description) {
      setTag("meta", "name", "description", "content", description);
    }

    /* ── canonical ──────────────────────────────────────────────────── */
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      canonical.setAttribute(MANAGED, "");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    /* ── indexing directives ────────────────────────────────────────── */
    if (noindex) {
      setTag("meta", "name", "robots", "content", "noindex, nofollow");
    } else {
      // `max-image-preview:large` is what allows a full-width image in a
      // result and in Discover; the other two lift the default snippet caps.
      setTag(
        "meta",
        "name",
        "robots",
        "content",
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      );
    }

    /* ── Open Graph ─────────────────────────────────────────────────── */
    setTag("meta", "property", "og:site_name", "content", SITE_NAME);
    setTag("meta", "property", "og:type", "content", type);
    setTag("meta", "property", "og:url", "content", url);
    setTag("meta", "property", "og:locale", "content", "en_US");
    if (title) setTag("meta", "property", "og:title", "content", title);
    if (description) setTag("meta", "property", "og:description", "content", description);
    setTag("meta", "property", "og:image", "content", shareImage);
    setTag("meta", "property", "og:image:width", "content", "1200");
    setTag("meta", "property", "og:image:height", "content", "630");
    // Every route's title already ends in "— TechnoSpirit" (or, on the home
    // page, begins with it), so prefixing the brand again produced
    // "TechnoSpirit — TechnoSpirit — …". The title alone is the description.
    setTag("meta", "property", "og:image:alt", "content", title || SITE_NAME);

    /* ── Twitter / X ────────────────────────────────────────────────── */
    setTag("meta", "name", "twitter:card", "content", "summary_large_image");
    if (title) setTag("meta", "name", "twitter:title", "content", title);
    if (description) setTag("meta", "name", "twitter:description", "content", description);
    setTag("meta", "name", "twitter:image", "content", shareImage);

    /* ── JSON-LD ────────────────────────────────────────────────────────
       Replaced wholesale on every route change rather than diffed. A stale
       graph describing the previous page is worse than none: it would claim,
       with structured confidence, that /contact is the services catalogue. */
    dropManaged('script[type="application/ld+json"]');

    if (jsonLdKey) {
      JSON.parse(jsonLdKey).forEach((node) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute(MANAGED, "");
        script.textContent = JSON.stringify(node);
        document.head.appendChild(script);
      });
    }

    return () => {
      // Only the graph is torn down. Title, description, canonical, robots and
      // the card tags are overwritten by the next route's effect, and removing
      // them here would leave a frame in which the document describes nothing.
      dropManaged('script[type="application/ld+json"]');
    };
  }, [pathname, title, description, image, type, noindex, jsonLdKey]);
}
