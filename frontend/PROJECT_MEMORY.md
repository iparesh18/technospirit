# TechnoSpirit Project Memory

> Read this file FIRST before any future task on this project.
> The newest instruction from the user always overrides anything written here.

---

## Current Phase

**PHASE 2 — Backend is live.** (Phase 1, frontend-only, is complete.)

Shipped in Phase 2 so far: the contact API, the Inquiry model, Nodemailer with
both transactional emails, JWT/cookie admin auth, and the admin dashboard.
See **PHASE 2 — CONTACT + DASHBOARD** near the bottom of this file.

Still NOT started: payments, CMS, deployment, the four future dashboard
modules (AI Conversations, Leads, Analytics, Settings).

---

## Current Stack

Root has exactly two app folders: `frontend/` and `backend/`.
(`.claude/` at root is tooling config, not an app folder.)

### frontend/
| Package | Purpose |
|---|---|
| `react` 19 / `react-dom` 19 | UI |
| `vite` 8 + `@vitejs/plugin-react` | build (JavaScript, **not** TypeScript) |
| `tailwindcss` 4 + `@tailwindcss/vite` | CSS-first config — **no `tailwind.config.js`** |
| `shadcn` 4 + `radix-ui` | component primitives |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | shadcn deps |
| `gsap` 3.15 + `@gsap/react` | motion + ScrollTrigger + ScrambleTextPlugin |
| `lenis` 1.3 | smooth scroll |
| `react-router-dom` 7 | routing |
| `lucide-react` | icons |
| `@fontsource-variable/archivo` | display + body font (self-hosted) |
| `@fontsource-variable/jetbrains-mono` | mono/system-label font (self-hosted) |

**Dead dependency:** `@fontsource-variable/geist` — installed by the shadcn
preset, no longer imported. Safe to uninstall.

### backend/
| Package | Purpose |
|---|---|
| `express` 5 | HTTP + routing |
| `mongoose` 9 | MongoDB ODM |
| `nodemailer` 9 | Gmail SMTP |
| `bcryptjs` 3 | password hashing (cost 12) |
| `jsonwebtoken` 9 | session token |
| `cookie-parser` | reads the HttpOnly auth cookie |
| `cors`, `helmet` | origin allowlist, security headers |
| `express-rate-limit` 8 | login / contact / admin-API limits |
| `express-validator` 7 | server-side request validation |
| `dotenv` | `.env` loading |

ESM throughout (`"type": "module"`).

---

## Design Direction

Derived by consulting the **UI/UX Pro Max** skill (installed, see below).

**Locked art direction: Swiss Modernism 2.0 × Minimalist Monochrome.**

- Strict 12-column grid, mathematical 8px-based spacing.
- **Zero border-radius everywhere.** No shadows. No gradients. No glass.
- Hard rules and hairlines carry the structure; visible vertical column rules.
- 3.2% SVG paper-grain overlay (fixed, `mix-blend-multiply`).
- Typography **is** the interface — huge editorial display type.
- Deliberately avoided: purple/blue gradients, glow, blobs, bento grids,
  rounded cards, identical feature cards, fake dashboards.

### Typography (2 families only)
- **Archivo Variable** — `wght 100..900` **and `wdth 62%..125%`**.
  The width axis is the art direction. Controlled with `font-stretch`, not
  `font-variation-settings`.
  - `.ts-display` → wdth 92%, tracking -0.045em, lh 0.82
  - `.ts-display-tight` → wdth 78% — the giant statements
  - `.ts-display-wide` → wdth 118% — wordmark + section stamps
  - `.ts-body` → wdth 100%
- **JetBrains Mono Variable** — `.ts-label`, all system microcopy
  (node IDs, coordinates, status flags). **Min font-size floored at 11px.**

Fonts are **self-hosted via @fontsource** and imported at the top of
`index.css`. Do NOT reintroduce a Google Fonts `<link>` — it was removed
because the CDN is blocked in some environments and the site fell back to
Arial, which broke the width-axis art direction.

---

## Brand Rules

```
WHITE = SPACE   BLACK = STRUCTURE   RED = SIGNAL / ACTION
```

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#ffffff` | ground |
| `--color-ink` | `#000000` | structure, type |
| `--color-signal` | `#ff2d16` | graphics, large type, indicators (3.7:1 on white → large text / graphics only) |
| `--color-signal-ink` | `#d91a05` | **small** red text on white (5.1:1 — AA) |
| `--color-ash` | `#6b6b6b` | muted body text on white (5.4:1) |
| `--color-hair` | `#e4e4e4` | hairlines on white |

Red stays scarce: indicators, hover states, active nav, section numbers,
node dots, connector lines, the cursor.

**The single full-bleed red moment on the site is `FinalCta` on Home.**
It uses **black text on `--color-signal`** (5.6:1 — passes AA) rather than
white on red (would have failed at 3.7:1). Do not invert this.

### Zone system (important)
Every section declares `data-zone="paper"` or `data-zone="ink"`. That
attribute re-points the whole shadcn token contract (`--background`,
`--foreground`, `--border`, `--ring`…), so shadcn primitives, borders and
focus rings adapt automatically inside black sections. Prefer adding a zone
over hand-colouring components.

---

## Architecture

```
technospirit/
├── .claude/skills/          # UI/UX Pro Max (installed via its own CLI)
├── frontend/
│   ├── PROJECT_MEMORY.md    # this file
│   ├── index.html           # no font CDN link — fonts come from index.css
│   ├── vite.config.js       # @ alias → ./src, tailwind plugin
│   ├── jsconfig.json        # @/* path mapping (needed by shadcn CLI)
│   ├── components.json      # shadcn config (tsx:false, radix-nova)
│   └── src/
│       ├── index.css        # THE design system — tokens, utilities, a11y
│       ├── App.jsx          # router + providers + ScrollSync
│       ├── main.jsx
│       ├── lib/
│       │   ├── gsap.js      # single plugin registration point
│       │   └── utils.js     # shadcn cn()
│       ├── hooks/
│       │   ├── useWorldClock.js   # live tz clocks, ticks once a minute
│       │   └── usePageMeta.js     # per-route title + description
│       ├── components/
│       │   ├── ui/          # button/accordion/dialog (shadcn) + own primitives
│       │   ├── motion/      # React Bits ports — see the table further down.
│       │   │                #   NOT verbatim installs; each was rewritten.
│       │   ├── layout/      # SmoothScroll, Nav, Footer, Cursor,
│       │   │                #   RouteTransition, PageOpener
│       │   ├── home/        # 10 section components
│       │   ├── about/       # Disciplines, MissionVision, Principles
│       │   ├── services/    # ServiceGroup
│       │   ├── why-us/      # Reasons, NoList
│       │   ├── contact/     # ContactForm, FormField, ContactCTA,
│       │   │                #   HoverImageReveal
│       │   ├── lab/         # the cinematic sequence
│       │   └── dashboard/   # DashboardLayout, ProtectedRoute,
│       │                    #   InquiryDetail, StatusPill
│       ├── context/         # authContext.js (+ useAuth), AuthProvider.jsx
│       ├── styles/
│       │   └── dashboard.css  # admin surface — @imported by index.css
│       ├── lib/
│       │   ├── api.js       # THE only place that talks to the API
│       │   └── formatDate.js
│       └── pages/
│           ├── Home, About, Services, WhyUs, Contact, Lab, NotFound
│           └── dashboard/   # Login, Overview, Inquiries
└── backend/                 # IMPLEMENTED — see backend/README.md
    ├── config/      env.js (validated at boot), db.js
    ├── controllers/ contact, auth, adminInquiry
    ├── middleware/  requireAuth, rateLimiters, validate, errorHandler
    ├── models/      Inquiry.js, Admin.js
    ├── routes/      contact, auth, admin, index
    ├── services/    mailer.js, emailTemplates.js
    ├── utils/       AppError, sanitize, token, bootstrapAdmin, seedDev
    ├── app.js  server.js  package.json
    ├── .env.example   .env (gitignored, never committed)
    └── README.md
```

**Content lives inside its component** — there is no `data/` folder and none
should be created (explicit user instruction).

---

## Routes

| Path | Page | Notes |
|---|---|---|
| `/` | `Home.jsx` | 10 sections, ~17.5k px tall at 1440 |
| `/about` | `About.jsx` | opener + Disciplines + MissionVision + Principles |
| `/services` | `Services.jsx` | opener + marquee + 3 × ServiceGroup |
| `/why-us` | `WhyUs.jsx` | ink opener + Reasons + NoList |
| `/contact` | `Contact.jsx` | hover-image intent list + brief form |
| `/lab` | `Lab.jsx` | scroll-scrubbed cinematic — see **/lab** below |
| `*` | `NotFound.jsx` | 404 |

**Admin routes** — not in `NAV_ITEMS`, not linked from anywhere public:

| Path | Page | Notes |
|---|---|---|
| `/dashboard/login` | `dashboard/Login.jsx` | public; redirects away if already signed in |
| `/dashboard` | `dashboard/Overview.jsx` | protected — counts from Mongo |
| `/dashboard/inquiries` | `dashboard/Inquiries.jsx` | protected — list |
| `/dashboard/inquiries/:id` | same component | protected — list + detail pane |

