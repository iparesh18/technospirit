# SEO notes

What the repo implements, and the four things it cannot — because they live in
the nginx config on the VPS, which is not in version control.

Referenced from `frontend/src/pages/NotFound.jsx`.

---

## Implemented in the repo

| Concern | Where |
| --- | --- |
| Per-route title, description, canonical, robots, Open Graph, Twitter | `frontend/src/hooks/usePageMeta.js` |
| Schema.org graphs (Organization, WebSite, WebPage, BreadcrumbList, OfferCatalog, ContactPage) | `frontend/src/lib/structuredData.js` |
| Crawl rules | `frontend/public/robots.txt` |
| URL inventory | `frontend/public/sitemap.xml` |
| Share card, 1200×630 | `frontend/public/images/og-technospirit.png` |
| Static fallback card for non-JS scrapers | `frontend/index.html` |
| Google Analytics 4 | `frontend/src/lib/analytics.js` |

Canonical origin is `https://technospirit.tech` — https, no `www`, no trailing
slash — declared once as `SITE_ORIGIN` in `usePageMeta.js` and imported
everywhere else, so the canonical tags, the sitemap and the JSON-LD `@id`
values cannot drift apart.

---

## Google Analytics 4

Property `G-V8406FB2FW`. Implementation is `frontend/src/lib/analytics.js`; the
page_view is fired from `usePageMeta.js`, which is the only place that knows
when a route's title and canonical URL have settled. The marketing routes are
`lazy()`, so a tracker keyed on `useLocation()` would fire while the chunk was
still downloading and report the previous page's title against the new path.

- Inert unless `import.meta.env.PROD` **and** `VITE_GA_MEASUREMENT_ID` are both
  set. gtag.js is never requested in development.
- `send_page_view: false` on `config`, so `trackPageView` is the only source of
  page_view events.
- Deduped on canonical path, so a re-render or a changed description cannot
  produce a second hit for one page.
- `/dashboard/*` is excluded — the operator's own sessions are not audience
  behaviour, and it is excluded from robots.txt and the sitemap for the same
  reason. The 404 route **is** tracked: broken inbound links are worth seeing.
- `page_location` is the canonical URL rather than `window.location.href`, so
  the trailing-slash duplicates described below cannot split one page across
  two rows in the reports.

### Required GA4 console change

**Admin → Data streams → Web → Enhanced measurement → Page views → Show
advanced settings → turn OFF "Page changes based on browser history events".**

That setting is on by default and is currently on for this property. gtag.js
fetches it at load time and patches `history.pushState`, so every client-side
navigation sends a *second* page_view — identifiable by `ae=a`, with no
`page_path`, the raw non-canonical URL, and the previous route's title, since
it fires before React applies the new one.

`send_page_view: false` does not suppress it: that option governs only the hit
`config` sends at initialisation. There is no gtag flag for the history
listener. Until the box is unticked, every SPA navigation is counted twice —
verified against this property, not inferred from the documentation.

### Where `VITE_GA_MEASUREMENT_ID` is configured

In `frontend/.env.production`, committed to the repo.

That is not the obvious answer, so it is worth stating why a GitHub Actions
secret is the wrong home for it. Vite inlines `VITE_*` variables **at build
time**, and `.github/workflows/deploy.yml` does not build on the runner — it
opens an SSH session and runs `npm run build` on the VPS, from a fresh
`git reset --hard origin/main`. A repository secret exists only in the runner's
environment and never reaches that shell, so the build would inline
`undefined` and analytics would silently disable itself in production.

The heredoc makes this stricter than it looks: the workflow uses
`ssh … << 'EOF'`, and the quoted delimiter means nothing in the block is
expanded on the runner. `$VITE_GA_MEASUREMENT_ID` written inside it would be
evaluated on the VPS, where it is unset.

A GA4 measurement ID is not a secret in any case — it is served to every
visitor inside the JS bundle. Committing it is honest about what it is.

If you would rather keep it out of the repo, either alternative works:

1. **A file on the VPS.** Create
   `/var/www/technospirit/technospirit/frontend/.env.production.local` once
   (`.local` is gitignored, and Vite loads it with higher precedence than
   `.env.production`). It survives `git reset --hard` because it is untracked.
