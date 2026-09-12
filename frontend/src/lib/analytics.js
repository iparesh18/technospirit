/**
 * Google Analytics 4.
 *
 * The whole module is inert unless two conditions hold: this is a production
 * build, and a measurement ID was present at build time.
 *
 * Both are enforced at run time by `analyticsEnabled`, which every entry point
 * checks before doing anything. That is the actual guarantee, and it holds in
 * the dev server too — where Vite serves modules unbundled and there is no
 * Rollup pass to eliminate anything. gtag.js is never requested while
 * developing because the guard returns first, not because the code is gone.
 *
 * In a production build the guard additionally folds to a literal `true`,
 * since Vite substitutes `import.meta.env.*` as constants before minification.
 */

/**
 * Build-time, not run-time.
 *
 * `import.meta.env.VITE_GA_MEASUREMENT_ID` is substituted into the bundle by
 * Vite during `npm run build`. It is not read from the server at run time, so
 * the variable has to exist in the environment of whatever process runs the
 * build — which, for this project, is the VPS, not the GitHub Actions runner.
 * See SEO-NOTES.md.
 */
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * A GA4 measurement ID is not a secret — it ships in the client bundle and is
 * readable by every visitor. It is an environment variable so the value is not
 * scattered through the source and so development never reports into the
 * production property, not to keep it hidden.
 */
export const analyticsEnabled = Boolean(import.meta.env.PROD && GA_MEASUREMENT_ID);

/** Guards the one-time script injection against a second call. */
let initialised = false;

/**
 * The last canonical path reported, so the same page cannot be counted twice.
 *
 * This is the real duplicate-suppression mechanism, and it is deliberately
 * keyed on the path rather than on a "have I run yet" flag. Callers can fire
 * for reasons that are not navigations — a re-render, a changed description,
 * StrictMode's double effect — and every one of them is the same page. Keying
 * on identity makes all of those idempotent without the caller having to know
 * which of them it is.
 */
let lastPath = null;

/**
 * The canonical gtag shim, in Google's own shape.
 *
 * `arguments` rather than a rest parameter on purpose: gtag.js reads the
 * pushed value as an `Arguments` object, and pushing a real Array — which
 * `(...args) => dataLayer.push(args)` would do — is not the same thing to it.
 */
function gtag() {
  window.dataLayer.push(arguments);
}

/**
 * Loads gtag.js exactly once and configures the property.
 *
 * `send_page_view: false` is the load-bearing option. By default `config`
 * sends a page_view immediately, which on a SPA would mean one automatic hit
 * for the first route plus one manual hit for every route including the first
 * — the first page a visitor sees counted twice, every time. Turning it off
 * makes `trackPageView` the single source of page_view events.
 *
 * IT DOES NOT COVER EVERYTHING. `send_page_view` governs only the hit that
 * `config` itself sends. Enhanced Measurement's "page changes based on browser
 * history events" is a separate, property-level setting that gtag.js fetches
 * from Google at load time, and it patches history.pushState to send its own
 * page_view on every client-side navigation. Measured against this property,
 * that produces a second hit per navigation, distinguishable by `ae=a`, with
 * no `page_path`, the raw non-canonical URL, and the *previous* route's title
 * — because it fires before React has applied the new one.
 *
 * There is no gtag flag that turns that off; it is switched off in the GA4
 * console, and until it is, every SPA navigation is counted twice. See
 * SEO-NOTES.md for the exact path through the UI. Nothing in this file can
 * compensate for it, which is precisely why it is written down here.
 */
function init() {
  if (initialised || !analyticsEnabled) return;
  initialised = true;

  window.dataLayer = window.dataLayer || [];

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
}

/**
 * Reports one page view.
 *
 * Called from `usePageMeta`, which is the only place that knows when a route's
 * title and canonical URL have actually been applied. That matters here more
 * than it looks: the marketing routes are `lazy()`, so on a cold navigation
 * React commits the new location while the route chunk is still in flight. A
 * tracker keyed on `useLocation().pathname` would fire during that gap and
 * report the *previous* page's title against the new path. Hanging the event
 * off the metadata effect means it cannot run before the metadata it describes.
 *
 * @param {object} opts
 * @param {string} opts.path   Canonical pathname, e.g. "/about".
 * @param {string} opts.url    Absolute canonical URL.
 * @param {string} [opts.title] Document title for this route.
 */
export function trackPageView({ path, url, title }) {
  if (!analyticsEnabled) return;

  // The admin area is a private operational tool, not audience behaviour.
  // Counting it would mix the operator's own sessions into the marketing
  // numbers — the same reason robots.txt and the sitemap exclude it. The 404
  // route is deliberately NOT excluded: broken inbound links are worth seeing.
  if (path.startsWith("/dashboard")) return;

  if (path === lastPath) return;
  lastPath = path;

  init();

  /**
   * `page_location` is the canonical URL, not `window.location.href`.
   *
   * nginx serves `/about` and `/about/` alike and both return 200, so the raw
   * URL would split one page across two rows in every report. Reporting the
   * same address the canonical tag and the sitemap declare keeps the analytics
   * consistent with the SEO — one page, one identity, in all three places.
   */
  gtag("event", "page_view", {
    page_location: url,
    page_path: path,
    page_title: title,
  });
}