The router has **two layout routes**, and the split is load-bearing:
`<MarketingShell>` carries Lenis, GSAP, the cursor follower, the route wipe,
Nav and Footer; `<AdminShell>` carries none of them. See **PHASE 2** below.

---

## Animation System

### Lenis (`components/layout/SmoothScroll.jsx`)
- `duration: 1.05`, custom expo easing, `syncTouch: false` (native momentum
  on touch — do not fight the OS).
- **`autoRaf: false`** — GSAP's ticker drives `lenis.raf()` so the two never
  run on separate RAF loops (that mismatch is what causes pin jitter).
- `lenis.on("scroll", ScrollTrigger.update)`.
- No `scrollerProxy` needed — Lenis drives real window scroll.
- Under `prefers-reduced-motion`, **Lenis is never instantiated**; native
  scroll only.
- Exposes context: `{ lenis, stop, start, scrollTo }`.

### GSAP (`lib/gsap.js`)
Single registration point for `ScrollTrigger` + `useGSAP`. Always import gsap
from here, never from `"gsap"` directly.

Cleanup is handled by `useGSAP({ scope })` contexts; components that create
raw `ScrollTrigger.create()` return a cleanup that kills them.

### Two rules that are load-bearing (both cost a real bug this session)

1. **Never animate `yPercent` / `scaleX` *to* a value whose start comes from
   a CSS percentage transform.** The browser resolves it to a matrix before
   GSAP reads it, the unit is gone, and GSAP records `y: 161px, yPercent: 0`.
   Use `fromTo` with the start stated, or `gsap.set` it first.
2. **Never put a Tailwind `scale-*` or `translate-*` utility on an element
   GSAP transforms.** Tailwind v4 compiles those to the standalone `scale` /
   `translate` properties, which *compose with* `transform` rather than being
   replaced by it — the tween runs and the element never moves. State the
   rest position as an inline `transform` instead.

### Mobile menu open/close (`components/layout/Nav.jsx` + `index.css`)

The full-bleed nav sheet is **100% CSS keyframes — no GSAP.** This is a
deliberate exception to the "motion lives in GSAP" default, for two reasons
that both cost real bugs (2026-08-22):

1. **Radix `<Portal>` renders `null` until its own layout effect flips an
   internal `mounted` flag.** So on the commit where `open` turns `true` the
   panel is *not in the document yet* and `panel.current` is still `null`;
   the commit that does mount it doesn't change `open`. A
   `useGSAP(..., { dependencies: [open] })` keyed on `open` alone therefore
   fires exactly once, against nothing, and never again. The interior stagger
   had been silently dead this whole time. **Never key an animation off the
   `open` flag of a portalled Radix overlay — key it off the node.**
2. Keying off the node fixed that but exposed a worse one: **a CSS animation
   starts at the first paint *after* mount, whereas `useGSAP` runs in the
   layout effect *before* it.** The cost of that mount (portal, focus trap,
   `react-remove-scroll`) is charged against a JS delay but not a CSS one —
   measured at **107ms**, which ate most of a 140ms GSAP delay and left the
   first row 76% risen before it was even on screen. **Two clocks, drifting.**

Putting both the sheet and its contents on CSS keyframes is what locks them
together. Measured, dev and production bundle identical:

| Element | Delay | Duration | Ease |
|---|---|---|---|
| sheet (`translateY -100% → 0`) | 0 | 520ms | `--ease-out-expo` |
| veil (`opacity 0 → 1`) | 0 | 420ms | `--ease-out-expo` |
| nav words (out of `ts-mask`, `112% → 0`) | 165ms + i×52ms | 640ms | `--ease-out-expo` |
| row numerals | 230ms + i×52ms | 420ms | `ease-out` |
| START A PROJECT bar | 400ms | 460ms | `ease-out` |
| world-clock cells | 450ms + i×35ms | 400ms | `ease-out` |

Close: sheet `0 → -100%` 400ms `--ease-in-out-quint`, veil 300ms.

- The per-row index is one `style={{ "--i": i }}` on the `<Link>`; the word
  and its numeral both read it, so they stay paired.
- **The `[data-state="closed"]` keyframes are load-bearing** — Radix
  `Presence` keeps the node mounted only while an exit animation is running.
  Delete them and the menu vanishes on the frame it is dismissed.
- Entry rules are scoped to `[data-state="open"]` only, so on close the words
  simply stop animating at their resting position and ride up with the sheet.
- 165ms is not arbitrary: it is when the sheet's expo curve has brought row 1
  past the top edge. Earlier and the reveal is spent off-screen.
- Reduced motion needs its **own `animation-delay: 0ms`** override — the
  global reduce block collapses *duration* but not *delay*, and `both` fill
  would otherwise hold the backwards (invisible) state for the full delay.

### Cursor capsule on the hero words (`layout/Cursor.jsx`, `home/Hero.jsx`)

Hovering BUILD / AUTOMATE / SCALE morphs the existing follower into a black
capsule carrying one line of microcopy. It is the *same* element throughout —
there is no second cursor system.

**Architecture.** The follower is ONE fixed box, `340 x 96`, and every state is
a `clip-path` window onto it:

| State | Window | Radius |
|---|---|---|
| idle | 30 x 30 | 0 |
| interactive (`a`, `button`) | 58 x 58 | 0 |
| labelled (`data-cursor`) | 96 x 96 | 0 |
| capsule (`data-cursor-capsule`) | measured x 54 | 27 |

Clipping rather than resizing keeps the morph off the layout path, carries the
corner radius in the same value as the shape, and leaves
`scaleX/scaleY/rotation` free for the velocity lean — which the previous
scale-based sizing had occupied. Measured cost: **~1ms/frame over baseline,
zero frames >33ms.**

**Three bugs this cost, all of which will come back if the code is rewritten:**

1. **Never tween `clip-path` as a string.** The browser reports the computed
   value in its shortest form (`inset(33px 155px)` for the idle square,
   `inset(21px 84.5px round 27px)` for the capsule) while the target is always
   the full four-sides-plus-round form. GSAP interpolates a complex string by
   pairing numbers *positionally*, so a two-number start against a five-number
   end has nothing stable to pair, and every restart resolved differently —
   the follower visibly pulsed. Tween a plain `{w, h, r, o}` object and write
   the string in `onUpdate`.
2. **`pointerover` bubbles, and fires for elements that slide under a
   *stationary* pointer** — the hero's running marquee does this continuously.
   Re-running the morph on every one of those was the other half of the pulse
   and cost 9 long frames per sweep. Guard on a state key and do nothing
   unless the state actually changed.
3. **`overwrite` is a tween option and is silently ignored on a timeline.**
   The copy timeline must be killed by hand. The swap path schedules its
   `.call()` at 0.16s while a fresh entry schedules at 0, so a pending swap
   could land its `textContent` *after* a later entry had already set its own:
   bouncing word → word → off-word → word at ~40ms put BUILD's line inside the
   capsule while it sat on AUTOMATE.

**Interaction decisions.**
- Microcopy says what the stage *means*, never the word again:
  BUILD → `IDEA → INTERFACE`, AUTOMATE → `IT RUNS WITHOUT YOU`,
  SCALE → `BUILT TO OUTGROW`. Capsule width is measured from the copy and
  cached per key (171 / 194 / 172px), so it is genuinely content-driven.
- The hero word carries `w-fit` so the hit box hugs the glyphs. Without it the
  block spans the whole 9-column line and the capsule armed over empty space.
- Restrained effect set, deliberately **not** everything: spring-ish overshoot
  (`back.out(1.3)`) on entry, content-driven width, masked copy reveal in the
  site's own `ts-mask` language, and a velocity lean (rotation ±7°, scaleX
  ≤1.07). Blur-to-sharp was considered and rejected — the mask already covers
  both the entry and the swap, so blur would have been decoration on top of a
  transition that was already clean.
- **The words do NOT fade on hover** (user decision, 2026-08-22). An earlier
  build dropped them to `--color-ash-dim` to give the black capsule contrast;
  that was removed. Contrast is instead solved by a **two-plate follower**: an
  outer paper-white plate whose window is the inner face's grown by 1.5px, so
  the white only ever shows as a rim. It vanishes against the paper and reads
  only where the capsule crosses the black headline. At `o = 0` the two windows
  coincide exactly, so the pre-existing red square is visually untouched.
- The velocity lean is written from `pointermove`, so it freezes wherever the
  pointer stops. A 90ms idle timeout writes it back to neutral; without it the
  capsule sits permanently skewed.
- Desktop only, by construction: `<Cursor />` already returns `null` under
  `prefers-reduced-motion` and without `(pointer: fine) and (hover: hover)`, so
  the capsule needs no gating of its own and touch keeps the words untouched.

### ProximityType activates on HOVER, not proximity (`motion/ProximityType.jsx`)

The `radius` prop shapes the falloff *between the glyphs of its own line*. It
does **not** decide whether the line reacts at all — a hover test against the
element's own box does, with a deliberately small `HOVER_PAD` of 6px.

