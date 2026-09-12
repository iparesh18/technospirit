# TECHNOSPIRIT — DESIGN SYSTEM & IMPLEMENTATION REFERENCE

> **Source:** the live `technospirit.tech` codebase in this repository.
> **Purpose:** give another Claude Code session everything needed to build `technospirit.in` with the same brand DNA — without cloning the site.
> **Method:** every value below was read out of the actual files. File paths are given so each observation can be re-checked. Where the repo itself states a rule (`AGENTS.md`, `frontend/PROJECT_MEMORY.md`, inline comments), that statement is quoted rather than paraphrased.

**Repo root:** `C:\Users\PARESH\OneDrive\Desktop\technospirit`
**Front end root:** `frontend/`
**The design system lives in exactly one file:** `frontend/src/index.css` (1992 lines). Read it first.

---

## 1. BRAND / VISUAL LANGUAGE

### 1.1 The stated direction

`frontend/src/index.css` opens with the thesis, verbatim:

```
TECHNOSPIRIT — DESIGN SYSTEM
Direction: Swiss Modernism 2.0 x Minimalist Monochrome
WHITE = space | BLACK = structure | RED = signal
Zero radius. No shadows. Hard rules. Typography is the interface.
```

`frontend/PROJECT_MEMORY.md` restates it as **locked**:

> **Zero border-radius, no shadows, no gradients, no glass.** Hairlines + hard rules carry structure. 3.2% SVG paper-grain overlay. Typography IS the interface.

This is not aspirational copy — it is enforced in the token layer. `--radius: 0px` in `@theme`, and every shadcn radius token is re-pointed to `0px` in `@theme inline` (`index.css:44–79`). There is no shadow utility anywhere in `src/`.

### 1.2 Visual personality

- **An instrument, not a brochure.** Sections read as read-outs: mono labels, sequence numbers (`01–06`), progress rails, live clocks, a `/ 04` counter. `frontend/src/components/ui/SystemLabel.jsx` carries a comment recording that the *fake* version of this was removed — a `node="NODE 004"` prop and a pulsing "live" dot — because it "read as sci-fi cosplay rather than as a real interface." **Instrumentation is allowed only where the number is real** (services 01–04, process steps, actual time zones).
- **Editorial scale.** Headlines are enormous and set in a *compressed* cut. `clamp(3rem, 13vw, 12rem)` is the standard page-opener size (`components/layout/PageOpener.jsx`). The hero goes to `clamp(3.2rem, 21cqw, 15rem)` using container query units.
- **Honesty as a design constraint.** `AGENTS.md`: "**No fabricated proof** (no fake testimonials/logos/metrics/years)." The footer literally prints `— pending —` for the unpublished email and phone rather than inventing them (`components/layout/Footer.jsx`). `/why-us` includes a section (`components/why-us/NoList.jsx`) listing what the company *refuses* to do, on the reasoning that "a list of strengths proves nothing on its own."
- **Cinematic, but earned.** Motion is heavy but every piece is scroll- or pointer-driven; nothing loops for decoration except the marquees and the assistant's ring.

### 1.3 Minimalism and whitespace

- Whitespace is **structured, not empty**. The vertical rules layer (`.ts-rules`, §4.6) prints 3–6 hairline columns behind hero and opener sections so blank space reads as a grid, not a gap.
- Section padding is deliberately *tighter* than typical marketing sites. The `ts-act` comment states this outright:
  > "The page is meant to read dense and cinematic, so the scale tops out at ~104px rather than the 160px the sections used to hard-code (`py-24 sm:py-32 lg:py-40`)."
- Air is created by **type size contrast**, not by padding: a 10rem headline sitting next to a 0.7rem mono label in the same row.

### 1.4 Light / dark sections and contrast

The page alternates **paper** (white) and **ink** (black) full-bleed sections. This is a first-class system, not per-component colouring — see §3.3. On `/services`, the alternation is computed: `zone={i % 2 === 1 ? "ink" : "paper"}` (`src/pages/Services.jsx`).

Contrast is deliberately extreme: pure `#ffffff` against pure `#000000`, hairlines at `#e4e4e4` on paper and `rgba(255,255,255,0.16)` on ink. No mid-greys used as background.

### 1.5 Visual rhythm

`src/pages/Home.jsx` documents the intended rhythm of the whole page in a comment — copy this discipline:

```
HERO high → MANIFESTO calm → HORIZONTAL high → WEB medium →
AI medium → GROWTH medium → GLOBAL calm → PROCESS medium →
WHY calm → CTA strong.
```

Ten sections, energy deliberately modulated, one climax. The climax is `FinalCta` — the **only** full-bleed red frame on the site (`bg-signal text-black`), and `PROJECT_MEMORY.md` says "do not invert."

### 1.6 Recurring visual patterns (the brand's fingerprints)

| Pattern | Where |
|---|---|
| Mono eyebrow label above a giant compressed headline | every section; `SystemLabel` + `MaskText` |
| Hairline rule that a red line draws across / down | `Process`, `Principles`, `ServiceGroup`, nav underline, form field rule |
| A red `size-1.5` square as the only "icon" | `Manifesto`, `ServiceGroup`, `WebSystem` nodes |
| Full-width rows separated by hairlines, never cards | `Disciplines`, `WhyStrip`, `NoList`, `ServiceGroup` entries |
| Oversized ghost numeral behind content at 4–5% opacity | `HorizontalServices` acts (`text-[46vh]`, `text-white/[0.055]`) |
| Marquee strip used as a *section rule* | `Hero` bottom strip, `DigitalGrowth`, `Services` |
| Two-column split: giant type left, quiet register right | `Hero`, `Contact`, `WebSystem`, `Process`, `ServiceGroup` |
| `ArrowUpRight` (never a right-arrow, never a chevron) | every CTA |

### 1.7 What makes it recognisably TechnoSpirit

Five things, in priority order:

1. **Archivo's width axis is animated.** Type gets wider or narrower to express focus. Nothing else on the web does this.
2. **Zero radius, zero shadow, hairline rules.** Every edge is hard.
3. **Red used as a signal, never as a colour.** It appears on ~1 element per viewport.
4. **Monospace microcopy in caps at 0.18em tracking** naming every section.
5. **Masked type reveals** — words rise out of `overflow:hidden` boxes rather than fading.

---

## 2. TYPOGRAPHY

### 2.1 Families and loading

Two families. Both **self-hosted variable fonts**, imported at the top of `frontend/src/index.css`:

```css
@import "@fontsource-variable/archivo/wdth.css";
@import "@fontsource-variable/jetbrains-mono/wght.css";
```

Packages: `@fontsource-variable/archivo@^5.3.0`, `@fontsource-variable/jetbrains-mono@^5.3.0` (`frontend/package.json`).

`frontend/index.html` states the rule in a comment:
> "Fonts are self-hosted via @fontsource-variable (imported in index.css), so there is no third-party request on the critical path."

`PROJECT_MEMORY.md` is emphatic:
> **never reintroduce a Google Fonts link** (CDN is blocked in some environments and the site fell back to Arial, killing the width axis).

**Which Archivo build:** the `wdth` one, not the `wght` one. The comment explains: *"Archivo ships wght 100..900 AND wdth 62%..125%; the width axis is the art direction, so the wdth build is the one we load."*

### 2.2 Token definitions (`index.css` `@theme`)

```css
--font-display: "Archivo Variable", "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-sans:    "Archivo Variable", "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-mono:    "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
```

`--font-heading` is aliased to `--font-display` in `@theme inline`.

### 2.3 The four type utilities — these ARE the system

Defined with Tailwind v4 `@utility` in `index.css`. **Copy these verbatim into the new project.**

```css
@utility ts-display {          /* section headlines */
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 92%;
  letter-spacing: -0.045em;
  line-height: 0.82;
  text-transform: uppercase;
}

@utility ts-display-tight {    /* giant full-bleed statements */
  font-family: var(--font-display);
  font-weight: 800;
  font-stretch: 78%;
  letter-spacing: -0.05em;
  line-height: 0.8;
  text-transform: uppercase;
}

@utility ts-display-wide {     /* wordmark, section stamps, small titles */
  font-family: var(--font-display);
  font-weight: 700;
  font-stretch: 118%;
  letter-spacing: -0.02em;
  line-height: 0.9;
  text-transform: uppercase;
}

@utility ts-label {            /* system microcopy */
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: clamp(0.6875rem, 0.72vw, 0.75rem);  /* floor 11px */
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1;
}

@utility ts-body {
  font-family: var(--font-sans);
  font-weight: 400;
  font-stretch: 100%;
  letter-spacing: -0.011em;
  line-height: 1.55;
}
```

Usage counts across `frontend/src/**/*.jsx`: `ts-label` **167**, `ts-display-tight` **45**, `ts-body` **48**, `ts-display-wide` **13**, `ts-display` **7**. The mono label is the most-used type style on the entire site.

### 2.4 The width axis is the art direction

`PROJECT_MEMORY.md`, load-bearing:
> **Archivo variable: the `wdth 62..125%` axis IS the art direction**, driven with `font-stretch`, **NEVER** `font-variation-settings`.

*(Exception: `motion/ProximityType.jsx` writes `fontVariationSettings` directly because it drives two axes per glyph in a pointer loop. It is the only file that may.)*

Where the axis moves as an animation:

| Component | Resting | Active | File |
|---|---|---|---|
| Ledger rows (`/why-us`) | `70%` (desktop stage) | `116%` | `index.css` `.ts-ledger-title`, `--ledger-wdth` |
| Lab discipline rows | `68%` | `116%` | `index.css` `.ts-read-word` |
| Lab rows, `<1024px` | `74%` | `100%` | `index.css` media query |
| Hero "Without Borders." | `wdth 100` | `wdth 125`, `wght 700→900` | `Hero.jsx` → `ProximityType` |

The `@property` registration that makes width interpolable is the key trick — see §17.5.

**Constraint learned the hard way** (`index.css`, ledger block): animating `font-stretch` requires `white-space: nowrap`, because *"the line box can never reflow to a second line mid-transition."* Below 1024px the axis is **pinned** on wrapping type — activation is carried by ink colour and a red numeral instead.

### 2.5 Headline sizing — actual values

All headlines are fluid `clamp()`, always with `vw` (never fixed steps):

| Context | Value | File |
|---|---|---|
| Hero words | `clamp(3.2rem, 21cqw, 15rem)` — **container query units**, sized by its own grid column | `home/Hero.jsx` |
| Page opener (`/about`, `/services`, `/why-us`) | `clamp(3rem, 13vw, 12rem)` | `layout/PageOpener.jsx` |
| Contact opener (deliberately smaller) | `clamp(2.4rem, 8.2vw, 7rem)` | `pages/Contact.jsx` |
| Footer closing statement | `clamp(3rem, 11vw, 10rem)` | `layout/Footer.jsx` |
| FinalCta | `clamp(3rem, 13vw, 12rem)` | `home/FinalCta.jsx` |
| Section h2 (standard) | `clamp(2.6rem, 8.6vw, 7rem)` | `AiSystem`, `Process` |
| Section h2 (large) | `clamp(2.8rem, 9.5vw, 8rem)` | `DigitalGrowth`, `GlobalPositioning` |
| Horizontal act verb (desktop) | `clamp(3.5rem, 11vw, 11rem)` | `HorizontalServices.jsx` |
| Horizontal act verb (mobile) | `clamp(3.2rem, 19vw, 7rem)` | same |
| Lab beat lines | `clamp(2.5rem, 7.4vw, 6.5rem)` | `index.css` `.ts-lab-beat-line` |
| Contact intent words | `clamp(2.15rem, 5.4vw, 5.8rem)` | `index.css` `.ts-intent-word` |
| Ledger title (compact) | `clamp(1.55rem, 5.6vw, 2.15rem)` | `index.css` |
| Ledger title (pinned stage) | `clamp(1.3rem, 0.9vw + 1.3vh, 2.15rem)` — **vh in the middle term** so eleven rows shrink with a short laptop | `index.css` |
| 404 | `clamp(4rem, 20vw, 16rem)` | `pages/NotFound.jsx` |

**Note the `21cqw` in the hero.** The comment: *"@container + cqw: the statement is sized by its own column, so the longest word ('Automate.') fits exactly at every breakpoint."* That is a reusable idea for the new site.

### 2.6 Body typography

- Base body: `.ts-body`, `lh 1.55`, `ls -0.011em`.
- Lead paragraphs: `text-lg sm:text-xl` (18→20px) with `max-w-xl` / `max-w-md`.
- Secondary paragraphs: `text-[0.98rem]` (~15.7px) — a recurring exact value across `Hero`, `Process`, `AiSystem`, `Principles`, `WhyStrip`.
- Small register copy: `text-[0.95rem]`, `text-[0.93rem]`, `text-[0.9rem]`.
- **Body copy is never uppercase.** Only `.ts-label` and the display cuts are.

### 2.7 Navigation typography

- Desktop nav links: `.ts-label` at `text-[0.82rem]` (`layout/Nav.jsx`).
- Nav CTA + MENU button: `.ts-label` at `text-[0.66rem]`.
- Mobile menu rows: `.ts-display` at `clamp(2.4rem, 13vw, 4.5rem)` — the menu is set in display type, not nav type.
- Mobile menu CTA: `.ts-label` at `text-[0.72rem]`.
- Clock read-outs: `font-mono tabular-nums` — **always `tabular-nums`** for any number that changes.

### 2.8 Buttons

`ActionLink` label: `.ts-label` `text-[0.7rem]`. `.ts-cta-label` / `.ts-bookcta-label`: `font-size: 0.7rem`. `FinalCta`'s oversized button uses `.ts-display-wide` at `clamp(1.1rem, 2.6vw, 1.9rem)`.

### 2.9 Base rules

```css
h1, h2, h3, h4 { font-weight: 800; text-wrap: balance; }
body { font-synthesis-weight: none; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 6rem; }
```

`font-synthesis-weight: none` is important: it forbids the browser faking a weight, which would break the variable-axis look.

### 2.10 Two typographic details worth stealing

- **`word-spacing: 0.14em`** on the compressed display cut. Comment in `index.css`: *"The display cut's negative tracking is subtracted from the word space as well as from the letter space, and at this size that closes it completely — ONE LINE set as ONELINE."* Applied to `.ts-lab-beat-line`, `.ts-cutout`, `.ts-seam-word`, `.ts-read-word`.
- **`.ts-mask` padding trick** — a mask box that doesn't clip descenders:
  ```css
  @utility ts-mask { display: block; overflow: hidden; padding-block: 0.06em; margin-block: -0.06em; }
  ```

---

## 3. COLOR SYSTEM

### 3.1 Palette tokens (`index.css` `@theme`)

