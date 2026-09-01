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

Canonical origin is `https://technospirit.tech` — https, no `www`, no trailing
slash — declared once as `SITE_ORIGIN` in `usePageMeta.js` and imported
everywhere else, so the canonical tags, the sitemap and the JSON-LD `@id`
values cannot drift apart.

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