This was a real defect (fixed 2026-08-22). At `radius={280}` the field reached
far past the element, so hovering "Scale." — whose box bottom sits just **28px**
above this line — swelled "Without Borders." along with it. The hero appeared to
have two hover targets stacked on each other, which became obvious once the
cursor capsule gave "Scale." a hover response of its own.

- The gate is eased (0.2 per frame) and multiplies the per-glyph pressure, so
  leaving the line releases smoothly instead of snapping to rest.
- On arrival the eased pointer snaps to the real pointer, otherwise the field
  sweeps in from wherever it was last parked.
- Keep `HOVER_PAD` small. The headline-to-line gap is only 28px, so anything
  generous puts the bottom of "Scale." back inside the field.
- Only ever used once, in `home/Hero.jsx`.

### Motion primitives
| Component | Effect |
|---|---|
| `MaskText` | word-level clip reveal out of overflow-hidden masks |
| `Reveal` | subtle fade/slide (y 8–24px), stagger capped at 10 children |
| `ScrubWords` | statement resolves word-by-word on scrub (opacity only) |
| `Marquee` | CSS transform loop, duplicated + translated -50% |

Entrance states are only hidden when `html.ts-motion` is present (set by JS),
so no-JS/crawler renders keep every word visible.

### Motion rhythm on Home (deliberate — do not flatten)
```
HERO high → MANIFESTO calm → HORIZONTAL high → WEB medium →
AI medium → GROWTH medium → GLOBAL calm → PROCESS medium →
WHY calm → CTA strong
```

**Only ONE pinned section on the site** (the horizontal act), per the skill's
guidance that >1–2 pins per page fights native scroll and hurts mobile.

---

## Horizontal Scroll Architecture

`components/home/HorizontalServices.jsx` — the centrepiece.

- 4 acts: `01 ENGINEER.` / `02 AUTOMATE.` / `03 GROW.` / `04 OPERATE.`
- Panels **alternate paper/ink**, so the ground inverts as you travel — this
  is the cinematic device, keep it.
- Desktop (`min-width: 1024px` + no reduced-motion) only, via
  **`gsap.matchMedia()`** — it handles breakpoint teardown/rebuild, and
  `useGSAP` reverts the whole context on unmount. No duplicate triggers.
- `end: () => "+=" + distance()` with `invalidateOnRefresh: true`, where
  `distance = track.scrollWidth - window.innerWidth` → responsive on resize.
- Giant ghost numerals parallax via `containerAnimation`.
- Progress HUD: red bar `scaleX` + a counter updated by writing `textContent`
  directly (never setState on scroll frames).

### The letterbox (important design decision)
The act is framed by a **black rail top (96px) and bottom (72px)**, with the
track absolutely positioned between them.

Reason: during the act the viewport contains white and black simultaneously,
so the fixed nav could not match both. The top rail gives the nav one
consistent black ground, and the pair frames the section like a film strip.
The rail height is not load-bearing for the nav any more (see below), but it
is load-bearing for the look.

### Mobile / tablet
Below `lg`, the same `<Act>` content renders as **full-height vertical snap
scenes** (`min-h-[100svh] snap-start`). No pinning, no horizontal transform.

---

## Major Components

| Component | Notes |
|---|---|
| `Nav.jsx` | index numbers, rollover labels, red active rule, condenses past 80px, **hit-tests the ground behind it** to invert (see below). Word-label `MENU` button, not a hamburger icon. |
| `Nav → MobileMenu` | full-bleed Radix Dialog primitive, re-skinned; giant type rows + live world-clock strip. Gets focus trap / Esc / scroll lock for free. |
| `Footer.jsx` | closing statement, link matrix, contact **placeholders**, coverage clocks, edge-to-edge SVG wordmark (`textLength` + `lengthAdjust="spacing"` guarantees exact fit regardless of font load). |
| `Cursor.jsx` | red dot → labelled disc (`OPEN`/`START`/`EXPLORE`). Only on `(pointer:fine) and (hover:hover)` and not reduced-motion. Uses `gsap.quickTo`. |
| `RouteTransition.jsx` | red rule leads, black panel sweeps, scroll resets under cover, panel clears. ~0.9s total. Skipped on first paint and under reduced motion. |
| `PageOpener.jsx` | shared opener grammar for the 3 inner pages. |
| `ActionLink` / `SignalLink` | built on the shadcn Button primitive (`asChild`), then fully re-skinned — red panel wipes up from the baseline. |

### Nav zone detection — do not "simplify" this
The nav reads its light/dark state by **hit-testing what is actually painted
behind it**: `document.elementsFromPoint(innerWidth/2, 28)`, skipping any node
inside the header, then `closest("[data-zone]")`.

Two earlier approaches were tried and both failed:
1. One `ScrollTrigger` per ink section writing a boolean — adjacent sections
   toggle in undefined order, so "last writer wins" flickered at every
   boundary, and nested panels inside the horizontal track fought their parent.
2. A `Set` of live sections — fixed the race but still desynced, because a
   pinned section in the chain invalidates downstream start/end measurement.

The hit-test is exact by construction and immune to pinning and reordering.
It runs on `ScrollTrigger`'s update (already firing on every Lenis frame) and
only calls `setState` when the zone actually flips.

---

## Completed

- [x] UI/UX Pro Max skill genuinely installed (`npx ui-ux-pro-max-cli init --ai claude`) into `.claude/skills/`, and consulted for style / typography / motion / UX before implementation
- [x] shadcn/ui genuinely installed via CLI (`init -b radix -p nova`), `button` + `accordion` + `dialog` added, then heavily re-skinned
- [x] Full design system in `index.css` (tokens, zone system, utilities, reduced-motion, focus rings, Lenis CSS)
- [x] Self-hosted variable fonts with working `wdth` axis
- [x] Lenis ↔ GSAP ScrollTrigger bridge
- [x] Home — all 10 sections
- [x] About, Services, Why Us, 404
- [x] Nav + mobile menu + footer + cursor + route transition
- [x] Backend scaffold (empty, documented)
- [x] `npm run build` passes — 531 kB JS (171 kB gzip), 68.8 kB CSS
- [x] Playwright audit across **9 widths × 4 routes**: no body overflow, no
      clipped text, no JS errors
- [x] Hero fixed to fit at every breakpoint using `@container` + `cqw`

---

## Important Decisions

1. **Tailwind v4 CSS-first** — no `tailwind.config.js`. Theme lives in
   `@theme` / `@theme inline` in `index.css`.
2. **shadcn is a primitive layer, not the design language.** Its tokens are
   re-pointed at the TechnoSpirit palette and radius is forced to 0.
3. **Fonts self-hosted**, never from a CDN.
4. **Hero type is sized with container-query units** (`21cqw`), not `vw`, so
   the longest word ("Automate.") fits its column exactly at every breakpoint
   regardless of how many grid columns the h1 spans.
5. **No fabricated proof anywhere** — no testimonials, client logos, metrics,
   award claims, project counts or years of experience. City names appear
   only as time-zone/coverage motifs, with an explicit on-page line:
   *"Reference zones indicate operating coverage and working hours — not
   client locations."* Footer contact fields read `— pending —`.
   The Why Us page turns this into a feature (`NoList` — "what we won't do").
6. **Only one pinned section**, and only one full-bleed red moment.
7. Accessibility is load-bearing: skip link, `scroll-padding-top` for WCAG 2.2
   "Focus Not Obscured", visible red focus rings, semantic lists/headings,
   reduced-motion resolves everything to its final readable state.
8. **Never tween a `clip-path` string with GSAP** — tween numbers and compose
   the string in `onUpdate`. The browser normalises the computed value to its
   shortest form, and GSAP pairs complex-string numbers positionally, so the
   start and end rarely have the same shape. This produced a visibly pulsing
   cursor; see *Animation System → Cursor capsule*.
9. **Overlay/portal motion is CSS, not GSAP** — the mobile menu sheet, its
   veil and its interior stagger are all CSS keyframes. GSAP owns
   scroll-driven and pointer-driven motion; anything whose entrance is
   gated by a Radix portal mount belongs on the CSS clock, because that is
   the only clock the sheet's own animation is on. See *Animation System →
   Mobile menu open/close* for the two bugs that set this rule.

---

## Known Issues

1. Bundle is 555 kB (>500 kB Rollup warning). No code splitting / lazy routes
   yet. GSAP + Router + React account for most of it.
2. `@fontsource-variable/geist` is still an unused leftover dependency.
3. `/why-us` and `/services` are screenshot-clean at 390 / 1440 / 1920 but have
   not been read closely for copy or hover states.
4. The shadcn MCP server is configured in `frontend/.mcp.json`, but Claude Code
   must be **restarted** before its tools appear. This session drove the same
   registry through `npx shadcn@latest` directly, which is what the MCP wraps.
5. `npx shadcn add` **fails** on any React Bits item that ships a `.css` file
   ("Unexpected token (1:0)" — the CLI parses the stylesheet as JS). JSX-only
   items install fine. For CSS-bearing items, fetch
   `https://reactbits.dev/r/<Name>-JS-CSS.json` and port by hand.