```css
--color-paper:      #ffffff;
--color-ink:        #000000;
--color-signal:     #ff2d16;  /* graphics / large type / indicators (3.7:1 on paper) */
--color-signal-ink: #d91a05;  /* small red TEXT on paper (5.1:1) */
--color-ash:        #6b6b6b;  /* muted text on paper (5.4:1) */
--color-ash-dim:    #9a9a9a;
--color-hair:       #e4e4e4;  /* hairline on paper */
--color-smoke:      #f4f4f4;
```

Tailwind v4 generates `bg-signal`, `text-signal`, `border-hair`, `text-ash`, `text-signal-ink`, `bg-ink`, `bg-paper` from these automatically.

**Contrast ratios are recorded in the source** — `--color-signal` is 3.7:1 and is therefore restricted to large type and graphics; `--color-signal-ink` (5.1:1) is the one used for small red text. Preserve this split.

### 3.2 The red rule

`AGENTS.md`: *"Red stays scarce; one full-bleed red moment (`FinalCta` on Home — do not invert)."*

Red appears as: the nav underline, one `size-1.5` square per section header, the progress fills, `::selection`, the focus ring, the CTA hover wipe, the last word of a two-line opener headline, and exactly one full-bleed section.

### 3.3 Zone tokens — the mechanism that makes light/dark free

Every section declares `data-zone="paper" | "ink"`. That attribute re-points the entire token contract, including all shadcn primitives:

```css
:root, [data-zone="paper"] {
  --bg: #ffffff;  --fg: #000000;  --fg-muted: #6b6b6b;
  --line: #e4e4e4;  --line-strong: #000000;  --subtle: #f4f4f4;  --red-text: #d91a05;
}

[data-zone="ink"] {
  --bg: #000000;  --fg: #ffffff;  --fg-muted: #8f8f8f;
  --line: rgba(255,255,255,0.16);  --line-strong: #ffffff;  --subtle: #111111;
  --red-text: #ff2d16;
  color-scheme: dark;
}
```

Bridged into shadcn via `@theme inline` (`--color-background: var(--bg)`, `--color-border: var(--line)`, `--color-ring: var(--color-signal)`, …). And in `@layer base`:

```css
*, *::before, *::after { border-color: var(--line); }
```

— so **every border on the page is automatically zone-correct** with no class needed.

`PROJECT_MEMORY.md`: *"Prefer adding a zone over hand-colouring a component."*

`data-zone` also drives the nav's own colour inversion (§5.5). One consequence documented in `index.css`: `FinalCta` declares `data-zone="ink"` **even though it is red**, purely so the header goes black over it — *"Nothing inside this section reads the zone tokens — every colour here is stated explicitly — so the attribute only steers the header."*

> ⚠️ **Known limitation, recorded in the repo's memory:** `data-zone` describes intent, not paint. Fixed overlays must hit-test with `elementsFromPoint` rather than trust the attribute (see §5.5 and `LabSeam`'s `pointer-events: auto` trick in `index.css`).

### 3.4 Ink-zone alpha ladder

Because ink sections are pure black, hierarchy is built from white alphas. These exact values recur throughout:

| Use | Value |
|---|---|
| Primary text | `#ffffff` |
| Body / secondary | `text-white/60`, `/65`, `/70` |
| Tertiary / captions | `text-white/50`, `/45`, `/40` |
| Faint metadata | `text-white/35`, `/30` |
| Section border | `border-white/16` |
| Row border | `border-white/12` |
| Structural rules behind content | `border-white/[0.07]` |
| Hover ground | `bg-white/[0.02]` – `bg-white/[0.04]` |
| Ghost numeral | `text-white/[0.055]` (ink) / `text-black/[0.045]` (paper) |

### 3.5 Overlays and gradients

There is **no decorative gradient in the design system**. The only gradients are functional:

- `.ts-lab-scrim` — a hard-stop legibility scrim over video:
  ```css
  linear-gradient(90deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,.74) 22%, rgba(0,0,0,.36) 42%, rgba(0,0,0,0) 62%);
  ```
  plus a `1px rgba(255,255,255,0.1)` line at `62%` so it *"reads as a plate edge rather than as a soft vignette."*
- `.ts-ledger-title` — a `radial-gradient` clipped to glyphs with `background-clip: text` (the pointer lens).
- The footer aurora — a WebGL shader (`motion/Aurora.jsx`), ember → signal red → ember, masked to transparent at its own bottom. Comment: *"Upstream ships violet into green; this is lighting, not a light show."*

### 3.6 The grain layer

The one global texture, mounted once in `App.jsx` as `<div className="ts-grain-layer" aria-hidden="true" />`:

```css
@utility ts-grain-layer {
  position: fixed; inset: 0; z-index: 60; pointer-events: none;
  opacity: 0.032;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,…feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch' … 160×160");
}
```

3.2% noise, inline SVG data URI, zero network cost.

### 3.7 Selection and focus

```css
::selection { background: var(--color-signal); color: #ffffff; }
:focus-visible { outline: 2px solid var(--color-signal); outline-offset: 3px; }
```

`index.css` comment: *"Hard-edged, unmistakable focus ring — never removed, only restyled."*

---

## 4. LAYOUT SYSTEM

### 4.1 The shell (container)

```css
@utility ts-shell {
  width: 100%;
  margin-inline: auto;
  padding-inline: clamp(1.25rem, 4vw, 4.5rem);   /* 20px → 72px */
  max-width: 108rem;                              /* 1728px */
}
```

Used **33 times**. It is the only container. Full-bleed elements (marquees, the horizontal track, the red CTA ground) sit outside it; content inside it.

### 4.2 The grid

```css
@utility ts-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: clamp(1rem, 1.6vw, 1.75rem);              /* 16px → 28px */
}
```

Used **24 times**. Always 12 columns, at every breakpoint — the collapse happens through `col-span-12 lg:col-span-N`, never by changing the column count.

**Recurring column splits:**

| Split | Where |
|---|---|
| `lg:col-span-9` + `lg:col-span-3` | Hero (statement / aside) |
| `lg:col-span-8` + `lg:col-span-4` | Footer closing, `WhyStrip`, `AiSystem`, `GlobalPositioning` |
| `lg:col-span-7` + `lg:col-span-5` | `HorizontalServices` act, `Process`, `NoList`, `Contact` |
| `lg:col-span-5` + `lg:col-span-7` | `WebSystem` (sticky statement left, diagram right) |
| `lg:col-span-4` + `lg:col-span-8` | `ServiceGroup` (sticky identity / entries), `Principles` |
| `md:col-span-4` ×3 | Footer link matrix |
| `lg:col-span-5 lg:col-start-8` | Contact form column, `GlobalPositioning` register — **offset columns are used deliberately to break symmetry** |

### 4.3 Vertical rhythm — three utilities own ALL section padding

```css
@utility ts-act      { padding-block: clamp(3.25rem, 6vw, 6.5rem); }   /* 52 → 104px */
@utility ts-act-sm   { padding-block: clamp(2.25rem, 4vw, 4rem);   }   /* 36 → 64px  */
@utility ts-act-open { padding-top:    clamp(6.5rem, 10vw, 9.5rem);    /* 104 → 152px, clears the fixed header */
                       padding-bottom: clamp(2.75rem, 4.5vw, 4.5rem); }/* 44 → 72px  */
```

`PROJECT_MEMORY.md`: *"Section padding is owned by exactly 3 utilities."* The comment in `index.css` adds: *"Change it here and every section moves together."* Usage: `ts-act` ×18, `ts-act-open` ×2 (via `PageOpener` and `Contact`), `ts-act-sm` ×1.

**Do not put `py-*` on a section in the new site.** Add a fourth utility if a fourth beat is genuinely needed.

### 4.4 Internal spacing scale