2. **Pass it through the deploy.** Add `GA_ID: ${{ secrets.GA_ID }}` to the
   step's `env:`, switch the heredoc to unquoted `<< EOF` so the runner
   expands it, and export it before the build:
   `export VITE_GA_MEASUREMENT_ID='${{ secrets.GA_ID }}'`. Note that unquoting
   the delimiter makes the runner expand *every* `$` in the block, so the
   existing script has to be re-checked for shell variables that must stay
   literal.

Option 1 is the smaller change. The committed file is simpler than either and
is what is in place.

---

## Not fixable from the repo

### 1. Soft 404s

nginx serves the SPA shell for every unmatched path, so `/anything` returns
**HTTP 200** with the 404 component rendered into it. Google calls this a soft
404 and treats it as a thin indexable page.

`NotFound.jsx` emits `noindex, nofollow`, which is what currently keeps these
out of the index. That is a mitigation, not the fix. The fix is a real status
code, and it has to come from the server.

### 2. Trailing-slash and host duplicates

`/about` and `/about/` both return 200. So, unless the server is already
handling it, do `www.technospirit.tech` and the bare `http://` origin.

Every one of those is the same page at a different URL. `usePageMeta` points
the canonical at the single correct form in all cases, which consolidates the
signals — but a 301 is cheaper than asking Google to work it out, and it is the
only thing that stops the duplicates being crawled at all.

Wanted, in nginx:

```nginx
# apex + https only
server {
    listen 80;
    server_name technospirit.tech www.technospirit.tech;
    return 301 https://technospirit.tech$request_uri;
}

server {
    listen 443 ssl;
    server_name www.technospirit.tech;
    return 301 https://technospirit.tech$request_uri;
}

server {
    listen 443 ssl;
    server_name technospirit.tech;
    root /var/www/technospirit/technospirit/frontend/dist;

    # strip the trailing slash on everything except the root
    rewrite ^/(.*)/$ /$1 permanent;

    # real 404s for unmatched paths, SPA shell for known routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`try_files … /index.html` is what produces the soft 404 in §1. Returning a real
404 means enumerating the seven public routes in nginx and falling through to
`error_page 404` for everything else — worth doing, but it makes the route
table exist in two places, so keep it in step with `frontend/src/App.jsx`.

### 3. Prerendering

The head is written by an effect after hydration. Google renders JavaScript
before indexing and reads the head as it finally stands, so this is fine for
search. It is not fine for the social scrapers — Facebook, LinkedIn, WhatsApp,
Slack, iMessage — which read the served HTML and stop.

`index.html` therefore carries a full static card as a floor: a link pasted
into any of them renders the site-level card rather than a grey box. It is
site-level, not per-route. Per-route cards for those clients need prerendering
(`vite-plugin-prerender`, or a prerender service at the edge). Worth doing when
individual pages start being shared; not worth it while the home page is what
gets linked.

### 4. Caching and compression

Not audited here. `dist/assets/*` is content-hashed and can safely take
`Cache-Control: public, max-age=31536000, immutable`; `index.html`,
`robots.txt` and `sitemap.xml` must not. Brotli or gzip on HTML, CSS, JS and
SVG is the single largest remaining Core Web Vitals lever and is pure nginx
config.

---

## Deliberately absent from the structured data

Every value in `structuredData.js` is a fact already published somewhere a
visitor can read it. These are missing because the site does not state them,
and inventing them would put false claims into rich results:

- `telephone`, `email` — the footer marks both pending
- `sameAs` — no social profiles are linked anywhere on the site, and `sameAs`
  is an identity claim about someone else's account
- `foundingDate`, `numberOfEmployees` — no public source
- `aggregateRating`, `review` — there are no published reviews; marking up
  ratings that do not exist earns a manual action
- `priceRange`, `openingHours` — would require `LocalBusiness`, which is a
  claim about premises a customer visits. This business sells remote
  engineering and keeps no public premises, so `Organization` is both the
  honest type and the one that feeds the knowledge panel.

All can be added later from real data without changing the shape.

## Regenerating the share card

`frontend/public/images/og-technospirit.png` is a build artifact of the brand
tokens in `index.css` (paper `#ffffff`, ink `#000000`, signal `#ff2d16`) and
`images/logo-nav.png`. It was generated once with `sharp`; if the wordmark or
the palette changes, regenerate it at 1200×630 and keep the filename, which is
referenced from `usePageMeta.js`, `structuredData.js` and `index.html`.