6. Chrome MCP extension is **not connected** here — browser testing is done
   with **Playwright**, not `mcp__claude-in-chrome__*`.

## Testing Harness (scratchpad — recreate if lost)

Playwright lives at:
`C:\Users\PARESH\AppData\Local\Temp\claude\C--Users-PARESH-OneDrive-Desktop-technospirit\bccd29cc-33ff-4ab7-9eea-64198908b263\scratchpad\pw`

| Script | Purpose |
|---|---|
| `shoot.cjs` | screenshots each route at scroll stops. Env: `W`, `H`, `TAG`, `ONLY`, `STOPS`, `REDUCED` |
| `audit.cjs` | 9 widths × 4 routes → body overflow, clipped text, sub-11px text, JS errors |
| `probe.cjs` | hero font metrics (family, `font-stretch`, computed size, overflow) |
| `navprobe.cjs` | nav zone vs. actually-painted ground, per scroll stop — **all rows green** |
| `interact.cjs` | drives the cursor, asserts each React Bits component actually reacts |
| `wipe.cjs` | EdgeWipe rest / hover / leave transforms |
| `bars.cjs` | every scrubbed scale bar (act HUD, process fill, principles rail) |
| `maskprobe2.cjs` | MaskText word transforms after a full-page scroll |
| `footprobe.cjs` | footer wordmark: natural vs. target text length |
| `navflow.cjs` | route navigation, scroll reset, pin re-measure after returning |

Also at `…/scratchpad/q.cjs`: a Node CSV reader for querying the UI/UX Pro Max
data directly.
**Python is not installed on this machine**, so the skill's `search.py` /
`design_system.py` cannot run — query `.claude/skills/ui-ux-pro-max/data/*.csv`
with `q.cjs` instead:
`node q.cjs <csv> <terms…> --n=3 --cols="Col|Col"`

Dev server: `cd frontend && npm run dev -- --host 127.0.0.1 --port 5173`
(a background instance from this session may still be running on 5173).

---

## Pending

- [ ] Restart Claude Code and confirm the shadcn MCP tools load (see the
      SESSION CHECKPOINT for the exact call)
- [ ] Copy / hover-state review of `/services` and `/why-us` at 1440
- [ ] Lazy-load routes to clear the 500 kB Rollup warning
- [ ] `npm uninstall @fontsource-variable/geist`

Cleared this session: nav zone verification, visual review at 390 / 1440 /
1920 on all four routes, the `prefers-reduced-motion` pass, the footer
wordmark fit check, and the Manifesto padding trim (now handled globally by
`ts-act`).

---
## Registries & MCP

`npx shadcn@latest mcp init --client claude` wrote `frontend/.mcp.json`:

```json
{ "mcpServers": { "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] } } }
```

`components.json` now also declares the React Bits registry, which is what makes
the MCP's search/view/add tools able to see it:

```json
"registries": { "@react-bits": "https://reactbits.dev/r/{name}.json" }
```

The index is at `https://reactbits.dev/r/registry.json` — 664 items, 332 of them
in the JS flavours (`<Name>-JS-CSS` / `<Name>-JS-TW`). Query it with node rather
than installing blind. **The MCP tools do not appear until Claude Code restarts**;
this session used `npx shadcn@latest view|add @react-bits/<Name>-JS-CSS`, which
is the same registry through the same CLI the MCP shells out to.

---

## React Bits — what was taken, and what was thrown away

Everything selected is **zero-dependency or gsap-only**. No new npm package was
added for any of it: no `motion`, no `three`, no `ogl`, no `postprocessing`,
which rules out roughly two thirds of the catalogue on bundle grounds alone.
Nothing shipped verbatim — every one was read first, and each carried at least
one thing that would have broken this site.

They live in `src/components/motion/`.

| File | Origin | Why it was rewritten |
|---|---|---|
| `ProximityType.jsx` | `TextPressure` | Shipped a Google Fonts `@import` for Roboto Flex (this project self-hosts on purpose); ran its own RAF loop; emitted global `.flex`/`.stroke` class names that collide with Tailwind; hard-coded an `<h1>`. Now drives **Archivo's real wdth 62–125 / wght axes**, runs on `gsap.ticker`, reads all glyph rects before writing any style, and is inert under reduced-motion + coarse pointers. |
| `Magnet.jsx` | `Magnet` | Called `setState` on every mousemove (a React render per pointer event) and read `getBoundingClientRect()` per event. Now `gsap.quickTo` with a cached box invalidated on scroll / resize / ScrollTrigger refresh. |
| `CurvedMarquee.jsx` | `CurvedLoop` | Its stylesheet opens with `min-height: 100vh` — literally the empty-screen problem being removed — so the CSS was never installed. Also `setOffset()` inside its animation frame (60 renders/sec), no resize re-measure, and no `touch-action`, so dragging it on a phone ate the page scroll. Now ticker-driven, aspect-ratio sized (the fixed height + `preserveAspectRatio="slice"` sheared the tops off the letters at every width but one). |
| `SignalField.jsx` | `DotGrid` | Required `InertiaPlugin` and spawned a tween per dot per pointer burst; registered a `click` listener on **window**, so clicking anywhere on the page fired a shockwave here; drew every frame forever even scrolled off screen. Now zero tweens (displacement computed in the draw loop), IntersectionObserver-gated, parks when settled, and squares instead of circles because this brand has zero border-radius. |
| `EdgeWipe.jsx` | `FlowingMenu` | Kept an infinite gsap tween alive per row whether hovered or not; flat global class names (`.menu`, `.marquee`, `.marquee span`); `4vh` type; `border-radius: 50px` thumbnails; required a fixed-height parent; keyboard users got nothing. Kept the closest-edge detection and the counter-sliding inner layer — those are the good idea. |
| `ScrambleText.jsx` | `ScrambledText` | Not ported. That component is 200 lines of SplitText cursor-proximity wobble over body copy. Only the **plugin** was worth keeping (ScrambleTextPlugin, free since GSAP 3.13), applied to `.ts-label` microcopy where "machine acquiring a signal" is already the register. |

Placement (strong moments, calm sections between them — the rhythm still holds):
- **Hero** — `ProximityType` on "Without Borders.", `Magnet` on the CTA.
- **Manifesto** — `SignalField` behind the whole black section.
- **Manifesto → HorizontalServices** — `CurvedMarquee` as the section transition.
- **Principles (/about)** — `ScrambleText` on the section stamp.
- **FinalCta** — `Magnet` on the giant button.
- **Footer** — `EdgeWipe` on the four full-bleed route rows, `Magnet` on the CTA,
  `ScrambleText` on the baseline.

---

## Bugs found and fixed this session

Four of these were **pre-existing and invisible in a static screenshot** — the
animation ran to completion while the element stayed hidden, which is a large
part of why the page read as empty.

### 1. `MaskText` only ever revealed its first word
`gsap.to(words, { yPercent: 0 })` against a resting state that comes from CSS:
`transform: translate3d(0, 108%, 0)`. By the time GSAP reads that back the
browser has resolved the percentage into a matrix and thrown the unit away, so
GSAP records `y: 161px, yPercent: 0` and animating *to* `yPercent: 0` is a
no-op. Every word after the first stayed parked below its mask. **Every
`MaskText` headline on the site** — FinalCta, Footer — was rendering as a
stack of empty boxes. Fixed with an explicit `fromTo(..., { yPercent: 108 }, ...)`.

### 2. Tailwind v4 `scale-*` / `translate-*` silently fight GSAP
Tailwind v4 compiles `scale-x-0` to the **standalone `scale` property**
(`scale: var(--tw-scale-x) var(--tw-scale-y)`), not to `transform`. GSAP writes
`transform`. The two **compose**, so an element with `scale-x-0` stays flattened
to zero no matter how far the tween runs. Broken because of this:
- the horizontal act's red progress bar (never filled),
- the Process timeline's red fill,
- the Principles rail,
- the RouteTransition leading rule,
- `EdgeWipe`'s panel (`translate-y-*`), which came out **exactly inverted** —
  wiping away on hover and back in on leave.

All five now state the rest position as an inline `transform`, the same property
GSAP animates. **Rule for this codebase: never put a Tailwind `scale-*` or
`translate-*` utility on an element GSAP transforms.** CSS-transition-only
hovers (`group-hover:scale-x-100`) are fine — Tailwind is on both sides there.

`EdgeWipe` additionally calls `gsap.set(panel, { yPercent: 101, y: 0 })` in a
layout effect, for the same reason as bug 1: the inline percentage reads back as
a matrix, so GSAP needs to be told the value it cannot recover.

### 3. Principles slot-reel threw itself five rows at a time
`yPercent: -100 * index` on the reel. `yPercent` is a percentage of the
**reel's** height, and the reel is all five digits stacked — so one step moved
it the entire strip and the counter was never on screen. Now
`-(100 / PRINCIPLES.length) * index`.

### 4. Nav zone was one beat late at the pin
ScrollTrigger fires `onUpdate`, *then* applies the pin, which changes what is
painted under the bar. Stop scrolling on that frame — exactly what happens when
you flick into the horizontal act and let go — and the bar kept the pre-pin zone
and sat there as a white slab on black. A `gsap.ticker` sample every fourth
frame now catches any layout change the scroll pass missed. `navprobe.cjs` reads
green on all 21 stops.