Observed, consistent values (Tailwind's 4px base):

- Label → headline: `mb-5` … `mb-8` (most often `mb-8`)
- Headline → rule: `mt-8` … `mt-10`
- Rule → body: `pt-5` / `pt-6`
- Header block → content: `mt-9` … `mt-12` (`sm:mt-14`, `sm:mt-16`)
- Row padding in hairline lists: `py-3` (dense) / `py-7` / `py-8 sm:py-10` (editorial)
- Grid row gap: `gap-y-10`

Tokens `--spacing-gut: 1.5rem`, `--spacing-bay: 4rem`, `--spacing-act: 8rem` exist in `@theme` but are **unused** — the clamps above superseded them. Don't carry them forward.

### 4.5 Text measure

- Lead: `max-w-xl` (36rem), `max-w-lg` (32rem)
- Secondary: `max-w-md` (28rem), `max-w-sm` (24rem)
- Tight register copy: `max-w-xs` (20rem)
- Ledger record: `max-width: 36rem` (compact) / `24rem` (pinned column)
- Lab note: `max-width: 34rem`

Nothing on the site runs body copy the full width of the shell.

### 4.6 The structural rules layer

```css
@utility ts-rules {
  position: absolute; inset: 0; pointer-events: none;
  display: grid;
  grid-template-columns: repeat(var(--rule-count, 4), minmax(0, 1fr));
}
```

Applied as `<div className="ts-rules [--rule-count:4] md:[--rule-count:6]">` with 6 child `<div>`s carrying `border-r border-hair` (or `border-white/10` on ink), the extras hidden with `i > 3 ? "hidden md:block" : ""`. Used in `Hero`, `PageOpener`, `Manifesto`, `MissionVision`, `Contact`, and `/capabilities`' opening scene. On entrance they draw with `scaleY: 0 → 1, transformOrigin: "top center"`.

### 4.7 Viewport-based sections

| Section | Height |
|---|---|
| Hero | `min-h-[86svh] lg:min-h-[88svh]` |
| Horizontal act (desktop) | `h-[100svh]`, track inset `top-[96px] bottom-[72px]` |
| Lab section | `calc(100svh + 420svh)` with a `position: sticky` stage at `100svh` |
| Lab seam | `175svh` (`165svh` under 768px) |
| Ledger stage | `100svh`, `padding-top: 7.25rem` to clear the header |
| Capabilities acts | `var(--cap-travel)` tall, sticky stage at `100svh` |
| 404 | `min-h-[100svh]` |

**`svh` everywhere, never `vh`** — this is consistent across the whole codebase and avoids the mobile URL-bar jump.

### 4.8 Z-index ladder

| Layer | z |
|---|---|
| Cursor follower | `120` |
| Route transition wipe | `110` |
| Mobile menu sheet | `95` |
| Mobile menu veil | `90` |
| Fixed header | `80` |
| AI assistant launcher | `75` |
| Grain layer | `60` |
| Skip link (focused) | `200` |

Comment in `ai-chat.css`: *"Under the nav (z-80), over the page. They never overlap."*

---

## 5. NAVIGATION

**File:** `frontend/src/components/layout/Nav.jsx` (exports `NAV_ITEMS`).

### 5.1 Structure

```
<a className="ts-skip-link"> Skip to content
<header ref data-zone={onInk ? "ink" : "paper"} className="fixed inset-x-0 top-0 z-[80] …">
  <div className="ts-shell flex items-center justify-between gap-6">
    <Link to="/">  wordmark image ×2 (rollover)
    <nav className="hidden items-center gap-9 xl:flex">  NavItem × 6
    <div className="flex items-center gap-4">
      <Link to="/contact">  START A PROJECT   (hidden below md)
      <button>MENU</button>                    (hidden at xl and up)
<MobileMenu>  Radix Dialog, portalled
```

### 5.2 Positioning and dimensions

- `fixed inset-x-0 top-0 z-[80]`, full-bleed, content inside `ts-shell`.
- **At rest:** `py-6`, `border-b border-transparent`, no background — the page shows through.
- **Condensed:** `py-3`, `border-b border-[var(--line)]`, `bg-[var(--bg)]/92`, `backdrop-blur-md`, and `supports-[backdrop-filter]:bg-[var(--bg)]/80`.
- Transition: `transition-[background-color,border-color,padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`.
- Logo box: `h-12 sm:h-14 xl:h-16` (48 / 56 / 64px) — **the logo, not the buttons, sets the bar height.**
- Measured heights, per the `.ts-lab-section` comment: **89px at rest, 68px condensed.**

### 5.3 Breakpoint behaviour

| Range | Behaviour |
|---|---|
| `< 768px` | logo + MENU button only |
| `768–1279px` | logo + START A PROJECT + MENU |
| `≥ 1280px` (`xl`) | logo + six inline links + START A PROJECT; MENU hidden |

Note the desktop nav appears at **`xl` (1280px), not `lg`** — six links at `gap-9` plus a CTA plus the wordmark do not fit at 1024.

### 5.4 Scroll behaviour (condense)

```js
ScrollTrigger.create({ start: "top -80", end: 99999, onToggle: (self) => setCondensed(self.isActive) });
```

Condenses after 80px.

### 5.5 Zone inversion — the load-bearing part

The header does **not** predict which section it is over. It hit-tests:

```js
const stack = document.elementsFromPoint(window.innerWidth / 2, 28);
const el = stack.find((node) => node !== bar && !bar.contains(node));
const zone = el?.closest("[data-zone]")?.dataset.zone ?? "paper";
if (zone !== lastZone) { lastZone = zone; setOnInk(zone === "ink"); }
```

Sampled from three places:
1. `ScrollTrigger.addEventListener("refresh", sampleZone)`
2. A `ScrollTrigger.create({ start: 0, end: 99999, onUpdate: sampleZone })` — piggybacking on the existing scroll pass rather than adding a listener
3. `gsap.ticker` every **4th** frame

Reason for (3), from the source: *"ScrollTrigger fires onUpdate, then applies the pin, which changes what is painted under the bar. If the user stops scrolling on that frame … the bar keeps the pre-pin zone and sits there as a white slab on black."*

`PROJECT_MEMORY.md`: **"Do not 'simplify' it — per-section triggers and a live `Set` were both tried and both flickered."**

The `useGSAP` call passes `{ dependencies: [location.pathname], revertOnUpdate: true }`. **`revertOnUpdate` is not optional** — `<Nav>` never unmounts, so without it every route change stacked another pair of ScrollTriggers and another ticker callback.

### 5.6 Desktop link interaction (`NavItem`)

Three simultaneous moves:
1. **Colour** — `text-[var(--fg-muted)] hover:text-[var(--fg)]`, active `text-[var(--fg)]`, `duration-300`.
2. **Label roll** — two stacked copies in an `overflow-hidden` box; the first goes `-translate-y-full`, the second comes from `translate-y-full`. `duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`.
3. **Underline** — `absolute -bottom-0.5 h-px w-full bg-signal`; idle `origin-right scale-x-0`, hover `origin-left scale-x-100`, active `scale-x-100`. `duration-500`, same easing. *Origin flips so it draws in from the left and retracts to the right.*

Every link carries `data-cursor="open"` (see §9).

### 5.7 Logo treatment

- `logo-nav.png` (1200×469), rendered twice for the rollover — same `-translate-y-full` / `translate-y-full` pattern as the links.
- `h-full w-auto object-contain` on both copies so the source is never stretched.
- On ink zones: `brightness-0 invert` (Tailwind composes brightness before invert, so it lands on white, not on an inverted red).
- The source comment records that the art must be **tight to its bounding box** — with transparent padding, "the box height and the height of the visible glyphs are two different numbers and the wordmark reads tiny at any box size."

### 5.8 CTA treatment

```jsx
<Link to="/contact" data-cursor="start"
      className="group/start relative hidden overflow-hidden border border-current px-5 py-3 md:block">
  <span className="absolute inset-0 origin-bottom scale-y-0 bg-signal
                   transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                   group-hover/start:scale-y-100" />
  <span className="ts-label relative z-10 flex items-center gap-2 text-[0.66rem]
                   transition-colors duration-300 group-hover/start:text-white">
    START A PROJECT <ArrowUpRight className="size-3.5" strokeWidth={2} />
  </span>
</Link>
```

`border-current` means it inherits the zone colour for free.

### 5.9 The MENU button

A **word, not a hamburger** — `border border-current px-4 py-3 text-[0.66rem]`, `hover:bg-signal hover:text-white`. This is a brand decision worth keeping.

### 5.10 Mobile menu

Radix `Dialog` primitive, completely re-skinned, portalled. Full-bleed `fixed inset-0`, `data-zone="ink"`, black.

Rows top to bottom: header strip (`● MENU / OPEN` + CLOSE button) → nav rows in `.ts-display` at `clamp(2.4rem,13vw,4.5rem)` → a red `START A PROJECT` row → a 3-column world-clock strip.

`/capabilities` is **excluded** from the mobile list (`MOBILE_NAV_ITEMS = NAV_ITEMS.filter(i => i.to !== "/capabilities")`) because it is desktop-gated; the list is derived, not duplicated.

**All of its motion is CSS keyframes, never GSAP.** From `Nav.jsx`:
> "It was a GSAP timeline, keyed on `open`, and it never ran once: `<Portal>` renders null until its own layout effect flips an internal 'mounted' flag… Keying off the node instead fixed that but exposed a second, worse problem — GSAP's clock and the sheet's CSS clock don't start together, so the stagger drifted against the sheet by the cost of the mount."

Measured drift: **107ms**.

Timings (`index.css`):

| Element | In | Out |
|---|---|---|
| Sheet | `520ms var(--ease-out-expo)`, `translateY -100% → 0` | `400ms var(--ease-in-out-quint)` |
| Veil | `420ms` expo | `300ms` quint |
| Row words | `640ms` expo, delay `165ms + i × 52ms`, `translateY 112% → 0` | none (entry only) |
| Row index | `420ms ease-out`, delay `230ms + i × 52ms` | — |
| CTA | `460ms ease-out`, delay `400ms` | — |
| Clock cells | `400ms ease-out`, delay `450ms + i × 35ms` | — |

`--i` is set per row via inline `style={{ "--i": i }}`.

Two things that are load-bearing and must be carried over:
- The `[data-state="closed"]` keyframes exist so Radix `Presence` keeps the panel mounted long enough for the close to be visible.
- The reduced-motion block sets `animation-delay: 0ms !important` — the global reduce block collapses *duration* but not *delay*, and `both` fill would hold an empty menu on screen for the delay.

Route change closes the menu: `useEffect(() => setMenuOpen(false), [location.pathname])`.

---

## 6. FOOTER

**File:** `frontend/src/components/layout/Footer.jsx`

### 6.1 Structure (top to bottom)

```
<footer data-zone="ink" id="contact" className="relative isolate overflow-hidden bg-black text-white">
  <AuroraBand />                                  ← WebGL band, top 58%, opacity .78, lazy
  <div className="absolute inset-x-0 top-0 h-px bg-signal/60" />   ← the seam hairline
  ① closing statement   (hidden on /contact)
  ② capabilities · contact · logo   (3 × md:col-span-4)
  ③ the wordmark          (WarpText shader, one line ≥640px / two lines below)
  <span className="sr-only">TechnoSpirit</span>
  ④ baseline strip
```

### 6.2 Layout and spacing

| Band | Classes |
|---|---|
| ① | `ts-shell relative border-b border-white/16 pt-16 pb-12 sm:pt-20 sm:pb-14`, inner `ts-grid items-end` |
| ② | `ts-shell relative border-b border-white/16 py-12`, inner `Reveal className="ts-grid gap-y-10" staggerChildren y={16}` |
| ③ | `relative px-3 pt-14 pb-8 sm:px-5 sm:pt-20 sm:pb-10` — note the **smaller** horizontal padding, so the wordmark reaches nearer the edge |
| ④ | `ts-shell relative flex flex-col gap-3 border-t border-white/16 py-5 sm:flex-row sm:items-center sm:justify-between` |

### 6.3 Typography and colour

- Closing headline: `MaskText` in `.ts-display-tight` at `clamp(3rem,11vw,10rem)`, white.
- Column headings: `.ts-label mb-5 text-signal` — **red mono labels**, the only place red labels are used repeatedly.
- Links: `text-[0.95rem] text-white/70 hover:text-white`.
- Address uses a real `<address>` element with `not-italic`.
- Baseline: `.ts-label text-white/40` on both sides.

### 6.4 Responsive behaviour

- ①: `col-span-12 lg:col-span-8` + `col-span-12 mt-9 lg:col-span-4 lg:mt-0 lg:justify-self-end`.
- ②: three `col-span-12 md:col-span-4` — stacked below 768px, three across above.
- ③: the wordmark **breaks to two lines below 640px**: `aspect-[1000/116]` one line, `aspect-[1000/292]` stacked. Comment: *"twelve characters across 390px collapse into a grey stripe, so the word breaks and the width axis opens up."*
- Logo image: `w-[14rem] sm:w-[16rem] md:w-full md:max-w-[19rem]`.

### 6.5 Interactions

- Footer links: red underline `origin-right scale-x-0 → origin-left scale-x-100`, `duration-400` expo — the same move as the nav.
- `START A PROJECT` wrapped in `<Magnet padding={70} strength={4}>`.
- Baseline right-hand text: `<ScrambleText text="BUILT WITHOUT BORDERS" />` — decodes character by character on scroll-in.
- The wordmark refracts under the pointer (`WarpText`, `ogl` shader).

### 6.6 Animation

- Band ②: `Reveal` with `staggerChildren`, `y={16}`.
- Aurora and WarpText are both `lazy()` **and** gated behind an IntersectionObserver (`useNearViewport`, `rootMargin: "100% 0px"` for the aurora, `"50% 0px"` for the wordmark). Reason, from the source: *"the chunk carries `ogl`, which has no business being fetched while the hero is still painting."*

### 6.7 Logo treatment

- Column logo: `logo-footer.jpg` (JPEG, white-backed), `loading="lazy" decoding="async"`, `aria-hidden="true"` because the wordmark below already announces the brand.
- The comment records a real bug: a `brightness-0 invert` filter was removed when the asset moved from transparent PNG to white-backed JPEG, because on a JPEG it *"would paint the entire rectangle solid white with no logo in it at all."*
- A second note: `items-center` on the flex parent is required, or `align-items: stretch` overrides `height: auto` and distorts the mark.

### 6.8 Contextual suppression

```js
const onContactPage = useLocation().pathname === "/contact";
```
Band ① is skipped on `/contact` — *"it would be asking for the thing the visitor is already doing, and it would land a second, competing headline directly under the form."* **Carry this idea over: the footer CTA must not duplicate the page's own CTA.**

---

## 7. BUTTONS / LINKS / CTAs

### 7.1 The primary CTA — `ActionLink`

**File:** `frontend/src/components/ui/ActionLink.jsx`. Built on the shadcn `Button` (`asChild` → router `Link`), then *"re-skinned completely: zero radius, hard black slab, and a red panel that wipes up from the bottom edge on hover. No shadows, no gradient."*

```jsx
<span className="relative flex w-full items-center justify-between gap-6 border px-7 py-5 sm:px-9 sm:py-6
                 border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]">        {/* tone="solid"  */}
  {/*                                border-[var(--line-strong)] bg-transparent text-[var(--fg)] */}  {/* tone="outline" */}
  <span className="absolute inset-0 origin-bottom scale-y-0 bg-signal
                   transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                   group-hover/cta:scale-y-100 group-focus-visible/cta:scale-y-100" />
  <span className="ts-label relative z-10 text-[0.7rem] transition-colors duration-300
                   group-hover/cta:text-white">{children}</span>
  <ArrowUpRight className="relative z-10 size-4 shrink-0 transition-all duration-500
                           ease-[cubic-bezier(0.16,1,0.3,1)]
                           group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1
                           group-hover/cta:text-white" strokeWidth={1.75} />
</span>
```

**The canonical CTA anatomy, reusable everywhere:**
- `justify-between` with the label left and the arrow right, `gap-6`
- 1px border, **zero radius**
- red panel wiping **up from the bottom** (`origin-bottom`, `scaleY`), 500ms, expo
- label recolours to white in 300ms (faster than the wipe, so it stays legible)
- arrow translates `+1, -1` (up-right, matching its own direction)
- `data-cursor="start"`

Two tones only: `solid` (filled, one per view) and `outline` (the quieter second option). The Hero pairs them deliberately: *"Two ways forward, deliberately unequal."*

### 7.2 Form CTAs — `.ts-cta` / `.ts-bookcta-btn`

Same anatomy, expressed in plain CSS (`index.css`):

| | `.ts-cta` (primary) | `.ts-bookcta-btn` (secondary) |
|---|---|---|
| background | `var(--color-ink)` | `transparent` |
| color | `var(--color-paper)` | `var(--color-ink)` |
| padding | `1.15rem 1.75rem`, ≥640px `1.35rem 2.25rem` | `1.05rem 1.75rem`, ≥640px `1.2rem 2.25rem` |
| fill | `scaleY(0) → 1`, `origin: bottom center`, `500ms var(--ease-out-expo)` | identical |
| arrow | `1rem`, `translate3d(.25rem, -.25rem, 0)` on hover, `500ms` | identical |
| width | `width: 100%` of its column | `width: 100%` |

The comment records the reasoning: *"Outline rather than fill, so the page keeps ONE primary action… but it is the same slab, the same red panel wiping up from the baseline, and the same arrow, at the same durations and easing."*

### 7.3 The oversized CTA — `FinalCta`

`border-2 border-black bg-black px-8 py-6 sm:px-12 sm:py-8`, label in `.ts-display-wide` at `clamp(1.1rem,2.6vw,1.9rem)`, arrow `size-7 sm:size-9`, `gap-8`. Hover **inverts** (`hover:bg-transparent hover:text-black`) rather than wiping, because the ground is already red. Arrow moves `1.5` units. Wrapped in `<Magnet padding={110} strength={3.4} />`.

### 7.4 Text links — `SignalLink`

```jsx
<Tag data-cursor="open" className="group/link relative inline-flex items-center gap-1.5
      text-[var(--fg)] transition-colors duration-300 hover:text-[var(--red-text)]">
  <span className="relative">
    {children}
    <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-signal
                     transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]
                     group-hover/link:origin-left group-hover/link:scale-x-100
                     group-focus-visible/link:origin-left group-focus-visible/link:scale-x-100" />
  </span>
</Tag>
```

Note `hover:text-[var(--red-text)]` — the *zone-aware* red (`#d91a05` on paper, `#ff2d16` on ink), so small red text keeps its AA contrast.

### 7.5 Tag / chip pills

Used for capability lists (`AiSystem`, `ServiceGroup`, `WebSystem`, `DigitalGrowth`):

```
paper: ts-label border border-hair px-3 py-2 text-ash
       hover:border-signal hover:text-signal-ink        (duration-300)
ink:   ts-label border border-white/20 px-3 py-2 text-white/65
       hover:border-signal hover:bg-signal hover:text-white
```

Rectangular. No radius. No fill on paper (red text instead) — because a filled red pill at that size would break the "red is scarce" rule.

### 7.6 Row / list-item interactions

- `ServiceGroup` entry: a `w-[3px]` red bar at `-left-4 sm:-left-6`, `origin-top scale-y-0 → 100`, `duration-500` expo; the title `translate-x-1.5`.
- `Disciplines` row: the whole row inverts — `hover:bg-black`, title `group-hover/d:text-white` + `translate-x-3`, body → `text-white/70`, `duration-500` expo. *"So the section reads as a switchboard rather than a grid of feature cards."*
- `HorizontalServices` item: a `size-1.5` red square, `scale-0 → scale-100`, `duration-300`.
- `WhyStrip` / `AiSystem` cards: `hover:border-signal`, `duration-500`.

### 7.7 The universal numbers

| Property | Value |
|---|---|
| Radius | **`0`**, everywhere, no exceptions except the AI orb and the cursor capsule |
| Border | `1px` (`2px` only for emphasis rules under leads, and `border-2` on `FinalCta`) |
| Shadow | **none** |
| Transform / wipe duration | `500ms` |
| Colour transition | `300ms` |
| Underline draw | `400ms` |
| Row / ground transition | `500ms` |
| Easing (JSX) | `ease-[cubic-bezier(0.16,1,0.3,1)]` |
| Easing (CSS) | `var(--ease-out-expo)` — the same curve |

**Every hover on the site uses `cubic-bezier(0.16, 1, 0.3, 1)`.** That one curve is as much a brand signature as the palette.

---

## 8. ANIMATION SYSTEM

### 8.1 Libraries

| Library | Version | Role |
|---|---|---|
| `gsap` | `^3.15.0` | all scroll- and pointer-driven motion |
| `@gsap/react` | `^2.1.2` | `useGSAP` — scoped contexts + automatic cleanup |
| `gsap/ScrollTrigger` | — | scroll |
| `gsap/ScrambleTextPlugin` | — | `ScrambleText` only |
| `lenis` | `^1.3.26` | smooth scroll |
| `ogl` | `^1.0.11` | WebGL: `Aurora`, `WarpText`, `Globe` |
| `scrolly-video` | `^0.0.24` | `/lab` only |
| CSS keyframes / transitions | — | **all** hover state and **all** portal/overlay motion |
| `tw-animate-css` | `^1.4.0` | shadcn accordion open/close only |

**No Framer Motion. No `react-spring`. No AOS.**

### 8.2 The single registration point

`frontend/src/lib/gsap.js` — 40 lines, and every module imports from here:

```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP);

export const EASE = { out: "expo.out", inOut: "power4.inOut", soft: "power2.out" };

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, ScrambleTextPlugin, useGSAP };
```

Note: `prefersReducedMotion()` is read **at call time, not cached**, "so a mid-session OS change is respected."

### 8.3 The division of labour — memorise this

From `index.css`:
> **"GSAP owns pointer- and scroll-driven motion, CSS owns hover state."**

And from `PROJECT_MEMORY.md`:
> **"Overlay/portal motion is CSS keyframes, not GSAP."**

So: hover → CSS transition. Overlay/modal/menu → CSS keyframes keyed on `data-state`. Scroll / pointer-tracking / entrance timelines → GSAP.

### 8.4 The five load-bearing motion rules

`PROJECT_MEMORY.md` calls these *"Five load-bearing rules, each of which cost a real bug."* **Carry all five into the new project.**

1. **Never animate `yPercent`/`scaleX` *to* a value whose start comes from a CSS percentage transform.** The browser resolves it to a matrix and the unit is gone. Use `fromTo`, or `gsap.set` first.
   *Worked example* — `MaskText.jsx` states both halves explicitly:
   ```js
   gsap.fromTo(words, { yPercent: 108, y: 0 }, { yPercent: 0, y: 0, … });
   ```
   Comment: *"GSAP records it as `y: 110px` with `yPercent: 0`. Animating yPercent alone then leaves that 110px pixel component untouched… so the headline renders as a stack of empty boxes even though the animation reports progress 1."*

2. **Never put a Tailwind `scale-*` / `translate-*` utility on a GSAP-transformed element.** Tailwind v4 compiles them to the standalone `scale` / `translate` properties, which *compose with* `transform` — the tween runs and nothing moves. State the rest position as an inline `style={{ transform: "scaleY(0)" }}`.
   Seen in `Principles.jsx`, `HorizontalServices.jsx`, `Process.jsx`, `Contact.jsx`, `RouteTransition.jsx`.

3. **Never tween a `clip-path` string.** Tween numeric `{w,h,r,o}` and compose the string in `onUpdate` (see `Cursor.jsx`, §17.6). Computed values normalise to shortest form and GSAP pairs complex-string numbers positionally.

4. **Overlay/portal motion is CSS keyframes.** (§5.10 for the full story.)

5. **Never `setState` on a pointer or scroll frame.** Write `textContent` / transforms imperatively.
   `HorizontalServices.jsx` does exactly this:
   ```js
   progress.current.style.transform = `scaleX(${self.progress})`;
   if (counter.current.textContent !== next) counter.current.textContent = next;
   ```

### 8.5 Smooth scroll (Lenis)

`frontend/src/components/layout/SmoothScroll.jsx`:

```js
const lenis = new Lenis({
  duration: 1.05,                                            // "premium, not sluggish"
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical",
  gestureOrientation: "vertical",
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.6,
  syncTouch: false,        // native momentum on touch — do not fight the OS
  autoRaf: false,          // GSAP's ticker owns the loop instead
});

lenis.on("scroll", () => ScrollTrigger.update());
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

**Why `autoRaf: false` matters** (from the file): *"Lenis needs to be driven by GSAP's ticker so the two never run on separate RAF loops (which is what causes pinned-section jitter)."*

Under `prefers-reduced-motion`, **Lenis is never instantiated** — native scroll only.

Exposed via context as `{ lenis, stop, start, scrollTo }`; `scrollTo` defaults to `offset: -80, duration: 1.2`.

### 8.6 Entrance / reveal animations

Two shared primitives.

**`ui/MaskText.jsx`** — word-level masked reveal:
```
yPercent: 108 → 0   duration 1.05   ease "expo.out"   stagger 0.055
scrollTrigger: { start: "top 88%", toggleActions: "play none none none" }
```
`lines` is an array of strings — *"one entry per visual line, which keeps the line breaks art-directed instead of left to the browser."* Optional `scrub` mode uses `{ start, end: "bottom 60%", scrub: 1 }`.

**`ui/Reveal.jsx`** — subtle fade-up:
```
opacity 0 → 1, y 20 → 0   duration 0.7   ease "power2.out"   stagger 0.07 (when staggerChildren)
scrollTrigger: { start: "top 88%", toggleActions: "play none none none" }
children capped at .slice(0, 10)
```
Comment: *"Small offsets only (8–24px) so it reads as a fade rather than a slide."* Callers pass `y={14}`–`y={20}`.

**`ui/ScrubWords.jsx`** — statement type that inks in word by word:
```
opacity from 0.16 → 1   ease "none"   stagger 0.5
scrollTrigger: { start: "top 78%", end: "bottom 55%", scrub: 0.8 }
```
Opacity only, no transform — *"so it stays cheap and never shifts layout."* Words listed in `accent` render `text-signal`.

### 8.7 The two canonical entrance timelines

**Hero** (`home/Hero.jsx`), `defaults: { ease: "expo.out" }`:

| # | Target | From → To | Duration | Stagger | Position |
|---|---|---|---|---|---|
| 1 | `[data-hero-rule]` | `scaleY 0 → 1`, origin top | 1.1 | 0.07 | 0 |
| 2 | `[data-hero-meta]` | `opacity 0, y 10` | 0.7 | 0.06 | `-=0.75` |
| 3 | `[data-hero-word]` | `yPercent 112 → 0` | 1.25 | 0.09 | `-=0.6` |
| 4 | `[data-hero-signal]` | `scaleX 0 → 1`, origin left | 0.9 | — | `-=0.8` |
| 5 | `[data-hero-body]` | `opacity 0, y 22` | 0.8 | 0.09 | `-=0.7` |
| 6 | `[data-hero-strip]` | `yPercent 100 → 0` | 1.0 | — | `-=0.8` |

**The order is the brand statement: structure draws → metadata lands → the statement prints → the red signal arrives last.**

**PageOpener** (`layout/PageOpener.jsx`) — the same grammar, slightly quicker: rules `1.0/0.06` → meta `0.6/0.05` at `-=0.7` → words `yPercent 112`, `1.15/0.08` at `-=0.5` → body `0.75/0.08` at `-=0.7`. `Contact.jsx` extends it with a seam draw and row-word reveal.

Its docstring states the intent: *"Same structural grammar as the home hero — rules, metadata rail, masked statement — so the four routes read as one document, while each page supplies its own headline shape and register."*

### 8.8 Parallax

Only two kinds, both `ease: "none"` with `scrub`:

```js
// Hero — the statement drifts up faster than the page
gsap.to(q("[data-hero-type]"),  { yPercent: -14, ease: "none",
  scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 } });
