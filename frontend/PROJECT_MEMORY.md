# TechnoSpirit Project Memory

> Read this file FIRST before any future task on this project.
> The newest instruction from the user always overrides anything written here.

---

## Current Phase

**PHASE 1 — Frontend only.** Backend is a scaffold and must stay empty.

Do NOT start in Phase 1: backend logic, MongoDB, auth, admin dashboard,
contact API, payments, CMS, deployment.

Status: **~85% complete.** All pages and sections are built and the production
build passes. Remaining work is visual review + polish (see SESSION CHECKPOINT).

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
No dependencies installed. `package.json` exists with stub scripts only.

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
│       │   └── why-us/      # Reasons, NoList
│       └── pages/           # Home, About, Services, WhyUs, NotFound
└── backend/                 # SCAFFOLD ONLY — all subfolders empty
    ├── config/ controllers/ middleware/ models/ routes/ services/ utils/
    ├── app.js  server.js  package.json  .env.example  README.md
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
| `*` | `NotFound.jsx` | 404 |

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

## SESSION CHECKPOINT

**Last completed task:**
React Bits / MCP integration pass plus the density, About-ScrollTrigger, footer
and horizontal-scroll fixes requested for this session. Six adapted motion
components added under `src/components/motion/`, a single-source section-rhythm
scale in `index.css`, and six bugs fixed — four of them pre-existing and
invisible in a still screenshot (see **Bugs found and fixed this session**).

**Verified, not assumed:**
- `npm run build` passes — 555 kB JS (179 kB gzip), 78 kB CSS.
- `oxlint` clean on every new file (only the pre-existing Nav / SmoothScroll /
  HorizontalServices fast-refresh warnings remain).
- Screenshot sweeps at **390 / 1440 / 1920** across all four routes: no body
  overflow, no console or page errors on any of them.
- `prefers-reduced-motion` pass at 1440: every headline resolves visible, the
  ribbon is static, the dot field paints once, nothing is left hidden.
- `interact.cjs` drives a real cursor and asserts each component reacts:
  ProximityType wdth 100→125 / wght 700→898, Magnet translates 29px toward the
  pointer, SignalField canvas paints, CurvedMarquee `startOffset` advances,
  EdgeWipe 89.84 → 0 → 89.84 on enter / leave.
- `navprobe.cjs`: nav zone matches the actually-painted ground at all 21 stops.
- `navflow.cjs`: Home → About → Services → Home resets scroll, re-measures, and
  the act re-pins correctly on return. No errors.

**Files changed**

New — `src/components/motion/`:
`ProximityType.jsx`, `Magnet.jsx`, `CurvedMarquee.jsx`, `SignalField.jsx`,
`EdgeWipe.jsx`, `ScrambleText.jsx`

Modified:
- `.mcp.json` (new), `components.json` (React Bits registry)
- `src/index.css` — `ts-act` / `ts-act-sm` / `ts-act-open`, `.ts-index-row`
- `src/lib/gsap.js` — registers `ScrambleTextPlugin`
- `src/components/ui/MaskText.jsx` — the fromTo fix
- `src/components/ui/ActionLink.jsx` — full-width CTA layout
- `src/components/layout/` — `Nav.jsx` (ticker zone sample),
  `Footer.jsx` (rebuilt), `RouteTransition.jsx`, `PageOpener.jsx`
- `src/components/home/` — `Hero.jsx`, `Manifesto.jsx`,
  `HorizontalServices.jsx`, `FinalCta.jsx`, `Process.jsx`, `WebSystem.jsx`,
  `AiSystem.jsx`, `DigitalGrowth.jsx`, `GlobalPositioning.jsx`, `WhyStrip.jsx`
- `src/components/about/` — `Principles.jsx` (rewritten), `Disciplines.jsx`,
  `MissionVision.jsx`
- `src/components/why-us/` — `Reasons.jsx`, `NoList.jsx`
- `src/components/services/ServiceGroup.jsx`

**Next exact action:**
Restart Claude Code so the shadcn MCP server actually loads, then confirm its
tools resolve the registered registry:

```
search_items_in_registries  registries=["@react-bits"]  query="text reveal"
```

After that, the outstanding polish (in priority order):
1. Read `/services` and `/why-us` closely at 1440 — they are screenshot-clean
   but have not had a copy / hover-state review.
2. Lazy-load the four routes to clear the 500 kB Rollup warning.
3. `npm uninstall @fontsource-variable/geist`.

Nothing is half-written. The dev server may still be running on
`127.0.0.1:5173` from this session.

---

## Last Major Update

React Bits / shadcn-MCP integration and density pass. The site went from
"correct but empty" to dense and cinematic: section rhythm centralised and cut
35%, Home 17.5k → 14.7k px at 1440, the horizontal act shortened from ~5.8 to
~4 viewports, the footer rebuilt around full-bleed route rows, and six real
bugs fixed — most importantly the `MaskText` reveal and the Tailwind-v4
`scale`/`translate` vs. GSAP `transform` conflict, which between them were
leaving whole headlines and every scrubbed progress bar invisible.