### 5. `FinalCta` had no `data-zone`
It fell through to the `paper` default, so the fixed header went translucent
white over signal red and washed out to pink. It now declares `ink` — a hard
black bar on red. Nothing inside the section reads zone tokens (every colour
there is stated explicitly), so the attribute only steers the header.

### 6. Full-width CTA was centre-floating on mobile
`ActionLink`'s inner span is now `w-full justify-between`: label left, arrow
right, flush with the grid instead of an island in the middle of the column.

---

## Whitespace reduction

Section padding is no longer hand-written per component. Three utilities in
`index.css` own it:

| Utility | Value | Replaces |
|---|---|---|
| `ts-act` | `clamp(3.25rem, 6vw, 6.5rem)` | `py-24 sm:py-32 lg:py-40` (96 / 128 / **160**px) |
| `ts-act-sm` | `clamp(2.25rem, 4vw, 4rem)` | half-beat, for related sections back to back |
| `ts-act-open` | `clamp(6.5rem,10vw,9.5rem)` top | `PageOpener`, clears the fixed header |

Top padding drops from 160px to ~104px at the widest — **a 35% cut, applied in
one place.** Change the utility and every section moves together.

Also trimmed: internal `mt-16/20`, `mb-14/16` and `space-y-24/32` gaps; hero
`min-h` `100svh → 86svh` (`88svh` at `lg`); the hero aside no longer uses
`justify-between` + `mt-auto`, which had been pooling all its slack into one
void; the mobile fallback of the horizontal act is content-height instead of
four forced `100svh` scenes (its `snap-start` was inert anyway — there was no
snap container above it).

Result at 1440: Home **17.5k px → 14.7k px**, and far more of what is left is
actual content rather than air.

The Principles sticky column was a tall empty margin next to one numeral; it now
carries a compact index of all five titles, with the live row in red.

---

## Horizontal act — scroll tuning

`travel()` (how far the track must move) and `distance()` (how much page scroll
that is worth) are now separate:

```js
const travel   = () => track.scrollWidth - window.innerWidth;   // 4320px @1440
const SCROLL_RATIO = 0.62;
const distance = () => Math.round(travel() * SCROLL_RATIO);      // 2678px
```

At 1:1 the act ate ~5.8 viewports and felt like wading. It is now ~4 viewports
(pin spacer 3578px at 1440×900, verified), one panel per ~0.74 viewport, with
`scrub` tightened 1 → 0.8. `refreshPriority: -1` was added so the sections after
it re-measure against the pinned layout instead of keeping pre-pin offsets and
opening a dead band. Verified: no empty area after the act, no body overflow.

---

## Footer

- The four routes became **full-bleed `EdgeWipe` rows** — they used to be a
  column of small text links, the least considered thing in the footer.
- Wordmark: the viewBox is cropped tight to the cap height (no dead band), and
  it **breaks to two lines under `sm`**, where twelve characters across 390px
  collapsed into a grey stripe. Desktop runs `wdth 74 / 152px` (natural 939 vs.
  a 1000 target, so `lengthAdjust` *adds* ~8px per gap — it breathes rather than
  crushing). Mobile runs `wdth 125 / 170px` per line (natural 959 vs. 1000);
  at `wdth 88` it was padding 78 units into every gap and the word fell apart
  into separate letters.
- Vertical padding cut throughout; the giant type is unchanged in size.

---

---

## /lab — the cinematic sequence

**Route** `/lab` (lazy, `Lab-*.js` ~21 kB). **Not in `NAV_ITEMS`** — see Pending.
**Asset** `frontend/public/video/scroll-video.mp4` — 3.34 MB, 1280×720,
10.027 s, 240 frames @ 23.94 fps, H.264, 2.72 Mbps, `moov` at the front.

```
pages/Lab.jsx
└── components/lab/
    ├── labProgress.js       one publish/subscribe store, no React state on scroll
    ├── ScrollVideoStage.jsx sticky pin + ScrollyVideo + the prepare gate
    ├── LabHud.jsx           sequence readout, chapter name, red scrub rail
    ├── LabBeats.jsx         five statements, seam-clip reveals
    ├── LabRead.jsx          the four systems (width-axis focus)
    ├── LabHandoff.jsx       CutoutHeading statement on ink
    └── LabSeam.jsx          paper faces parting from a centre seam
```

### THE ASSET IS THE STORY — 2 KEYFRAMES IN 10 SECONDS

Read box by box from the MP4's own sample tables (`stss`): the file has
**two sync samples**, at frame 1 and frame 153. A 152-frame GOP, ~6.35 s.

H.264 can only begin decoding at a keyframe, so asking a `<video>` for
`t = 6.0s` means decoding ~150 inter-frames to get there. Every scrub position
is a fresh several-hundred-millisecond job; the browser coalesces the ones it
cannot service; the picture arrives in chunks while the scrollbar moves
smoothly. **This is not tunable in JS.** It is the whole reason the page reads
as "scroll is smooth, video catches up".

**Recommended re-encode (not applied — no ffmpeg on this machine).** All-intra
makes every frame a keyframe, so every seek is instant and the `<video>` path
becomes as smooth as the decoded one on every device, including phones:

```bash
ffmpeg -i scroll-video.mp4 \
  -an -vcodec libx264 -profile:v high -pix_fmt yuv420p \
  -g 1 -keyint_min 1 -sc_threshold 0 \
  -crf 22 -preset slow \
  -movflags +faststart \
  scroll-video-scrub.mp4
```

`-g 1` is the load-bearing flag. Expect the file to grow (roughly 2–4×) —
that is the trade, and it is the right one for scrubbing. If size matters more
than sharpness, add `-vf scale=960:-2` and/or raise `-crf` to 26. Keep
`-movflags +faststart`. A 1280×720 all-intra file at crf 22 should land around
8–12 MB; if that is too heavy for mobile, ship **two** files and pick with
`matchMedia` (`scroll-video-scrub.mp4` desktop, a 960-wide one for phones).

### How it is driven

**The pin is CSS `position: sticky`, not `ScrollTrigger.pin`.** The section is
`100svh + var(--lab-travel)` tall and the stage sticks inside it. No pin
spacer to re-measure on resize or route return, no spacer to strand, and
identical behaviour on touch. ScrollTrigger only *reports* progress. This is
why the site still has exactly one real pin (the horizontal act on Home).

**One clock, one progress value.** GSAP's ticker drives Lenis (SmoothScroll),
Lenis updates ScrollTrigger, ScrollTrigger writes `target`, and a single
`gsap.ticker` callback in `ScrollVideoStage` reads it. No `requestAnimationFrame`
loop is created anywhere on `/lab`. `trackScroll: false` keeps ScrollyVideo's
own scroll listener off the page entirely.

```
GSAP ticker → lenis.raf → ScrollTrigger.update → target
                                                   ↓
                              one ticker callback: smoothed → pace() → video
                                                   ↓
                          store.set()  →  HUD / beats / four systems
                                       →  seek(): paint or currentTime
```

**`seek()` is written synchronously — never `setVideoPercentage`.** That method
does not move the picture; it schedules a RAF and moves it there, *and cancels
the RAF it scheduled last time*. Driven from a ticker it is called every frame,
so every call cancelled the write the previous one had queued and not yet
performed: **while the wheel was turning the element was never actually
seeked**, and only caught up when scrolling stopped and one RAF survived.
Observed directly as `currentTime` sitting at 0 while the HUD read 27%. This
was the single biggest cause of the "video catches up after scroll" feel.

**Coupling.** Decoded path: `follow = 1` — the frame is exactly the scroll
position, every frame. Lenis has already smoothed the scroll and easing an
eased value is precisely what makes a scrub feel late. Seek fallback:
`follow = 0.42` (~90 ms), because a seek per frame across a 6-second GOP is
work the decoder cannot do. Measured drift after a hard stop: **0**.

### The prepare gate

Frames are decoded up front (`useWebCodecs`) on desktop, and the page is held
at the top until they exist — `lenis.stop()` plus `html.ts-lab-locked`, with a
minimal `PREPARING SEQUENCE` line over the poster and a rail showing **real
decoded-frame progress**. The overlays step aside behind `[data-prep]` so the
line does not collide with beat 01.

Two deadlines: **soft 2600 ms** — release onto the seek path if, and only if,
the `<video>` is itself ready (`readyState >= 2`), letting the canvas swap in
silently later; **hard 6500 ms** — release regardless, so the page can never
sit behind its own loader.

`shouldDecode()` gates on `VideoDecoder`, `min-width: 1024px`, `pointer: fine`,
and `deviceMemory >= 8`. Mobile and reduced motion never decode.

### Measurements (production build, headless Chromium, software decode)

| | decoded canvas | `<video>` seek |
|---|---|---|
| dropped frames, full pass | **3** | 25 |
| drift after stop | **0** | 0 |
| memory | ~833 MB of ImageBitmaps | a few MB |
| extra network | second full 3.3 MB fetch by the demuxer | none |