gsap.to(q("[data-hero-aside]"), { yPercent: -40, ease: "none", … scrub: 0.6 });

// Horizontal act — ghost numerals drift against horizontal travel
gsap.fromTo(numeral, { xPercent: 12 }, { xPercent: -12, ease: "none",
  scrollTrigger: { trigger: panel, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
```

`containerAnimation` is the correct way to run a ScrollTrigger inside a horizontally-scrolling track.

### 8.9 Pinning — the one-pin rule

`PROJECT_MEMORY.md`:
> **"Only ONE real ScrollTrigger pin site-wide** (Home horizontal act); every later 'pin' is CSS `position: sticky`."

The horizontal act (`home/HorizontalServices.jsx`):

```js
gsap.to(track.current, {
  x: () => -travel(),
  ease: "none",
  scrollTrigger: {
    trigger: root.current,
    pin: true, pinSpacing: true,
    scrub: 0.8,
    start: "top top",
    end: () => "+=" + Math.round(travel() * 0.62),   // SCROLL_RATIO = 0.62
    invalidateOnRefresh: true,
    anticipatePin: 1,
    refreshPriority: -1,
    onUpdate: (self) => { /* imperative writes only */ },
  },
});
```

`SCROLL_RATIO = 0.62` is documented: *"At 1:1 the act ate ~3 viewport heights of scrolling and felt like wading; 0.62 makes the same journey land in roughly two."*

Everything else that looks pinned is `position: sticky`:
- `/lab` — `.ts-lab-section { height: calc(100svh + 420svh) }` + `.ts-lab-pin { position: sticky; top: 0; height: 100svh }`. Comment: *"No pin spacer to re-measure, nothing to strand on resize or on a route return, and identical behaviour on touch. ScrollTrigger only reports progress."*
- `/capabilities` — `.cap-act { height: var(--cap-travel) }` + `.cap-stage { position: sticky; top: 0; height: 100svh }`
- `/why-us` ledger, `Principles` counter, `ServiceGroup` identity (`lg:sticky lg:top-32`), `WebSystem` statement (`lg:sticky lg:top-32`)

⚠️ **Sticky gotcha recorded in `index.css`:** *"an `overflow` other than `visible` on an ancestor turns that ancestor into the sticky element's scrollport"* — put the clipping on the stage, not on the tall section. Also `body { overflow-x: clip }` (not `hidden`) for the same reason.

### 8.10 Class-toggle driven state (scroll → CSS)

The cheapest pattern on the site, used repeatedly:

```js
ScrollTrigger.create({
  trigger: step, start: "top 62%", end: "bottom 20%",
  toggleClass: { targets: step, className: "is-live" },
});
```

The visual change is then a plain CSS transition (`.ts-step.is-live [data-step-dot] { background: var(--color-signal); transform: scale(1.75) }`). **Scroll decides state; CSS animates it.**

Where a boundary between two adjacent items would race, use **one scrubbed trigger over the whole list and derive the index from progress** — `Principles.jsx` explains why:
> *"adjacent triggers fire in an undefined order at the boundary between two principles, so the reel could receive 'activate 03' and 'deactivate 02' in either sequence and jump… What remains is a single scrubbed trigger that owns the whole list and derives the index from one progress value, so there is exactly one source of truth and nothing to race."*

### 8.11 Page transitions

`frontend/src/components/layout/RouteTransition.jsx` — *"~0.9s door to door — long enough to read as intentional, short enough that it never feels like waiting."*

```js
const tl = gsap.timeline();
tl.set(panel, { transformOrigin: "bottom center", scaleY: 0, visibility: "visible" })
  .set(rule,  { scaleX: 0, transformOrigin: "left center" })
  .to(rule,   { scaleX: 1, duration: 0.34, ease: "power3.inOut" })
  .to(panel,  { scaleY: 1, duration: 0.42, ease: "power4.inOut" }, "-=0.18")
  .add(resetScroll)                                   // hidden under the panel
  .set(panel, { transformOrigin: "top center" })
  .to(panel,  { scaleY: 0, duration: 0.5,  ease: "power4.inOut" }, "+=0.04")
  .to(rule,   { scaleX: 0, transformOrigin: "right center", duration: 0.3 }, "-=0.4")
  .set(panel, { visibility: "hidden" });
```

Markup: `fixed inset-0 z-[110] pointer-events-none`, a `bg-black` panel and a `h-[3px] bg-signal` rule at the top.

Three details:
- **No wipe on first paint** (`first.current` guard) — the hero owns the entrance.
- Under reduced motion it just resets scroll.
- `{ dependencies: [location.pathname], revertOnUpdate: true }` — without `revertOnUpdate`, every route change left the previous timeline in the context.

### 8.12 Text animations inventory

| Effect | Component | Mechanism |
|---|---|---|
| Masked word reveal | `ui/MaskText.jsx` | GSAP `yPercent 108 → 0` in `overflow:hidden` |
| Word-by-word ink-in | `ui/ScrubWords.jsx` | scrubbed opacity `0.16 → 1` |
| Decode / scramble | `motion/ScrambleText.jsx` | `ScrambleTextPlugin`, `duration 1.1`, `speed 0.55`, `revealDelay 0.15`, `once: true` |
| Pointer-reactive variable axes | `motion/ProximityType.jsx` | per-glyph `fontVariationSettings`, `lerp 0.36` |
| Width-axis focus | `.ts-ledger-title`, `.ts-read-word` | `@property` + CSS transition on `font-stretch` |
| Curved marquee | `motion/CurvedMarquee.jsx` | SVG `textPath` |
| Cut-out type over media | `motion/CutoutHeading.jsx` | SVG mask + `clip-path` |
| Refracted wordmark | `motion/WarpText.jsx` | `ogl` shader over a rasterised texture |
| Type as a doorway | `LabSeam` / `.ts-seam-word` | `clip-path: inset()` driven by `--open` |

### 8.13 Loading behaviour

- `/lab` gates scroll until frames are decoded: `html.ts-lab-locked { overflow: hidden; overscroll-behavior: none }` **plus** `lenis.stop()`. Comment: *"this is the belt to that braces."* Progress is a red `scaleX` bar (`.ts-lab-prep-fill`, `transition: transform 220ms linear`).
- Route chunks are warmed during idle (`warmRoutes()` in `App.jsx`, `requestIdleCallback` with a 4000ms timeout, falling back to a 2000ms `setTimeout`). Failures are swallowed.
- `<Suspense fallback={null}>` for routes — *"the wipe panel is already over the viewport when a chunk is in flight, so anything drawn here would only ever be seen behind black."*

### 8.14 Mobile / reduced-motion differences

**Reduced motion** is treated as a first-class layout, not a switch-off. `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  .ts-marquee-track { animation: none !important; transform: none !important; }
  .ts-motion [data-anim] { opacity: 1 !important; }
  .ts-motion [data-anim="mask"] .ts-mask > *,
  .ts-motion [data-anim="draw"], .ts-motion [data-anim="draw-y"] { transform: none !important; }
}
```

Beyond that, `/lab` and the ledger have **bespoke reduced-motion layouts**: the pin becomes static, the video becomes a still poster at `aspect-ratio: 16/9`, the beats become a plain reading-order list, and dimmed rows return to `font-stretch: 100%` because *"there is no live row when there is no sequence running, so dimming three of them would be hiding content."*

**Touch / small screens:**
- The cursor follower is not rendered at all (`(pointer: fine) and (hover: hover)` + `hidden lg:block`).
- `Magnet` and `ProximityType` are inert on coarse pointers.
- The horizontal act becomes a vertical stack — `gsap.matchMedia()` with `desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)"`.
- The ledger's width axis is pinned below 1024px.
- The contact intent plate is `display: none` below 1024px — *"Below the split there is no pointer to follow, so the plate never renders and can never sit orphaned in the corner of a stacked layout."*
- `/lab` and `/capabilities` are device-gated entirely (§12.6).

### 8.15 The `ts-motion` gate — no-JS safety

`frontend/src/main.jsx`, before the first render:

```js
document.documentElement.classList.add("ts-motion");
```

Every hidden resting state is scoped to it:

```css
.ts-motion [data-anim="mask"] .ts-mask > * { display: inline-block; transform: translate3d(0, 108%, 0); }
.ts-motion [data-anim="fade"]  { opacity: 0; }
.ts-motion [data-anim="draw"]  { transform: scaleX(0); transform-origin: left center; }
.ts-motion [data-anim="draw-y"]{ transform: scaleY(0); transform-origin: top center; }
```

*"Elements start hidden ONLY when JS is confirmed live, so no-JS and crawler renders keep every word visible."*

Why it lives in `main.jsx` and not in an effect: *"an effect lands after the layout effects that initialise the animations. That ordering made the very first mount read `transform: none` while every client-side remount read the seeded transform, so a component could animate correctly on load and incorrectly on navigation."*

### 8.16 Easing reference

| Name | Value | Used for |
|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | **everything that arrives** — hovers, reveals, wipes |
| `--ease-in-out-quint` | `cubic-bezier(0.83, 0, 0.17, 1)` | things that leave (menu close) |
| `EASE.out` | `"expo.out"` | GSAP entrances |
| `EASE.inOut` | `"power4.inOut"` | route wipe panel |
| `EASE.soft` | `"power2.out"` | `Reveal`, small fades |
| `"power3.out"` | — | cursor follower `quickTo` |
| `"back.out(1.3)"` | — | **one** place only: the cursor capsule entry, *"a touch of overshoot so the capsule arrives with weight"* |
| `"none"` | — | every scrubbed tween |

### 8.17 Duration reference

| Range | Use |
|---|---|
| 120–200ms | cursor dot follow, copy swaps |
| 300ms | colour transitions |
| 380–420ms | small state changes, capsule colour |
| 420–520ms | pointer plate slides, menu veil |
| 500ms | **the standard hover transform** |
| 550–640ms | pointer follow smoothing, row reveals |
| 700–800ms | `Reveal`, body fades |
| 900–1250ms | hero/opener statement lines |
| ~900ms total | route transition |

---

## 9. MICRO-INTERACTIONS

### 9.1 The custom cursor

`frontend/src/components/layout/Cursor.jsx` — the most distinctive interaction on the site.

**Architecture:** ONE fixed box of constant size; every state is a different `clip-path` window onto it.

```js
const BOX_W = 340, BOX_H = 96;
const DISC = { idle: 30, interactive: 58, labelled: 96, mute: 16 };
const CAP_H = 54, CAP_PAD = 26, CAP_MAX = BOX_W - 24, CAP_RING = 1.5;
const SIGNAL = "#ff2d16", INK = "#000000";

function clipFor(w, h, r) {
  const y = (BOX_H - h) / 2, x = (BOX_W - w) / 2;
  return `inset(${y}px ${x}px ${y}px ${x}px round ${r}px)`;
}
```

Why: *"Sizing by clip instead of by width/height keeps this off the layout path: the box never resizes, so nothing reflows, and the corner radius rides in the same value as the shape, which is what makes square → capsule a single continuous move… It also leaves `scaleX/scaleY/rotation` free for the velocity lean."*

**States:**

| State | Shape | Trigger |
|---|---|---|
| idle | 30px red square | default |
| interactive | 58px red square | `a, button, [role='button']` |
| labelled | 96px red square + mono label | `[data-cursor="open\|start\|explore\|drag\|scroll"]` |
| mute | 16px registration mark | `[data-cursor-mute]` — where something else already follows the pointer |
| capsule | measured-width × 54, r 27, **black** + microcopy | `[data-cursor-capsule="build\|automate\|scale"]` |

**Follow smoothing:** dot `quickTo` 0.12s `power3.out`; ring 0.55s `power3.out` — the lag between them is the effect.

**Velocity lean** (capsule only): `rotation = clamp(vx * 0.13, -7, 7)`, `scaleX = 1 + min(|vx| * 0.0016, 0.07)`, `scaleY = 1 - min(|vx| * 0.0011, 0.045)`, smoothed `vx += ((dx/dt)*16.67 - vx) * 0.18`, relaxed after a 90ms idle timeout.

**Two plates:** an outer paper-white box whose window is the inner's grown by `CAP_RING`, so white reads only as a rim — invisible on paper, and a legibility edge where the capsule crosses black type.

**Three bugs the code guards against — reproduce all three guards:**
1. **State-key guard.** `pointerover` bubbles and fires for elements sliding under a *stationary* pointer (the hero's marquee did this continuously). `if (state === next) return;`
2. **Kill the copy timeline by hand.** `overwrite` is a tween option and is silently ignored on a timeline.
3. **Don't tween the clip-path string** (§8.4 rule 3).

Gated on `(pointer: fine) and (hover: hover)` and `!prefersReducedMotion()`, plus `hidden lg:block`.

`PROJECT_MEMORY.md`: **"Hero words must never fade on hover (user decision)."**

### 9.2 Magnetic hover

`frontend/src/components/motion/Magnet.jsx`. Defaults `padding = 90`, `strength = 3.2`; `gsap.quickTo(inner, "x"|"y", { duration: 0.55, ease: "expo.out" })`; the box is **cached** and invalidated on scroll/resize/`ScrollTrigger.refresh` via a `requestAnimationFrame` guard.

Rewritten from React Bits, which *"called setState on every mousemove (a React re-render per pointer event) and read `getBoundingClientRect()` on every event as well."*

Applied to: Footer CTA (`70 / 4`), Hero primary CTA (`70 / 4`), `FinalCta` (`110 / 3.4`). Note the Hero comment: *"Only the primary carries `<Magnet>` — two pointer-attracting targets this close fight each other."*

### 9.3 Label / word roll-up

The signature link move, used in the nav, the logo, and the contact intent list: two identical copies, one going `-translate-y-full`, the other arriving from `translate-y-full`, 500–520ms expo. *"The copy underneath is a real second line of type parked one line box down, so what arrives is the same word at the same weight — not a fade, not a colour change."*

### 9.4 Underline draw

`h-px bg-signal`, idle `origin-right scale-x-0`, hover `origin-left scale-x-100`, 400–500ms expo. The origin flip is what makes it feel drawn rather than scaled.

### 9.5 Panel wipe

`absolute inset-0 origin-bottom scale-y-0 bg-signal` → `scale-y-100`, 500ms expo, with the label recolouring in 300ms.

### 9.6 Pointer-tracked image plate

`frontend/src/components/contact/HoverImageReveal.jsx`:
- `CLEAR_X = 44` (gap held between pointer and plate edge — the plate hangs off the pointer's **right shoulder**, never under it, "sitting under the cursor it would cover the word being read")
- `EDGE_PAD = 12`, `OVERHANG = 0.45`
- `quickTo` at `duration: 1, ease: "power2.out"` — *"Overdamped on purpose — the plate trails the pointer rather than being welded to it, which is what makes it read as a separate object."*
- The first frame is `gsap.set`, not tweened, so no diagonal flight from the corner.
- Images are a **reel**: all mounted, above the hovered index at `-100%`, below at `100%`, hovered at `0`, `transition: transform 520ms`. Never a crossfade — *"between two high-contrast plates goes grey in the middle."*
- Row hover is React state (once per row); position never touches React.
- `pointerleave` clearing is deferred one `requestAnimationFrame` and cancelled by the next `pointerenter`, so sliding between rows never collapses the reel for a frame.

### 9.7 Text lens (`background-clip: text`)

`.ts-ledger-title` paints a `radial-gradient` clipped to the glyphs at `var(--lx) / var(--ly)`, radius `96px` (`120px` on the desktop stage). *"It is localised by construction. Nothing beyond the lens radius is written to."* Guarded by `@supports (background-clip: text)`, and where unsupported the type simply keeps its `color`.

`--lx` / `--ly` are deliberately **not** registered with `@property`: *"they are written from the pointer loop and must land on the same frame, with no easing."*

### 9.8 Scroll feedback

- Horizontal act: a `01 / 04` counter + a `h-[3px]` red `scaleX` bar in a fixed black rail.
- `/lab`: a full-bleed `2px` scrub rail at the bottom edge — *"Full-bleed and hard against the bottom edge, like a film scrub. In flow next to the hint it started a third of the way across and looked like a bar that had failed to fill rather than one that had not run yet."*
- `Principles`: a sticky slot-reel numeral + a vertical red fill.
- `Process`: a red line filling down the timeline, markers scaling `1.75×` and going red as it passes.
- Hero: a `SCROLL` label with a `w-10` rule.

### 9.9 Card / row hover inventory

| Move | Value |
|---|---|
| Row ground | `hover:bg-white/[0.02]` → `/[0.04]` (ink), `hover:bg-black/[0.03]` (paper) |
| Row border | `hover:border-signal`, `duration-500` |
| Title nudge | `translate-x-1.5` / `translate-x-2` / `translate-x-3`, `duration-500` expo |
| Dot appear | `size-1.5 bg-signal scale-0 → scale-100`, `duration-300` |
| Left bar | `w-[3px] bg-signal origin-top scale-y-0 → 100`, `duration-500` |
| Full inversion | `hover:bg-black` + `text-white`, `duration-500` |

### 9.10 Form micro-interactions

`.ts-field-*` in `index.css` — *"Engineered, not decorated."*
- **Persistent labels** — *"a label that moves is a label you have to wait for."*
- One message slot per field, so validation can never change a field's height.
- A `1px` hairline under the input; on `:focus-within` a black `scaleX(0 → 1)` rule draws across it in 560ms — *"the same signal move the nav underline and the ActionLink wipe make."*
- Invalid: the rule turns red and stays drawn *"whether or not it currently holds focus."*
- Placeholder fades to `--color-hair` on focus.
- Honeypot is moved off-screen, not `display: none`, *"because a bot that skips undisplayed inputs would skip the trap too."*

### 9.11 The AI assistant orb

`components/ai-chat/*` + `styles/ai-chat.css`. Worth noting as brand vocabulary: **the one curve on the site** — "a solid circle that inverts with the section behind it, black on paper and white on ink, with no gradient, glow or ornament anywhere in it." Ring text `"CUSTOMER • SUPPORT • "`, 16s per revolution, hover rate `1.2` ramped over 320ms. Hover scale is `1.03` — *"on a flat circle a 6% jump reads as the object growing, where 3% reads as it noticing."* Position follows the cursor via a CSS **transition** retargeted by `pointermove`, not a rAF lerp.

---

## 10. SECTION COMPOSITION

These are the underlying rules, extracted rather than listed.

### 10.1 The standard section header (used ~15 times)

```jsx
<div className="ts-grid items-end border-b border-hair pb-12">
  <div className="col-span-12 lg:col-span-7">
    <SystemLabel className="mb-8">CAPABILITY / WEB</SystemLabel>
    <MaskText as="h2" lines={["How the", "work moves."]}
              className="ts-display-tight text-[clamp(2.6rem,8.6vw,7rem)] text-ink" />
  </div>
  <div className="col-span-12 mt-8 lg:col-span-5 lg:mt-0 lg:pl-8">
    <p className="ts-body max-w-sm text-[0.98rem] text-ash">…</p>
  </div>
</div>
```

**Rules encoded here:**
1. Eyebrow label is mono, uppercase, and **names the section** — often `NOUN / QUALIFIER` (`CAPABILITY / WEB`, `PROCESS / 01—06`, `SERVICES / FULL INDEX`, `WHY / TECHNOSPIRIT`).
2. Headline is **two short lines**, art-directed, never auto-wrapped.
3. The supporting paragraph sits **beside** the headline in the offset column — never underneath it.
4. `items-end` so the small copy baselines with the bottom of the headline.
5. The block closes on a hairline (`border-b … pb-12`).

### 10.2 The "no cards" rule

There is not a single card with a radius, shadow, or filled background on the marketing site. Lists are **full-width rows separated by hairlines**:

```jsx
<ul className="border-t border-hair">
  {items.map(i => <li key={i} className="border-b border-hair py-3">…</li>)}
</ul>
```

Where a grid is genuinely needed, it is made from borders: `grid gap-px border-t border-white/16` with each child carrying `border-b`.

### 10.3 The split-column rule

Every content section is a deliberate imbalance: **giant type on one side, quiet register on the other**. Never a 50/50 split of two equal-weight things. `index.css` states the principle for `/contact`:

> *"Two halves that are deliberately not equal in temperature… That contrast is the composition — make both sides expressive and the page has no centre."*

### 10.4 Sticky identity

When a list is long, its identity sticks: `lg:sticky lg:top-32` on the left column (`ServiceGroup`, `WebSystem`, `Principles`). *"The label stays with you instead of scrolling away and leaving the list unattributed."* `top-32` = 8rem, clearing the 89px header.

### 10.5 Full-viewport sections

Reserved for: the hero, the horizontal act, `/lab`, `/capabilities`, `/why-us`'s ledger, and 404. Everything else is content-height with `ts-act` padding. **A full-viewport section must earn it with a mechanic**, not just with a big headline.

### 10.6 Dark / light transitions

- Alternation is a rhythm decision, not a per-section one. On `/services` it is computed from the index.
- A transition between two temperatures gets a **join**: the `CurvedMarquee` ribbon between `Manifesto` and `HorizontalServices` (*"It is the join between the calm manifesto and the loudest section on the page, and it doubles as the section label so the handoff carries information"*), the full-bleed marquee rule in `DigitalGrowth`, the `1px bg-signal/60` hairline at the footer's top edge.
- The horizontal act and `/lab` are **letterboxed with black rails** top and bottom — *"the same film-strip device… and the same favour to the fixed nav, which gets one consistent black ground for the whole sequence."* This is the answer to "how do I stop a section colliding with a transparent fixed header."

### 10.7 Whitespace transitions

The marquee strip is the site's paragraph break: a full-bleed band, `border-y border-ink py-4`, containing type at `clamp(1.4rem,4vw,3rem)` in `.ts-display-wide`, separator `／`. It marks a change of subject without a headline.

### 10.8 Progressive disclosure

`DigitalGrowth` uses a shadcn `Accordion`, fully re-skinned: giant `clamp(2rem,7vw,5rem)` rows, `[&>svg]:hidden` to kill the chevron, and a **plus→minus drawn as two 1px rules** where the vertical one is red and `group-aria-expanded/trigger:scale-y-0`. That is the house idiom for "expandable" — no chevrons, no icons.

### 10.9 The closing beat

Every page ends on: footer closing statement → link matrix → wordmark → baseline. Home additionally gets `FinalCta` — the one red frame. The escalation is deliberate; don't spend red earlier.

---

## 11. IMAGES / MEDIA

### 11.1 Sizing and fit

- Plates: `aspect-ratio: 4/5` (contact intent), `object-fit: cover`, `width:100% height:100%`.
- Logo: `h-full w-auto object-contain` (never `cover` on a mark).
- Wordmark box: `aspect-[1000/116]` / `aspect-[1000/292]`.
- Globe: `relative aspect-square w-full`.
- Video stages: `position:absolute; inset:0` with `object-fit: cover`.

### 11.2 Radius, masks, overlays

- **No `border-radius` on any image.** Zero exceptions on the marketing site.
- Masks are used instead of radius: `clip-path: inset()` (the seam doors, the cursor), SVG text masks (`CutoutHeading`), `background-clip: text` (the ledger lens).
- Overlays are functional only: the `/lab` legibility scrim and letterbox rails.
- One blend-mode trick worth stealing (`capabilities.css`): a white heading composited with `mix-blend-mode: difference` reads black on paper and flips to white the instant a black lens moves behind it — *"One blend layer does the whole inversion — no duplicate element, no clip-path on the type, and nothing that has to be kept in sync with the lens's position."*
- Hand plates use `mix-blend-mode: screen` over black so their black ground vanishes without an alpha channel.

### 11.3 Formats and responsive delivery

AVIF first, WebP fallback, two widths:

```jsx
<picture>
  <source type="image/avif" srcSet={`${avifSm} 1280w, ${avif} 1672w`} sizes="106vw" />
  <img src={webp} srcSet={`${webpSm} 1280w, ${webp} 1672w`} sizes="106vw"
       width={W} height={H} alt="" decoding="async" fetchPriority="high" />
</picture>
```

`width` and `height` are **always** present (CLS), `decoding="async"` always, `loading="lazy"` for below-fold, `fetchPriority` set explicitly (`high` for staged assets, `low` for trail images).

Optimisation is scripted, not manual: `frontend/scripts/optimize-capabilities-images.mjs` (sharp) and `optimize-capabilities-video.mjs` (ffmpeg via `ffmpeg-static`). The script's header documents the *reasoning* per asset — e.g. the starfield gets `avifQuality: 66` because *"At q66 the count [of surviving single-pixel highlights] is unchanged and the file is 127 KB; below that the dark nebula bands before the stars do."* **Measure, don't eyeball.**

Widths chosen: `1672` (native) and `1280` — *"`md` covers 1280–1600 viewports at the plate's ~1.06vw render width without ever asking a browser to downscale by more than 2×."* **Nothing is upscaled.**

### 11.4 Video treatment

- Scroll-scrubbed via `scrolly-video` (`/lab`) or a custom stage (`/capabilities`).
- Always paired with a poster image (`.webp`/`.avif`) that sits **under** the video, so the first decoded frame simply covers it: *"Under the picture, so the first painted frame simply covers it rather than needing to be timed against a fade."*
- Encoding: **all-intra** so any frame is seekable. `AGENTS.md` records the lesson — the `/lab` clip has a 6s GOP, and *"the fix is re-encoding all-intra, not touching `ShouldDecode` workarounds."*
- Video is desktop-gated; a phone never downloads a byte of it.

### 11.5 Image animation patterns

| Pattern | Where |
|---|---|
| Reel slide (never crossfade) | contact intent plate |
| Parallax inside a mask | `CutoutHeading` (`.ts-cutout-media` scaled up so the parallax has travel; the wrapper must be `overflow:hidden` because `clip-path` does not clip scrollable overflow) |
| Scroll scrub | `/lab`, `/capabilities` aircraft |
| Pointer lens reveal | `/capabilities` opening |
| Trail | `capabilities/ImageTrail.jsx` |

### 11.6 Asset organisation

```
frontend/public/
├── images/                        logos, favicons, og card, source plates
├── intent/                        contact plate art (img1–5.avif) + svg
├── capabilities/optimized/        generated AVIF/WebP/MP4 + posters
├── lab/                           poster frames
├── video/                         scroll-video.mp4
├── robots.txt, sitemap.xml
frontend/src/assets/               build-time imports only (hero.png, vite.svg)
```

Logo variants in use: `logo-nav.png` (transparent, tight bbox — nav), `logo-footer.jpg` (white-backed — footer column), `favicon-logo.png`, `favicon.svg`, `og-technospirit.png` (1200×630).

---

## 12. RESPONSIVE DESIGN

### 12.1 Breakpoints

Tailwind v4 defaults, **unmodified** (verified: no `--breakpoint-*` overrides in `index.css`):

| Prefix | Min width | Uses in `src/**/*.jsx` |
|---|---|---|
| `sm` | 640px | 98 |
| `md` | 768px | 28 |
| `lg` | **1024px** | **112** |
| `xl` | 1280px | 7 |
| `2xl` | 1536px | 0 |

**`lg` (1024px) is the site's real breakpoint** — it is where the layout, the motion budget and the device gate all change. `sm` (640px) is the typographic breakpoint. `md` and `xl` are used sparingly and for specific components (footer columns; the nav's link row).

CSS-side queries use `1023.98px` / `767.98px` for exact complements.

### 12.2 Large desktop (≥1536px)

- `ts-shell` caps at `108rem` (1728px) and centres; side padding maxes at `4.5rem`.
- Type clamps hit their ceilings (`12rem` openers, `15rem` hero).
- Grid gap maxes at `1.75rem`.
- No 2xl-specific rules exist — the clamps do the work.

### 12.3 Laptop (1024–1440px)

- Full desktop layout: horizontal act pinned, ledger stage pinned, cursor live, sticky columns active.
- The ledger's `clamp(1.3rem, 0.9vw + 1.3vh, 2.15rem)` uses **vh in the middle term** specifically so eleven rows and their type shrink together on a short laptop *"instead of the stack outgrowing the viewport."*
- `xl:` (1280px) is where the six-item nav row appears; 1024–1279 uses the MENU sheet.

### 12.4 Tablet (768–1023px)

- The horizontal act becomes a **vertical stack of content-height panels** (not four forced full screens — the source records that as a rejected earlier version: *"four forced full screens turned the act into a third of the mobile page for the same information"*).
- The ledger becomes a plain scrolling list with the width axis pinned.
- The contact split stacks; the pointer plate is removed entirely.
- Footer columns go three-across at `md`; the nav CTA appears at `md`.
- `/lab` and `/capabilities` show the restricted screen.

### 12.5 Mobile (<768px)

- Everything is single-column (`col-span-12`).
- Type drops to the clamp floors; the hero is `21cqw` of a full-width column.
- Section padding drops to `52px` (`ts-act` floor).
- `ts-rules` shows 3–4 columns instead of 6.
- The nav is logo + MENU only; the menu is a full-bleed black sheet with display-type rows.
- The footer wordmark **breaks to two lines** below 640px.
- The cursor, magnets, proximity type and pointer plates do not exist.
- `.ts-read-row` switches from a baseline row to `flex-direction: column`.

### 12.6 Device gating — beyond breakpoints

`frontend/src/components/capabilities/useCapabilityDevice.js` — reused by both `/lab` and `/capabilities`. Three independent questions, **all** of which must pass:

1. `(pointer: fine)` **and** `(hover: hover)` — *"the load-bearing one. Every phone and every touch-only tablet fails it in both orientations, because it describes the input device rather than the screen."*
2. `(min-width: 1024px)` — *"the project's existing desktop threshold… drawing it somewhere else on this page would be a second, contradictory definition of 'desktop'."*
3. `Math.min(innerWidth, innerHeight) >= 620` — the landscape-phone backstop. *"Rotating a phone changes its width but not its height, and 430px of height cannot hold a pinned cinematic stage."*

Returns `null` until the first check runs, *"so the caller can render nothing rather than flashing the wrong branch — importantly, nothing means the heavy chunk is not requested either."* Re-evaluates on `matchMedia` change **and** on `resize` (the short-edge rule is not expressible as a media query).

⚠️ **Do not use a width-only test, and do not use user agents.** *"Width alone puts a phone in landscape (932 × 430 on a Pro Max) within a hair of a small laptop."*

### 12.7 The anti-shrink principle

The site never shrinks a desktop layout. Each breakpoint is composed:

- The horizontal act is **re-authored** as vertical scenes with a different type scale (`19vw` vs `11vw`) and a differently-placed ghost numeral (`-right-6 top-8 text-[38vw]` vs `-bottom-[8vh] right-[3vw] text-[46vh]`).
- The ledger changes **mechanic**, not just size — the width axis is replaced by ink and a red numeral.
- The footer wordmark changes **line count**.
- The mobile menu is a different composition from the desktop nav, not a stacked version of it.
- `/services` copy on `WebSystem` states the philosophy: *"Composed for desktop, laptop, tablet and phone as separate design problems, not one layout squeezed through breakpoints."*

### 12.8 Layout-safety rules that survive resizing

- `svh` not `vh`.
- `body { overflow-x: clip }` not `hidden` (keeps `position: sticky` working).
- `min-h-0` on flex children that must shrink.
- `items-center` on flex parents holding an intrinsic-ratio image.
- `invalidateOnRefresh: true` on any ScrollTrigger whose `end` is a function.
- `scroll-padding-top: 6rem` on `html` for WCAG 2.2 "Focus Not Obscured".
- `scroll-mt-28` on anchor-targeted sections.

---

## 13. COMPONENT ARCHITECTURE

### 13.1 Directory map

```
frontend/src/
├── App.jsx                     two layout routes — MarketingShell / AdminShell
├── main.jsx                    adds .ts-motion, mounts React
├── index.css                   THE DESIGN SYSTEM (1992 lines)
├── components/
│   ├── layout/                 Nav · Footer · Cursor · SmoothScroll · RouteTransition · PageOpener
│   ├── ui/                     MaskText · Reveal · ScrubWords · Marquee · ActionLink · SystemLabel
│   │                           + shadcn: button · accordion · dialog
│   ├── motion/                 React-Bits ports: ProximityType · Magnet · CurvedMarquee · SignalField
│   │                           ScrambleText · CutoutHeading · FieldLines · Aurora · Globe · WarpText · ShinyText
│   ├── home/                   Hero · Manifesto · HorizontalServices · WebSystem · AiSystem
│   │                           DigitalGrowth · GlobalPositioning · Process · WhyStrip · FinalCta
│   ├── about/                  Disciplines · MissionVision · Principles
│   ├── services/               ServiceGroup
│   ├── why-us/                 Reasons (the ledger) · NoList
│   ├── contact/                HoverImageReveal · ContactForm · FormField · BookCallCta · ContactCTA
│   ├── capabilities/           the desktop-only experience (13 files + capabilitiesStage.js store)
│   ├── lab/                    the scroll-scrubbed film (10 files)
│   ├── booking/                BookCallModal · bookingTime · countries
│   ├── ai-chat/                AIChatLauncher (+ lazy panel) · LivingBlob · useAIChat
│   └── dashboard/              admin — deliberately no shared motion
├── hooks/                      usePageMeta · useWorldClock
├── lib/                        gsap.js · utils.js (cn) · api.js · structuredData.js · analytics.js · formatDate.js
├── pages/                      Home · About · Services · WhyUs · Contact · Lab · Capabilities · NotFound
│                               + dashboard/*
└── styles/                     ai-chat.css · booking.css · capabilities.css · dashboard.css
```

### 13.2 Hierarchy

```
<BrowserRouter>
 └ <MarketingShell>                       ← layout route
    └ <SmoothScroll>                      Lenis + GSAP ticker, provides useSmoothScroll()
       ├ <Cursor />                       z-120
       ├ <RouteTransition />              z-110
       ├ .ts-grain-layer                  z-60
       ├ <Nav />                          z-80
       ├ <main id="main"><Suspense><ScrollSync /><Outlet /></Suspense></main>
       ├ <Footer />
       └ <AIChatLauncher />               z-75
 └ <AdminShell>                           ← NONE of the above. AuthProvider lives here only.
```

`AGENTS.md`: **"two layout routes — never merge."** The reasoning is stated in `App.jsx`: the dashboard must be instant, must not advertise itself in site chrome, and needs native scroll for keyboard paging. Also: `<AuthProvider>` inside `AdminShell` only, so *"public routes must make zero API calls."*

### 13.3 Styling architecture

Four layers, in order of preference:

1. **`@theme` tokens** in `index.css` → generate Tailwind utilities (`bg-signal`, `text-ash`, `border-hair`).
2. **`@utility` classes** — `ts-display*`, `ts-label`, `ts-body`, `ts-shell`, `ts-grid`, `ts-act*`, `ts-rules`, `ts-mask`, `ts-grain-layer`.
3. **Tailwind utilities in JSX** for layout and one-off spacing.
4. **Plain CSS blocks** in `index.css` (or a route stylesheet) for anything stateful, pointer-driven, or too intricate for utilities — the ledger, the contact split, `/lab`, the seam.

Route-specific CSS is imported **from its own component**, not from `index.css`, so it lands in that chunk:
```js
// CapabilitiesExperience.jsx
import "@/styles/capabilities.css";
```
*"That is what keeps it inside the dynamically imported chunk so a phone never downloads it."*

⚠️ `PROJECT_MEMORY.md`: *"Before adding any new top-level class, diff it against `index.css` — `.ts-field` collided with the contact form and re-laid every input into 13 columns."* Prefix everything `ts-` **and** grep before you commit.

### 13.4 Shared utilities and hooks

| Export | File | Purpose |
|---|---|---|
| `cn()` | `lib/utils.js` | `twMerge(clsx(inputs))` |
| `gsap`, `ScrollTrigger`, `useGSAP`, `EASE`, `prefersReducedMotion`, `toWords` | `lib/gsap.js` | single registration point |
| `useSmoothScroll()` | `layout/SmoothScroll.jsx` | `{ lenis, stop, start, scrollTo }` |
| `useWorldClock()` | `hooks/useWorldClock.js` | six zones, live, ticks **once a minute** aligned to the minute boundary |
| `usePageMeta()` | `hooks/usePageMeta.js` | title, description, canonical, OG/Twitter, JSON-LD |
| `useCapabilityDevice()` | `capabilities/useCapabilityDevice.js` | the three-part device gate |
| `useNearViewport()` | `layout/Footer.jsx` | IntersectionObserver gate for heavy assets |

### 13.5 The React Bits precedent

`PROJECT_MEMORY.md`:
> **"React Bits components are rewritten, never shipped verbatim"** — each arrived with a Google-Fonts import, a private RAF loop, per-event `getBoundingClientRect`, or colliding global class names.

The four things to strip from any imported motion component:
1. Any `@import url(fonts.googleapis.com/…)`.
2. Its own `requestAnimationFrame` loop → move onto `gsap.ticker`. *"Two RAF loops is exactly what causes the pin jitter this site was built to avoid."*
3. `setState` per pointer event and per-event layout reads → `gsap.quickTo` + a cached, invalidated box.
4. Global class names (`.flex`, `.stroke`, `.ts-field`) and hard-coded tags (`<h1>` → an `as` prop).

Then add: a `prefersReducedMotion()` early return, a coarse-pointer guard, and an off-screen park.

⚠️ One more, from `ProximityType.jsx`, worth heeding: **do not gate on `(pointer: fine)` for a hover effect.** *"That query describes the primary pointer, and a Windows laptop with a touchscreen reports it as `false` even while a mouse is plugged in… Input capability is now inferred from real events: the field wakes on the first `pointermove` that is not a touch."*

---

## 14. TECH STACK

From `frontend/package.json`, exactly:

**Runtime**
```
react 19.2.8 · react-dom 19.2.8 · react-router-dom 7.18.2
tailwindcss 4.3.3 · @tailwindcss/vite 4.3.3 · tw-animate-css 1.4.0
radix-ui 1.6.7 · class-variance-authority 0.7.1 · clsx 2.1.1 · tailwind-merge 3.6.0
gsap 3.15.0 · @gsap/react 2.1.2 · lenis 1.3.26 · ogl 1.0.11 · scrolly-video 0.0.24
lucide-react 1.33.0
@fontsource-variable/archivo 5.3.0 · @fontsource-variable/jetbrains-mono 5.3.0
```

**Build / dev**
```
vite 8.2.0 · @vitejs/plugin-react 6.0.4
oxlint 1.75.0 (npm run lint) · shadcn 4.18.0
sharp 0.35.3 · ffmpeg-static 5.3.0 · ffprobe-static 3.1.0   ← the npm binaries ARE the ffmpeg
```

**Notes that matter for the new build:**

- **JavaScript, not TypeScript.** `.jsx` throughout. `jsconfig.json` provides `@/*` → `./src/*`.
- **Tailwind v4, CSS-first.** There is **no `tailwind.config.js`**. The theme is `@theme` in `index.css`; new utilities are `@utility`; variants are `@custom-variant`.
- `components.json` sets `style: "radix-nova"`, `baseColor: "neutral"`, `cssVariables: true`, `iconLibrary: "lucide"`, `tsx: false`, and registers `@react-bits` → `https://reactbits.dev/r/{name}.json`.
- Vite alias in `vite.config.js` includes a Windows drive-letter fix:
  ```js
  "@": path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "./src")
  ```
- Icons: **`lucide-react`, and in practice almost exclusively `ArrowUpRight`.** The site's other "icons" are `1px` rules and `size-1.5` squares.
- Routing: `react-router-dom` 7, `BrowserRouter`, layout routes, `lazy()` + `Suspense` per route.
- Backend (context only): ESM Express 5, mongoose 9, nodemailer 9, jsonwebtoken, helmet, express-rate-limit. Dev is proxied `/api → 127.0.0.1:5000` in **both** `server` and `preview` so the auth cookie can stay `SameSite=Lax`.

---

## 15. PAGE TRANSITIONS & SCROLL EXPERIENCE

### 15.1 First load

1. `main.jsx` adds `.ts-motion` before the first render, arming every CSS resting state.
2. `MarketingShell` mounts: Lenis starts (unless reduced motion), the GSAP ticker takes over the RAF loop, the grain layer and cursor mount.
3. **No route wipe on first paint** — the hero's own timeline is the entrance.
4. The hero timeline runs: rules → metadata → words → red signal → body → strip. ~2.5s end to end, but the statement is legible within ~1s.
5. `warmRoutes()` fetches the other route chunks on `requestIdleCallback`.

### 15.2 Scrolling

Lenis at `duration: 1.05` with a custom exponential easing — described in the source as *"premium, not sluggish."* On touch, `syncTouch: false` and the OS keeps its native momentum: *"do not fight the OS."*

The single frame loop is: **GSAP ticker → `lenis.raf()` → `lenis.on("scroll") → ScrollTrigger.update()`**. Nothing else may start a RAF loop.

As you scroll: sections reveal via `MaskText` / `Reveal` at `top 88%`; statement type inks in via `ScrubWords`; the header condenses at 80px and inverts colour by hit-testing the ground beneath it; the horizontal act pins and travels sideways; progress rails fill; markers light.

### 15.3 Between sections

Handoffs are explicit — a curved marquee, a full-bleed marquee rule, a red hairline at the footer seam, or letterbox rails. There is no fade between sections; the cut is hard, which is the Swiss-modernist point.

### 15.4 Between routes

1. Click → `pathname` changes.
2. `RouteTransition` fires: a red rule draws left→right (0.34s), a black panel sweeps up from the bottom (0.42s).
3. Under cover: `lenis.scrollTo(0, { immediate: true })`, `window.scrollTo(0,0)`, `ScrollTrigger.refresh()`.
4. The panel clears off the **top** (0.5s), the rule retracts right (0.3s). ~0.9s total.
5. `ScrollSync` (mounted *inside* the route `<Suspense>` boundary) refreshes ScrollTrigger on `requestAnimationFrame`, again at 320ms, and again on `document.fonts.ready` — *"Without this, pinned sections measure against the previous page."*

The `<Suspense fallback={null}>` is intentional: the wipe already covers the viewport.

### 15.5 Route-level loading strategy

- `Home` is imported **eagerly** — *"its hero owns the first paint; putting it behind a dynamic import would add a request round-trip in front of the LCP element."*
- All other routes are `lazy()`.
- `/lab` and `/capabilities` are lazy **twice**: the route chunk contains only the device gate and the restricted screen; the experience is a second dynamic import inside it.
- The AI panel, the booking modal, `Aurora` and `WarpText` are all lazy + viewport-gated.

### 15.6 Reduced motion

Lenis is never created; native scroll. No route wipe (scroll just resets). No entrance timelines. `/lab` becomes a static page with a poster still and the beats as a reading-order list. Everything resolves to its final, readable state — *"Nothing is left hidden."*

---

## 16. DESIGN RULES — DO / DON'T

### DO

- **DO** put the whole design system in one `index.css` with `@theme` + `@utility`, and read it before writing any component.
- **DO** use Archivo Variable's `wdth` axis as the primary expressive device, driven by `font-stretch`.
- **DO** self-host fonts via `@fontsource-variable`.
- **DO** keep radius at `0` and shadows at none. Structure comes from hairlines and hard rules.
- **DO** give every section a `data-zone="paper" | "ink"` and let borders and primitives inherit from it.
- **DO** own section padding in two or three utilities and nowhere else.
- **DO** open sections with a mono `.ts-label` eyebrow above a two-line, art-directed headline.
- **DO** put the supporting paragraph in an offset column beside the headline, not under it.
- **DO** use `clamp()` with `vw` (or `cqw`) for every headline size.
- **DO** reveal type by masking (`overflow: hidden` + `yPercent 108 → 0`), not by fading.
- **DO** use `cubic-bezier(0.16, 1, 0.3, 1)` at 500ms for every hover transform.
- **DO** draw underlines `origin-right scale-x-0 → origin-left scale-x-100`.
- **DO** wipe CTA fills up from the bottom edge and translate the arrow up-right.
- **DO** use `ArrowUpRight` and nothing else.
- **DO** import GSAP from one `lib/gsap.js` and clean up with `useGSAP({ scope })`.
- **DO** drive Lenis from `gsap.ticker` with `autoRaf: false`.
- **DO** use `position: sticky` for pinning; spend a real ScrollTrigger pin at most once.
- **DO** write to `style.transform` / `textContent` imperatively inside `onUpdate`.
- **DO** derive an active index from a single scrubbed progress value rather than from per-item triggers.
- **DO** cache `getBoundingClientRect()` and invalidate on scroll/resize/refresh.
- **DO** gate heavy assets on `IntersectionObserver` *and* `lazy()`.
- **DO** use `svh`, `tabular-nums`, explicit `width`/`height` on images, and AVIF + WebP.
- **DO** treat reduced motion as an alternate layout that loses no content.
- **DO** arm hidden resting states behind a JS-confirmed `.ts-motion` class.
- **DO** state real numbers only; mark unknowns `— pending —`.

### DON'T

- **DON'T** add a border radius, a shadow, a decorative gradient, or a glass/blur panel. (The header's `backdrop-blur-md` when condensed is the single exception, and it is functional.)
- **DON'T** ship a card. Use hairline-separated full-width rows.
- **DON'T** use `font-variation-settings` for the width axis — use `font-stretch`. (Only a per-glyph pointer loop may break this.)
- **DON'T** animate `font-stretch` on wrapping type. `white-space: nowrap` or don't animate it.
- **DON'T** load fonts from a CDN.
- **DON'T** put a Tailwind `scale-*` / `translate-*` utility on a GSAP-transformed element.
- **DON'T** tween `yPercent`/`scaleX` *to* a value whose start is a CSS percentage transform — use `fromTo`.
- **DON'T** tween a `clip-path` string.
- **DON'T** animate a portal/overlay with GSAP — use CSS keyframes on `data-state`.
- **DON'T** call `setState` from a pointer or scroll handler.
- **DON'T** start a second `requestAnimationFrame` loop anywhere.
- **DON'T** predict which section a fixed overlay is over — hit-test with `elementsFromPoint`.
- **DON'T** gate a hover effect on `(pointer: fine)` alone; infer from real events.
- **DON'T** device-gate on width alone or on user agent.
- **DON'T** put `overflow` on an ancestor of a `position: sticky` element.
- **DON'T** use `overflow-x: hidden` on `body` — use `clip`.
- **DON'T** use `vh`; use `svh`.
- **DON'T** hard-code `py-*` on a section.
- **DON'T** ship a React Bits (or any) motion component verbatim.
- **DON'T** add a top-level class without grepping the stylesheet first.
- **DON'T** spend red more than once per viewport, and don't have more than one full-bleed red moment on a page.
- **DON'T** invent testimonials, client logos, metrics, founding years, phone numbers, or social handles — including in JSON-LD.
- **DON'T** put fake instrumentation on screen (node IDs, "live" dots, decorative coordinates).
- **DON'T** put two pointer-attracting elements next to each other.
- **DON'T** repeat a page's own CTA in the footer beneath it.
- **DON'T** shrink a desktop layout for mobile — recompose it.

---

## 17. REUSABLE IMPLEMENTATION PATTERNS

### 17.1 The token + zone foundation

```css
@theme {
  --color-paper: #ffffff;  --color-ink: #000000;
  --color-signal: #ff2d16; --color-signal-ink: #d91a05;
  --color-ash: #6b6b6b;    --color-ash-dim: #9a9a9a;
  --color-hair: #e4e4e4;   --color-smoke: #f4f4f4;
  --font-display: "Archivo Variable", "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-mono: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
  --radius: 0px;
}

:root, [data-zone="paper"] { --bg:#fff; --fg:#000; --fg-muted:#6b6b6b; --line:#e4e4e4;
                             --line-strong:#000; --subtle:#f4f4f4; --red-text:#d91a05; }
[data-zone="ink"]          { --bg:#000; --fg:#fff; --fg-muted:#8f8f8f; --line:rgba(255,255,255,.16);
                             --line-strong:#fff; --subtle:#111; --red-text:#ff2d16; color-scheme: dark; }

@layer base { *, *::before, *::after { border-color: var(--line); } }
```

### 17.2 The motion-primitive gate

```js
// main.jsx — before createRoot
document.documentElement.classList.add("ts-motion");
```
```css
.ts-motion [data-anim="mask"] .ts-mask > * { display:inline-block; transform: translate3d(0,108%,0); }
.ts-motion [data-anim="fade"]   { opacity: 0; }
.ts-motion [data-anim="draw"]   { transform: scaleX(0); transform-origin: left center; }
.ts-motion [data-anim="draw-y"] { transform: scaleY(0); transform-origin: top center; }
```

### 17.3 Masked word reveal (the core type animation)

```jsx
gsap.fromTo(
  root.current.querySelectorAll(".ts-mask > span"),
  { yPercent: 108, y: 0 },                       // BOTH halves — see §8.4 rule 1
  { yPercent: 0, y: 0, duration: 1.05, ease: "expo.out", stagger: 0.055,
    scrollTrigger: { trigger: root.current, start: "top 88%",
                     toggleActions: "play none none none" } },
);
```
Markup: `<span className="ts-mask inline-block"><span className="inline-block will-change-transform">{word}</span></span>`, with `lines` supplied as an array so breaks stay art-directed.

### 17.4 Zone-aware fixed header

```js
const sampleZone = () => {
  const bar = header.current; if (!bar) return;
  const stack = document.elementsFromPoint(window.innerWidth / 2, 28);
  const el = stack.find((n) => n !== bar && !bar.contains(n));
  const zone = el?.closest("[data-zone]")?.dataset.zone ?? "paper";
  if (zone !== lastZone) { lastZone = zone; setOnInk(zone === "ink"); }
};
ScrollTrigger.addEventListener("refresh", sampleZone);
const sampler = ScrollTrigger.create({ start: 0, end: 99999, onUpdate: sampleZone });
let frame = 0;
gsap.ticker.add(() => { if (++frame % 4 === 0) sampleZone(); });
```
Header markup: `data-zone={onInk ? "ink" : "paper"}` + `className={onInk ? "text-white" : "text-black"}`.
Any fixed overlay that must be *found* by this hit-test needs `pointer-events: auto`.

### 17.5 Animating a variable-font axis with `@property`

```css
@property --wdth { syntax: "<percentage>"; inherits: false; initial-value: 84%; }
@property --ink  { syntax: "<color>";      inherits: false; initial-value: rgba(0,0,0,.72); }

.title {
  font-stretch: var(--wdth);
  color: var(--ink);
  white-space: nowrap;                        /* mandatory when animating width */
  transition: --wdth 520ms var(--ease-out-expo), --ink 380ms var(--ease-out-expo);
}
.row.is-live .title { --wdth: 116%; --ink: #000; }
```
*"To the engine an unregistered custom property is an untyped token list, which swaps instantly; giving these two a syntax makes the ink colour and the width axis interpolable, which is what lets every row state be a plain CSS transition instead of a per-frame JS tween."*

### 17.6 Clip-path state machine (the cursor)

```js
const shape = { w: 30, h: 30, r: 0, o: 0 };
const paint = () => {
  ring.style.clipPath = clipFor(shape.w + shape.o * 2, shape.h + shape.o * 2, shape.r + shape.o);
  face.style.clipPath = clipFor(shape.w, shape.h, shape.r);
};
const morph = (w, h, r, o, duration, ease) =>
  gsap.to(shape, { w, h, r, o, duration, ease, overwrite: true, onUpdate: paint });
```
Tween the numbers, compose the string. Never tween the string.

### 17.7 Pointer follow without re-renders

```js
const xTo = gsap.quickTo(el, "x", { duration: 0.55, ease: "expo.out" });
const yTo = gsap.quickTo(el, "y", { duration: 0.55, ease: "expo.out" });

let box = null;
const measure = () => { box = wrap.getBoundingClientRect(); };
let queued = false;
const invalidate = () => { if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; measure(); }); };

window.addEventListener("pointermove", onMove, { passive: true });
window.addEventListener("scroll", invalidate, { passive: true });
window.addEventListener("resize", invalidate);
ScrollTrigger.addEventListener("refresh", measure);
```

### 17.8 Scroll → class → CSS

```js
ScrollTrigger.create({ trigger: step, start: "top 62%", end: "bottom 20%",
  toggleClass: { targets: step, className: "is-live" } });
```
```css
.step [data-dot] { background: var(--fg); transition: background-color .5s var(--ease-out-expo),
                                                      transform .5s var(--ease-out-expo); }
.step.is-live [data-dot] { background: var(--color-signal); transform: scale(1.75); }
```

### 17.9 One trigger, derived index (no boundary race)

```js
ScrollTrigger.create({
  trigger: list, start: "top 55%", end: "bottom 55%", invalidateOnRefresh: true,
  onUpdate: (self) => {
    rail.current.style.transform = `scaleY(${self.progress})`;
    const i = Math.min(N - 1, Math.max(0, Math.floor(self.progress * N)));
    if (i === active) return;
    active = i;
    count.current.textContent = ITEMS[i].id;
    rows.forEach((row, j) => row.classList.toggle("is-live", j === i));
    gsap.to(reel.current, { yPercent: -(100 / N) * i, duration: 0.7, ease: "expo.out", overwrite: true });
  },
});
```
Note `-(100 / N) * i`, not `-100 * i` — `yPercent` is a share of the **reel's** height.

### 17.10 Horizontal pinned act

```js
const mm = gsap.matchMedia();
mm.add({ desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)" }, (ctx) => {
  if (!ctx.conditions.desktop) return;
  const travel = () => track.current.scrollWidth - window.innerWidth;
  const tween = gsap.to(track.current, {
    x: () => -travel(), ease: "none",
    scrollTrigger: {
      trigger: root.current, pin: true, pinSpacing: true, scrub: 0.8,
      start: "top top", end: () => "+=" + Math.round(travel() * 0.62),
      invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: -1,
      onUpdate: (self) => { progress.current.style.transform = `scaleX(${self.progress})`; },
    },
  });
  // per-panel parallax inside the track:
  gsap.fromTo(numeral, { xPercent: 12 }, { xPercent: -12, ease: "none",
    scrollTrigger: { trigger: panel, containerAnimation: tween,
                     start: "left right", end: "right left", scrub: true } });
});
return () => mm.revert();
```

### 17.11 Sticky stage instead of a pin

```css
.section { position: relative; height: calc(100svh + var(--travel)); }  /* no overflow here */
.stage   { position: sticky; top: 0; height: 100svh; overflow: hidden; isolation: isolate; }
```
ScrollTrigger then only *reports* progress (no `pin`), which removes pin-spacer remeasurement entirely.

### 17.12 CSS-keyframe overlay with a staggered interior

```css
.sheet[data-state="open"]   { animation: sheet-in  520ms var(--ease-out-expo) both; }
.sheet[data-state="closed"] { animation: sheet-out 400ms var(--ease-in-out-quint) both; }
.sheet[data-state="open"] [data-row] > * {
  animation: row-in 640ms var(--ease-out-expo) both;
  animation-delay: calc(165ms + var(--i, 0) * 52ms);
}
@media (prefers-reduced-motion: reduce) {
  .sheet[data-state="open"] [data-row] > * { animation-delay: 0ms !important; }
}
```
With `style={{ "--i": i }}` per row.

### 17.13 Lazy + viewport-gated heavy asset

```jsx
const Heavy = lazy(() => import("./Heavy"));

function useNearViewport(ref, rootMargin = "100% 0px") {
  const [near, setNear] = useState(() => typeof IntersectionObserver !== "function");
  useEffect(() => {
    const el = ref.current; if (!el || near) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } },
                                        { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near, rootMargin]);
  return near;
}
```

### 17.14 The CTA slab

```jsx
<span className="group/cta relative flex w-full items-center justify-between gap-6 overflow-hidden
                 border border-[var(--fg)] bg-[var(--fg)] px-7 py-5 text-[var(--bg)] sm:px-9 sm:py-6">
  <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-signal
        transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:scale-y-100" />
  <span className="ts-label relative z-10 text-[0.7rem] transition-colors duration-300
        group-hover/cta:text-white">{children}</span>
  <ArrowUpRight strokeWidth={1.75} className="relative z-10 size-4 shrink-0 transition-all duration-500
        ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1
        group-hover/cta:text-white" />
</span>
```

### 17.15 The section header block

```jsx
<div className="ts-grid items-end border-b border-hair pb-12">
  <div className="col-span-12 lg:col-span-7">
    <SystemLabel className="mb-8">CAPABILITY / WEB</SystemLabel>
    <MaskText as="h2" lines={["Web", "systems."]}
              className="ts-display-tight text-[clamp(2.6rem,8.6vw,7rem)] text-ink" />
  </div>
  <div className="col-span-12 mt-8 lg:col-span-5 lg:mt-0 lg:pl-8">
    <p className="ts-body max-w-sm text-[0.98rem] text-ash">…</p>
  </div>
</div>
```

### 17.16 CSS marquee (no JS frame cost)

```css
@keyframes ts-marquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
.ts-marquee-track { display: flex; width: max-content;
  animation: ts-marquee var(--marquee-duration, 40s) linear infinite; will-change: transform; }
.ts-marquee-track[data-direction="reverse"] { animation-direction: reverse; }
@media (prefers-reduced-motion: reduce) { .ts-marquee-track { animation: none !important; transform: none !important; } }
```
Items are duplicated once (`[...items, ...items]`) and translated `-50%` so the seam is invisible.

### 17.17 Contiguous hover rows (no dead gaps)

```css
.list { display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
.row  { padding-block: clamp(.45rem, .85vw, .92rem); cursor: default; }
```
*"No gap. The air between the words is padding INSIDE each row, so the rows are contiguous and a pointer sliding down the list is never over nothing."* Pair with the deferred-clear pattern in §9.6.

### 17.18 Reduced-motion as an alternate layout

Don't just kill animations — restate the section:
```css
@media (prefers-reduced-motion: reduce) {
  .stage-section { height: auto; }
  .stage         { position: static; height: auto; overflow: visible; }
  .beats         { position: static; display: flex; flex-direction: column;
                   gap: clamp(2rem, 5vw, 3.5rem); visibility: visible; }
  .beat-line     { clip-path: none !important; transform: none !important;
                   white-space: normal; font-size: clamp(2rem, 6vw, 3.5rem); }
  .dimmed-row    { font-stretch: 100% !important; color: var(--color-paper); }
}
```

---

## 18. TECHNOSPIRIT.IN — HANDOFF INSTRUCTIONS

**To the Claude session building `technospirit.in`: read this section last, and treat it as the brief.**

### 18.1 The relationship between the two sites

`technospirit.in` and `technospirit.tech` are **siblings, not copies**. Someone who has seen one should recognise the other instantly — and should not be able to say "it's the same site with different words."

**What must be shared (the brand DNA):**

| Layer | Requirement |
|---|---|
| **Palette** | The exact tokens in §3.1. Paper/ink/signal, the `signal` vs `signal-ink` split, the ash and hair greys. |
| **Type** | Archivo Variable (`wdth` build) + JetBrains Mono, self-hosted. The four utilities in §2.3, verbatim. |
| **The width axis** | Used expressively somewhere. It is the single most identifying property of the brand. |
| **Zero-radius / no-shadow / hairline discipline** | Absolute. No exceptions. |
| **Zone system** | `data-zone="paper"\|"ink"` with the token contract in §17.1. |
| **Layout grammar** | `ts-shell` (108rem, clamp padding), a strict 12-column `ts-grid`, and 2–3 utilities owning all section padding. |
| **Motion quality** | `cubic-bezier(0.16,1,0.3,1)` at 500ms for hovers; masked type reveals; scroll-driven, not decorative; the five load-bearing rules in §8.4. |
| **Navigation philosophy** | Transparent fixed header that condenses and inverts by hit-testing the ground; a word-labelled MENU, not a hamburger; a full-bleed display-type sheet on small screens. |
| **CTA anatomy** | Rectangular slab, red panel wiping up from the baseline, `ArrowUpRight` moving up-right, mono label. |
| **Responsive philosophy** | Each breakpoint composed as its own design problem. Never a shrunk desktop. |
| **Honesty** | No invented proof, in copy or in structured data. |
| **Accessibility floor** | Reduced motion as an alternate layout; a red 2px focus ring, never removed; skip link; `svh`; `tabular-nums`. |

**What must be different (or the two sites read as one template):**

- **Services and content.** Whatever `.in` sells, in its own words.
- **Page structure and routes.** `.tech` runs `/ /about /services /why-us /contact /lab /capabilities`. `.in` should not mirror that list.
- **Section concepts.** Do **not** rebuild the horizontal act, the ledger, the seam, the hands sequence, or the pointer-plate contact page. Those are `.tech`'s signature moments. `.in` needs its **own** signature moments built from the same materials.
- **Imagery.** New art direction, new subjects.
- **Storytelling.** `.tech` opens on `Build. Automate. Scale.` and closes on `Start something that scales.` `.in` needs its own arc.
- **The one-off mechanics.** `.tech` spends its budget on: an animated width axis in a ledger, a clip-path cursor capsule, a scrubbed film, and a pointer-lens on glyphs. Invent one or two equivalents; don't reuse these.

The test to apply: *if `.in`'s hero were pasted onto `.tech`, would anyone notice it was borrowed?* If yes, the composition is too close.

### 18.2 Suggested build order

1. **Port the foundation first, unchanged.** `index.css` §17.1 tokens + §2.3 type utilities + §4 layout utilities + the motion primitives (§17.2) + the reduced-motion block. Get `lib/gsap.js`, `lib/utils.js`, `SmoothScroll`, and the grain layer in place. Do not write a page until this compiles.
2. **Port the shared primitives.** `MaskText`, `Reveal`, `ScrubWords`, `Marquee`, `SystemLabel`, `ActionLink`/`SignalLink`, `Magnet`. These are generic and carry no `.tech`-specific composition.
3. **Build the chrome.** `Nav` (with the `elementsFromPoint` zone detection and `revertOnUpdate`), `Footer`, `RouteTransition`, `Cursor`. Re-skin the nav's contents for `.in`; keep its mechanics.
4. **Design `.in`'s own sections.** Use §10's composition rules, not §10's section list.
5. **Choose one or two signature mechanics** unique to `.in`, and build them properly — each one earning a full-viewport section.
6. **Do the responsive pass as design work**, not as a squeeze.
7. **Do the reduced-motion pass** as a real alternate layout.

### 18.3 Non-negotiables — carry these across verbatim

1. Import GSAP only from `lib/gsap.js`; clean up with `useGSAP({ scope })`; `revertOnUpdate: true` on any component that never unmounts.
2. Lenis with `autoRaf: false`, driven by `gsap.ticker`; never instantiated under reduced motion.
3. The five motion rules (§8.4).
4. `position: sticky` for pinning; at most one real ScrollTrigger pin.
5. Never `setState` on a pointer or scroll frame.
6. Fonts self-hosted; never a Google Fonts link.
7. `font-stretch`, not `font-variation-settings`.
8. Section padding owned by 2–3 utilities.
9. `data-zone` over hand-colouring.
10. Prefix every new class `ts-` and grep the stylesheet before adding it.
11. No fabricated proof anywhere, including JSON-LD.
12. Red stays scarce; at most one full-bleed red moment per page.

### 18.4 Verification

Two things worth knowing before testing:

- **Browser testing on this machine is Playwright**, not Chrome MCP (per `AGENTS.md`). Invoke it by absolute path.
- Several Playwright checks fail on this project **for reasons that are not bugs** — sections whose content is intentionally invisible until a scroll trigger fires, device-gated routes, and clamp-driven sizes that differ from naive expectations. Check the behaviour manually before treating a failed assertion as a defect.

Measure animations with `element.getAnimations()` rather than by eye, and re-run `ScrollTrigger.refresh()` after fonts load.

### 18.5 The one-line summary

> **Same materials, same discipline, same craft standard — different building.**
> White is space, black is structure, red is signal. Zero radius, hard rules, typography as the interface. Motion is scroll-driven and expo-eased at 500ms. Nothing is claimed that cannot be shown.

---

## APPENDIX — QUICK-REFERENCE FILE INDEX

| Concern | File |
|---|---|
| **The entire design system** | `frontend/src/index.css` |
| Locked design rules | `AGENTS.md`, `frontend/PROJECT_MEMORY.md` |
| GSAP registration + easing + reduced motion | `frontend/src/lib/gsap.js` |
| Lenis ↔ ScrollTrigger bridge | `frontend/src/components/layout/SmoothScroll.jsx` |
| App shells, lazy routes, `ScrollSync`, `warmRoutes` | `frontend/src/App.jsx` |
| `.ts-motion` gate | `frontend/src/main.jsx` |
| Fixed header, zone hit-test, mobile sheet | `frontend/src/components/layout/Nav.jsx` |
| Footer, aurora gating, wordmark | `frontend/src/components/layout/Footer.jsx` |
| Route wipe | `frontend/src/components/layout/RouteTransition.jsx` |
| Custom cursor / clip-path state machine | `frontend/src/components/layout/Cursor.jsx` |
| Shared page opener grammar | `frontend/src/components/layout/PageOpener.jsx` |
| Masked type reveal | `frontend/src/components/ui/MaskText.jsx` |
| Fade-up reveal | `frontend/src/components/ui/Reveal.jsx` |
| Scrubbed word ink-in | `frontend/src/components/ui/ScrubWords.jsx` |
| CTA + text link | `frontend/src/components/ui/ActionLink.jsx` |
| Mono section label | `frontend/src/components/ui/SystemLabel.jsx` |
| CSS marquee | `frontend/src/components/ui/Marquee.jsx` |
| Hero timeline, container-query type, capsule triggers | `frontend/src/components/home/Hero.jsx` |
| Horizontal pinned act, `matchMedia`, `containerAnimation` | `frontend/src/components/home/HorizontalServices.jsx` |
| Scroll-lit timeline | `frontend/src/components/home/Process.jsx` |
| The one red frame | `frontend/src/components/home/FinalCta.jsx` |
| Sticky reel, single-trigger index | `frontend/src/components/about/Principles.jsx` |
| Row-inversion switchboard | `frontend/src/components/about/Disciplines.jsx` |
| Sticky group identity | `frontend/src/components/services/ServiceGroup.jsx` |
| The width-axis ledger | `frontend/src/components/why-us/Reasons.jsx` + `index.css` ledger block |
| Pointer-tracked image plate | `frontend/src/components/contact/HoverImageReveal.jsx` |
| Magnetic hover | `frontend/src/components/motion/Magnet.jsx` |
| Variable-axis proximity type | `frontend/src/components/motion/ProximityType.jsx` |
| Scramble decode | `frontend/src/components/motion/ScrambleText.jsx` |
| Device gate | `frontend/src/components/capabilities/useCapabilityDevice.js` |
| Route-scoped stylesheet pattern | `frontend/src/styles/capabilities.css` |
| Live world clock | `frontend/src/hooks/useWorldClock.js` |
| Head/meta/JSON-LD | `frontend/src/hooks/usePageMeta.js`, `frontend/src/lib/structuredData.js` |
| Image/video optimisation scripts | `frontend/scripts/optimize-capabilities-{images,video}.mjs` |
| Build config, alias, dev proxy | `frontend/vite.config.js` |
| shadcn config | `frontend/components.json` |

---

*Generated from a read-only inspection of the `technospirit.tech` repository. No source file was modified.*