- Wheel-only passes: forward `0→19→39→55→68→86→100`, reverse
  `100→87→69→56→40→21→1`, both monotone; rapid flips `19→2→18→2→19`.
- Mobile 390 (`<video>` path): p95 **16.7 ms**, **0 dropped frames** on every
  pass — fewer pixels to composite than desktop.
- `loadedmetadata` 22 ms, file fetch 129 ms, but **first decoded frame 2450 ms**
  until a decoder is requested. One muted `play()`, immediately paused, takes
  that to **65 ms**. It must run *after* ScrollyVideo's own `loadedmetadata`
  handler with its queued transition cancelled — that transition's first act is
  `pause()`, which rejected the `play()` with `AbortError`.
- Decoding to 640×360 to save memory was measured at **8.97 ms/frame against
  1.34 ms at native** — `createImageBitmap`'s rescale is software and costs far
  more than it saves. Do not try it again.
- `sv.destroy()` leaves every ImageBitmap alive. They are closed by hand in the
  cleanup, or a return visit stacks a second ~833 MB on top.

### Content and interaction

Six beats tied to **footage** position, not time: `A CLOSED SYSTEM.` /
`ONE LINE OF LIGHT.` / `THEN IT OPENS.` / [the four systems] / `THE CORE.` /
`AND IT STAYS LIT.` Reveals are the monolith's own gesture — a centre-seam
`clip-path` opening outward while the line rises out of its mask, with tracking
settling from `0.05em` to `-0.05em`. The clip is tweened as a **number** and
composed in `onUpdate` (rule 8).

`--lab-travel` is `420svh` desktop / `280svh` mobile, and the scroll→footage
map is **deliberately non-linear** (`PACE`): scroll 0.44–0.72 buys footage
0.50–0.70, so the orbit slows to a near-hold while the four systems are
readable, without lengthening the section.

**The four systems are type only.** An earlier version used a pointer-tracked
image plate; that is already the entire left half of `/contact`, so running it
again made the two pages read as one template, and it was hover-first. The
mechanic now is **Archivo's width axis** — the live row opens to `wdth 116%`
and full paper, the other three compress to `68%` and step back — with a
scrambled mono descriptor and a red index mark on a hairline. Scroll picks the
row; a fine pointer can override it. Nothing is hover-only.

The **letterbox rails** (`--lab-rail-top` 8rem / `--lab-rail-foot` 4.25rem) are
load-bearing twice over: they frame the picture, and they give the fixed header
one consistent black ground for the whole sequence. All overlay type is
paper-white everywhere — the footage runs white-room → black-machine → white,
so any single ink colour fails somewhere; a graded left scrim carries contrast.

**Mouse follower** — unchanged, one new label: `scroll: "SCROLL"` in
`Cursor.jsx`. The pin carries `data-cursor="scroll"`, the system rows
`data-cursor="explore"`; nested values resolve nearest-first.

### React Bits — two, both rewritten

| File | Origin | Why it was rewritten |
|---|---|---|
| `motion/CutoutHeading.jsx` | `MaskedHeading` | Copied font family/size/weight/style/letter-spacing to the SVG `<text>` **but not `font-stretch`** — this site's whole art direction is Archivo's wdth axis, so the mask rendered at 100% while the text rendered at 78% and the picture leaked out of every glyph. Also uppercased in JS (SVG does not inherit `text-transform` reliably), replaced a forever-RAF drift with a ScrollTrigger scrub + `quickTo`, stopped overriding the caller's `font-size`, and swapped its autoplaying `<video>` for the sequence's own final frame. `overflow: hidden` on the reveal because `clip-path` does not clip *scrollable* overflow — the 1.18× media pushed the document 119 px wide. |
| `motion/FieldLines.jsx` | `MagnetLines` | `getBoundingClientRect()` **per line per pointermove** (~60 forced layout reads an event — the defect `Magnet` was rewritten to remove); a `window` listener running off-screen (`SignalField`'s bug); writes straight from the event. Now: centres computed analytically from one cached rect, IntersectionObserver-gated, one `gsap.ticker` pass behind a dirty flag. |

### ⚠ `.ts-field` — a class collision I introduced, and the lesson

`FieldLines` shipped as `.ts-field`, which **the contact form has owned since it
was built**. A bare `.ts-field { display: grid; grid-template-columns: repeat(13, 1fr) }`
re-laid every field on `/contact` into thirteen columns: labels and inputs
collapsed to ~32 px and ran inline. Renamed to `.ts-linefield*`.

The React Bits ports all had global class names taken off them; this one was
*introduced*. **Before adding any new top-level class, diff it against the ones
already in `index.css`** — the check is three lines of node and it would have
caught this instantly.

### Responsive

Desktop ≥1024 + fine pointer: decoded canvas, per-row width-axis focus,
420svh travel. Below that: `<video>` seek path, 280svh travel (<768), the
statements move to the bottom edge and the scrim rotates to come from below,
descriptors stack under their words, width range narrows to 74→100% so a wide
row still fits its column. Verified 1920/1440/1280/1024/768/430/390/375: **no
horizontal overflow, no console errors, no clipped text** at any width.

### Reduced motion

No decode, no seek, no pin, no gate. The section becomes an ordinary page: the
poster as a still, every statement in reading order, the four systems as a
plain list at full strength, the seam doors removed. Nothing is lost — it stops
being revealed and is simply there.

### Known limitations

1. **The asset still has a 6-second GOP.** Desktop hides it by decoding; mobile
   still seeks. The ffmpeg command above is the real fix and is the highest-value
   next action for this page.
2. ~833 MB of ImageBitmaps while `/lab` is mounted on desktop. Gated on
   `deviceMemory >= 8`, closed on unmount, but it is a lot. The re-encode makes
   the decode path unnecessary.
3. The demuxer fetches the file a second time (a separate 200). Same fix.
4. The prepare gate is ~3.4 s under software decode; on hardware decode it is
   far shorter, and it self-limits at 2.6 s onto the seek path.
5. `/lab` is not linked from anywhere. Adding it to `NAV_ITEMS` makes six
   desktop items — check 1024 before committing to it.

---

## PHASE 2 — CONTACT + DASHBOARD

The first real backend feature: the contact form writes to MongoDB, sends two
emails, and an authenticated admin dashboard reads and works the inquiries.

**No secret appears in this file.** Values live in `backend/.env` (gitignored);
`backend/.env.example` documents every key with placeholders.

### The one shape decision worth knowing: `purpose`

The brief's Inquiry model has `name, email, purpose, message`. **The live
contact form has only three fields — name, email, message.** A purpose selector
was deliberately removed earlier (2026-08-23) and the intent list on `/contact`
is read, not operated.

So `purpose` is **optional in the schema with a default of `"General Inquiry"`**,
and the API accepts one when a caller sends it. Preserving the form UI won over
matching the model literally, because "preserve the Contact page UI completely"
was the stronger and more repeated instruction. Adding a purpose control later
needs no schema change and no migration — the seeded sample rows already carry
real purposes, which is why the dashboard reads well.

### API

Mounted under `/api`. Full table in `backend/README.md`.

```
POST   /api/contact                       public, rate-limited, honeypot
GET    /api/health                        public readiness probe
POST   /api/auth/login                    public, rate-limited
GET    /api/auth/me                       protected
POST   /api/auth/logout                   public by design (see below)
GET    /api/admin/stats                   protected
GET    /api/admin/inquiries               protected  ?page&limit&status&search
GET    /api/admin/inquiries/:id           protected
PATCH  /api/admin/inquiries/:id/status    protected
```

`requireAuth` is applied with `router.use("/admin", …)` — to the whole router,
not per route — so **a route added under /admin is protected by default.**

`/auth/logout` is deliberately NOT behind `requireAuth`: an expired session must
still be able to clear its own stale cookie instead of being refused with a 401.

### Inquiry model

`name, email, purpose, message, status, mail{customer,internal}, meta{ip,userAgent}`
plus `timestamps`. Statuses: `new | contacted | in-progress | closed`.

- `meta` is `select: false` and stripped in `toJSON` — request metadata is for
  spam triage, never for the client.
- Indexes: `{createdAt:-1}` and `{status:1, createdAt:-1}` — the two shapes the
  admin list actually queries.
- The list endpoint returns a **180-char preview**, not the message body, and
  clamps `limit` to 50. The response is bounded regardless of collection size.

### The ordering that prevents duplicate inquiries (important)

`contactController.createInquiry` does exactly this, in this order:

```
1. Inquiry.create(...)        the write
2. res.status(201).json(...)  the visitor is done
3. sendInquiryMail(...)       after the response, failing into the document
```

**Mail is not awaited before responding, and a mail failure never re-runs the
write.** If delivery were awaited and threw, a client retry would create a
second inquiry for one real message — the exact failure the brief calls out.
The database is the source of truth; mail is a side effect that is allowed to
fail, and its outcome is recorded on the row as `mail.customer` /
`mail.internal` (`pending|sent|failed|skipped`) rather than shown to the
visitor, who did nothing wrong and can do nothing about it.

`services/mailer.js` **never rejects** — it resolves to a result object, because
callers need a value they can record, not an exception that unwinds a request
which has already committed.

### Email

One Gmail account is both SMTP sender and internal receiver.
`EMAIL_APP_PASSWORD` is a Google **App Password**, not the account password.

| | Subject |
|---|---|
| customer | `We received your message — TechnoSpirit` |
| internal | `New Inquiry — {name} — {purpose}` |

The internal message sets **`replyTo: visitor.email`** — without it, Reply in
Gmail would address the TechnoSpirit account that sent it, which is also the
account receiving it, i.e. a mail to itself.

`services/emailTemplates.js` is table-based, fully inlined, email-safe HTML in
the brand palette. **Archivo is deliberately not loaded** — a webfont fails in
most clients and falls back mid-render; Helvetica/Arial carries the same Swiss
register natively, and nothing in the layout depends on the width axis.
Every interpolated value goes through `escapeHtml`; that is the only place in
the codebase where an inquiry field genuinely becomes HTML.

### Auth

- bcrypt cost 12. `passwordHash` is `select: false`; the login path asks for it
  explicitly. **Plaintext never reaches Mongo.**
- JWT in an **HttpOnly** cookie `ts_admin_token`, `SameSite=Lax`, `secure` in
  production, 7-day expiry. Verified in the browser: `document.cookie` is
  empty and `localStorage` holds nothing.
- `SameSite=Lax` works because the app is **same-origin** — Vite proxies `/api`
  in dev and preview, and production sits behind one origin. Moving the API to
  a different origin would force `SameSite=None; Secure` and reopen CSRF.
- `requireAuth` re-reads the admin from Mongo every request, so deleting an
  admin revokes the session immediately rather than at token expiry.
- Login gives **one message** for "no such admin" and "wrong password", and
  runs bcrypt against a real dummy hash when no admin matched so both paths
  take the same time. (The dummy must be a *valid* hash — bcryptjs returns
  false instantly for a malformed one, reintroducing the timing signal.)
- `bootstrapAdmin` is **idempotent**: it never overwrites an existing admin, so
  editing `ADMIN_INITIAL_PASSWORD` does nothing on its own. Reset procedure is
  in `backend/README.md`.

### Frontend auth

`context/authContext.js` (context + `useAuth`) and `context/AuthProvider.jsx`.

`status` is a **three-state**: `checking | authenticated | anonymous`, and the
third value is the point. Until the first `GET /api/auth/me` resolves the answer
is genuinely unknown, and **a protected route that treats "unknown" as "signed
out" bounces a signed-in admin to login on every refresh.** `ProtectedRoute`
renders a quiet hold while checking. This is what makes refreshing `/dashboard`
keep you signed in.

`ProtectedRoute` decides what is *rendered* — it is **not** the security
boundary. `/api/admin/*` is defended server-side; a caller who skips React
entirely still gets a 401.

### The two-shell router split (do not merge these)

`App.jsx` has two layout routes:

- `<MarketingShell>` — Lenis, GSAP ticker, `<Cursor>`, `<RouteTransition>`,
  `<Nav>`, `<Footer>`, grain layer, `warmRoutes()`.
- `<AdminShell>` — **none of it.**

Three reasons, in order of weight:
1. The dashboard is not linked from public navigation and must not advertise
   itself by appearing in the site chrome.
2. An operational interface should be instant. Lenis intercepts the wheel and a
   0.9s route wipe is the wrong feel for a tool opened forty times a day.
3. Native scroll is what a long list and a scrollable detail pane both want,
   including keyboard paging, which smooth-scroll hijacking interferes with.

Dashboard chunks are lazy for audience, not weight: a visitor who never opens
`/dashboard` downloads none of it.

### Dashboard design

`src/styles/dashboard.css`, `@import`ed by `index.css`. Kept out of index.css
because that file is the *site's* design system and this is a separate surface.

Same identity — Archivo, JetBrains Mono microcopy, zero radius, hard rules,
black/white/red — at tool density. **Every transition is a sub-200ms colour or
border change on a real interaction.** No scroll-driven motion, no entrance
staggers.

- **Red means exactly one thing: `NEW`** — "nobody has dealt with this yet".
  The other three statuses are separated by *fill*, not hue (outline =
  contacted, solid white = in-progress, dim = closed), so the list reads at a
  glance and red never becomes decoration.
- Stat tiles are one hairline grid drawn with a 1px gap over a lit background —
  the site's rule-and-hairline structure, not four floating cards.
- The active sidebar link and the selected list row share one device: a red
  leading edge. "Where am I" reads the same way in both places.
- Sidebar `SECTIONS` is the whole nav model. Adding AI Conversations / Leads /
  Analytics / Settings later is one entry + one route each. They are named in
  the sidebar footer as a roadmap rather than rendered as dead links —
  disabled links for modules that do not exist would be the fabricated-proof
  problem in a new place.

### ⚠ `position: sticky` needs room in its containing block

`.ts-inq-split` originally had `align-items: start`, which shrank the detail
column to exactly the pane's own height. A sticky element can only travel
inside its containing block, so with zero slack **the detail pane scrolled away
with the page instead of holding** — measured `detailTop: -119px` when it should
have been pinned at 84. Fixed with `align-items: stretch`, which stretches the
column to the grid row (the list's height) and gives sticky somewhere to move.
Verified: `detailTop: 84`, exactly the intended offset.

This is the same class of bug as the `.ts-field` collision — a layout property
set for one reason silently breaking a mechanism somewhere else.

### Responsive

Verified 1440 / 1024 / 768 / 430 / 390, zero horizontal overflow at every width.

- **> 1100px** — two-pane master/detail.
- **≤ 1100px** — the detail becomes its own full-width view and the list steps
  aside. Not two panes squeezed into 390px.
- **≤ 900px** — sidebar becomes an off-canvas drawer with a veil, Esc to close,
  body scroll locked, closes on navigation. Logout moves into the drawer.
- **≤ 720px** — stat grid 4 → 2; recent rows re-flow to two lines.
- **≤ 460px** — stat tiles become label/value **rows**; four stacked full-height
  tiles would have pushed the list off-screen.

`/dashboard/inquiries/:id` is a real URL — deep-linkable, bookmarkable, and it
survives a refresh with its status intact.

### Spam protection

Rate limiting (5 contact / 10 min, 8 login / 15 min with successes not counted,
120 admin / min) + a **honeypot** `website` field + server-side validation.

The honeypot is moved off-screen rather than `display: none` — a bot that skips
undisplayed inputs would skip the trap too — and is `aria-hidden` with
`tabindex="-1"` so no real visitor can reach it. When tripped the API answers
**201 with the ordinary success shape**; telling a bot it was detected just
teaches the next attempt to leave the field alone.

CAPTCHA/Turnstile can be added as one more middleware in front of
`createInquiry` without touching anything else.

### Environment variables required

Documented with placeholders in `backend/.env.example`:

```
NODE_ENV  PORT  MONGO_URI
JWT_SECRET  JWT_EXPIRES_IN
ADMIN_EMAIL  ADMIN_INITIAL_PASSWORD
EMAIL_USER  EMAIL_APP_PASSWORD  CONTACT_RECEIVER
CLIENT_ORIGIN
```

`config/env.js` is the only file that reads `process.env`, and `assertEnv()`
fails the boot on a missing `MONGO_URI`/`JWT_SECRET`, a sub-32-char secret in
production, or the `.env.example` placeholder shipped unchanged. Missing mail
credentials are a **warning, not a failure** — inquiries still save.

### Error handling

One exit: `middleware/errorHandler.js`. **Only an `AppError` has its message
forwarded to the caller.** Anything else is logged in full server-side and
answered with one generic sentence — no stack trace, no Mongo text, no path, no
connection string. Mongoose `ValidationError` → field map, `CastError` → 404,
duplicate key → 400, and body-parser's `entity.too.large` → a clean **413**
(it was surfacing as an opaque 500 until that was added).

A CORS denial is an `AppError.forbidden`, not a bare `Error` — a bare one fell
through to the "unexpected" branch and became a 500 reading "Something went
wrong on our end.", which is exactly the wrong thing to tell an operator whose
real problem is a missing `CLIENT_ORIGIN` entry.

### Testing status — actually run, not assumed

Harness: `…/bccd29cc-…/scratchpad/pw/tsflow.cjs` (79 assertions).
**79/79 pass against `vite dev` AND against the production build via
`vite preview`.**

Covered: contact UI preserved · client validation · **3 rapid clicks → 1 POST →
1 inquiry** · direct `/dashboard` → login · wrong password · login · cookie is
HttpOnly/Lax and unreadable from JS · nothing in localStorage · overview counts
match the DB · **refresh stays signed in** · list/search/filter/pagination ·
newest-first · detail · status change persisted to Mongo and surviving refresh ·
Gmail reply URL (recipient + subject prefilled, no credential) · 5 breakpoints ·
mobile drawer · logout → protected route inaccessible · forged JWT → login ·
backend unavailable → readable message, no stack · all 6 public routes
unchanged · dashboard absent from public nav · zero console errors.

Also verified by hand: rate limiters (login locks after 7 failures; contact
`RateLimit-Policy: 5;w=600`), honeypot (201, **no** inquiry created, logged
server-side), regex-injection search `(a+)+$` returns cleanly, `limit=9999`
clamps to 50, malformed JSON → 400, oversized body → 413, bad ObjectId → 404,
CORS denial → clean 403.

**Email delivery is REAL and verified** — SMTP verified at boot and three pairs
of messages actually sent (`[mail] customer-confirmation: sent`,
`[mail] internal-notification: sent`), with `mail:{customer:"sent",
internal:"sent"}` recorded on the documents.

`npm run build` passes. `oxlint` clean (no errors; only the pre-existing
warning classes already present in `SmoothScroll`/`Nav`/`button`).

### Known issues / next steps

1. **`purpose` is `"General Inquiry"` for every real submission**, because the
   form has no purpose field. Decide whether to add one (it would change the
   Contact UI, which this phase was told not to touch) or leave it.
2. Entry chunk is 531 kB — the pre-existing >500 kB Rollup warning, essentially
   unchanged by this work (dashboard code is all in lazy chunks).
3. Rate-limit state is **in-memory** — it resets on restart and is per-process.
   A multi-instance deployment needs a shared store (Redis).
4. Once locked out, even a correct password waits out the 15-minute window.
   Correct brute-force behaviour, but worth knowing before someone panics.
5. The dev database holds 12 seeded rows plus real test submissions.
   `npm run seed:reset` clears everything.
6. No password-change UI yet — `mustChangePassword` is recorded on the admin
   but nothing reads it. Rotation is the manual procedure in the README.
7. `/dashboard` has no link from anywhere, by design. Reach it by URL.


## SESSION CHECKPOINT

**Last completed task:**
Built `/lab` — a scroll-scrubbed cinematic sequence around
`public/video/scroll-video.mp4` — then fixed its scrub smoothness properly and
repaired a class collision it had introduced on `/contact`.

**Verified, not assumed:**
- `npm run build` passes. 499 kB entry (164 kB gzip), 95 kB CSS; `/lab` is a
  21 kB chunk and ScrollyVideo+mp4box a separate lazily-fetched 165 kB.
- `oxlint` clean across every new file.
- **Every route walked top to bottom at 1440 and 390**, 11–19 scroll stops each:
  zero horizontal overflow, zero console/page errors, zero dead scrub bars, and
  the header's light/dark state matches the ground painted under it at every
  stop on all six routes.
- Widths 1920/1440/1280/1024/768/430/390/375 in both motion modes: no overflow,
  no errors, no clipped text.
- Scrub, wheel-only: forward and reverse both monotone, rapid direction flips
  track cleanly, **drift after a hard stop is 0**.
- Mobile 390: p95 16.7 ms, **0 dropped frames** on every pass.
- `/contact` restored — `.ts-field` is `display: block` again and inputs are
  full column width (501 px at 1440, 350 px at 390).

**The one thing worth reading before touching this page again:**
the source MP4 has **2 keyframes in 10 seconds**. Everything unusual in
`ScrollVideoStage.jsx` — the up-front decode, the prepare gate, the synchronous
seek — exists because of that. The ffmpeg re-encode in the **/lab** section
removes the need for most of it.

**Files added**
- `src/pages/Lab.jsx`
- `src/components/lab/` — `labProgress.js`, `ScrollVideoStage.jsx`, `LabHud.jsx`,
  `LabBeats.jsx`, `LabRead.jsx`, `LabHandoff.jsx`, `LabSeam.jsx`
- `src/components/motion/` — `CutoutHeading.jsx`, `FieldLines.jsx`
- `public/lab/` — `poster.webp`, `handoff.webp`, `final.webp` (cut from the
  footage itself with Playwright + canvas, so the page ships no foreign imagery)

**Files modified**
- `src/App.jsx` (lazy `/lab` route), `src/index.css` (LAB + CUTOUT + FIELD LINES
  + SEAM blocks, ~800 lines), `src/components/layout/Cursor.jsx` (one added
  label: `scroll`)
- `package.json` — `scrolly-video@^0.0.24` (deps: mp4box, ua-parser-js)

**Carried forward (still open from the /lab session):**
Re-encode the video all-intra with the ffmpeg command in the **/lab** section
and drop it in as `scroll-video.mp4`. Then `shouldDecode()` can return
`false` unconditionally, which removes ~833 MB of ImageBitmaps, the duplicate
download, and the prepare gate in one move — and makes mobile as smooth as
desktop. After that, decide whether `/lab` joins `NAV_ITEMS` (six desktop items
— check 1024 first); it is currently reachable only by URL.

---

## SESSION CHECKPOINT — Phase 2 (2026-08-25)

**Last completed task:**
Built the first real backend feature end to end — `POST /api/contact` →
MongoDB → two transactional emails, plus a JWT/cookie-authenticated admin
dashboard at `/dashboard`. Full detail in **PHASE 2 — CONTACT + DASHBOARD**.

Also changed this session (single-line, unrelated): the Home hero CTA is now
`BEYOND THE ORDINARY → /lab` (was `START A PROJECT → /contact`). Only
`components/home/Hero.jsx` changed; the FinalCta, Nav and Footer CTAs still
read START A PROJECT and still point at `/contact`.

**Verified, not assumed:**
- **79/79 browser assertions pass** against `vite dev` *and* against the
  production build via `vite preview` (`…/pw/tsflow.cjs`).
- **Real email delivery** — SMTP verified at boot, three pairs of messages
  actually sent, `mail:{customer:"sent",internal:"sent"}` on the documents.
- 3 rapid clicks → 1 POST → 1 inquiry. Refresh keeps the session. Logout makes
  protected routes inaccessible. Forged JWT → login.
- Cookie is HttpOnly + SameSite=Lax; `document.cookie` empty, localStorage empty.
- 1440/1024/768/430/390: zero horizontal overflow; drawer works at 390.
- All six public routes unchanged, zero console errors, Lenis still active on
  the marketing shell and absent from the dashboard.
- `npm run build` passes; `oxlint` has no errors.

**Three bugs found and fixed while testing (all real):**
1. **`position: sticky` with no room** — `align-items: start` shrank the detail
   column to the pane's own height, so the pane scrolled away instead of
   holding (`detailTop: -119` vs the intended `84`). → `align-items: stretch`.
2. **CORS denial surfaced as an opaque 500** ("Something went wrong on our
   end.") because the rejection was a bare `Error`. → `AppError.forbidden`, now
   a clean 403 naming the origin.
3. **Oversized body → 500** instead of 413. → `entity.too.large` handled.

**Files added**
- `backend/` — config (env, db), models (Inquiry, Admin), controllers ×3,
  middleware ×4, routes ×4, services (mailer, emailTemplates), utils ×5
- `src/lib/api.js`, `src/lib/formatDate.js`
- `src/context/authContext.js`, `src/context/AuthProvider.jsx`
- `src/components/dashboard/` — DashboardLayout, ProtectedRoute, InquiryDetail,
  StatusPill
- `src/pages/dashboard/` — Login, Overview, Inquiries
- `src/styles/dashboard.css`

**Files modified**
- `src/App.jsx` — split into `<MarketingShell>` / `<AdminShell>` layout routes
- `src/components/contact/ContactForm.jsx` — wired to the API; honeypot,
  in-flight guard, server-field errors, network-failure line. **No design
  change** — same three fields, same CTA, same copy.
- `src/index.css` — `@import "./styles/dashboard.css"` + `.ts-form-error`,
  `.ts-honeypot`
- `frontend/vite.config.js` — `/api` proxy for dev and preview
- `backend/` — package.json, .env.example, .gitignore, README.md

**Next exact action:**
Decide the `purpose` question (issue 1 in PHASE 2 → Known issues): every real
submission currently stores `"General Inquiry"` because the contact form has no
purpose field, and adding one would change the Contact UI this phase was told
to preserve. Then rotate `ADMIN_INITIAL_PASSWORD` off the dev value before this
is exposed anywhere beyond localhost.

## Last Major Update

**Phase 2 — contact inquiries, email and the admin dashboard.** The contact
form now writes to MongoDB and sends two brand-designed transactional emails
(customer confirmation + internal notification with `replyTo` set to the
visitor), and `/dashboard` is a real authenticated operator interface with
overview counts, a searchable/filterable/paginated inquiry list, a detail pane
with status changes that persist, and a Gmail compose hand-off.

The two decisions that shaped it: **the database is the source of truth and
mail is a side effect that is allowed to fail** — the write happens, the
visitor is answered, and only then is mail dispatched, which is what makes a
delivery failure unable to produce a duplicate inquiry; and **the dashboard is
deliberately not the website** — it runs in its own layout shell with no Lenis,
no GSAP, no cursor follower and no route wipe, because an operational interface
should be instant while keeping the same black/white/red identity.

Previously: `/lab`, a scroll-controlled cinematic built on ScrollyVideo, with
its scrub traced to ScrollyVideo cancelling its own pending seeks and to an
asset with a 6-second GOP (the ffmpeg re-encode is still waiting).
