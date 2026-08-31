# TechnoSpirit — AGENTS.md

> Compressed operational context for OpenCode sessions. Detailed history lives in `frontend/PROJECT_MEMORY.md` (treat as source of truth; keep there, do not delete). Cross-session history is in Claude-Mem (project `technospirit`).

## Overview
Marketing site + unlinked admin dashboard for TechnoSpirit. Public site is a cinematic, scroll-driven experience. Design language is **locked: Swiss Modernism 2.0 x Minimalist Monochrome** — zero border-radius, no shadows/gradients/glass; hairlines + hard rules; typography IS the interface.

## Stack
- **frontend/** — React 19 + Vite 8 (**JavaScript, not TS**), Tailwind **v4 CSS-first** (no `tailwind.config.js`; theme via `@theme` in `src/index.css`), shadcn 4 + radix-ui, `gsap` 3.15 + `@gsap/react`, `lenis`, `react-router-dom` 7, `lucide-react`, `scrolly-video` (**/lab only**). Self-hosted fonts: `@fontsource-variable/archivo` + `jetbrains-mono` (never reintroduce Google Fonts links). devDeps: `sharp`, `ffmpeg-static`, `ffprobe-static` (npm binaries ARE ffmpeg), `oxlint`, `shadcn`.
- **backend/** — ESM Express 5, mongoose 9, nodemailer 9, bcryptjs, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit, express-validator, dotenv.

## Commands
- Frontend (run from `frontend/`): dev `npm run dev -- --host 127.0.0.1 --port 5173`; build `npm run build`; lint `npm run lint` (oxlint); preview `npm run preview`.
- Backend (run from `backend/`): `npm run dev` (watch) / `npm start`; seed `npm run seed` / `npm run seed:reset`.
- Vite proxies `/api` → `http://127.0.0.1:5000` in dev AND preview (one origin ⇒ `SameSite=Lax` auth cookie).

## Architecture
- `frontend/src/App.jsx` has **two layout routes — never merge**: `<MarketingShell>` (Lenis, GSAP ticker, `<Cursor>`, `<RouteTransition>`, Nav, Footer, grain) and `<AdminShell>` (none of that; instant). `<AuthProvider>` lives **inside AdminShell only** — public routes must make zero API calls.
- Routes: `/`, `/about`, `/services`, `/why-us`, `/contact`, `/lab` (lazy), `/capabilities` (lazy, desktop-only), `*` 404. Admin: `/dashboard/login`, `/dashboard`, `/dashboard/inquiries[/:id]`.
- Backend API: `POST /api/contact`, `GET /api/health`, `POST /api/auth/login|logout`, `GET /api/auth/me`, `GET /api/admin/stats`, `GET|PATCH /api/admin/inquiries*`. `requireAuth` via `router.use("/admin", ...)`.

## Design tokens / rules
- `--color-paper #fff · --color-ink #000 · --color-signal #ff2d16` (large type only) `· --color-signal-ink #d91a05 · --color-ash · --color-hair`. Red stays scarce; one full-bleed red moment (`FinalCta` on Home — do not invert).
- Typography: Archivo variable **`wdth 62..125%` axis via `font-stretch`** (NEVER `font-variation-settings`). JetBrains Mono = `.ts-label` microcopy (min 11px).
- Zone system: sections declare `data-zone="paper"|"ink"`. Section padding owned only by `ts-act`, `ts-act-sm`, `ts-act-open`.
- **No fabricated proof** (no fake testimonials/logos/metrics/years). Only ONE real ScrollTrigger pin site-wide (Home horizontal act); later "pins" are CSS `position: sticky`.

## Motion — load-bearing rules (each cost a real bug)
1. Import gsap **only from `lib/gsap.js`**. Cleanup via `useGSAP({scope})`.
2. Never tween `yPercent`/`scaleX` **to** a value whose start is a CSS percentage transform — use `fromTo` or `gsap.set` first.
3. Never put a Tailwind `scale-*`/`translate-*` utility on a GSAP-transformed element (v4 compiles them to standalone properties; the tween silently no-ops).
4. Never tween a `clip-path` string — tween numeric `{w,h,r,o}` and compose in `onUpdate`.
5. Overlay/portal motion = CSS keyframes, not GSAP. Never `setState` on a pointer/scroll frame (write `textContent`/transforms imperatively).
6. React Bits ports are **rewritten, never shipped verbatim** (see `motion/`). `/capabilities` scenes: no component starts its own RAF — one clock (GSAP ticker → Lenis → ScrollTrigger → `capabilitiesStage` store).

## Don't change without a reason
- `/capabilities`: fingertip alignment math, `CONTACT_FY = 0.47`, `max-width:none` on `.cap-hand`/`.cap-lens-img`, all-intra `aircraft.mp4` encode (quality settled — do not re-litigate), device gate (never build a mobile version).
- `/lab`: WebCodecs decode path exists only because its source has a 6s GOP — the fix is re-encoding all-intra, not touching `ShouldDecode` workarounds.
- Nav zone detection (elementsFromPoint + ticker sampling), `Cursor.jsx` clip-path window architecture, backend `createInquiry` ordering (create → respond → send mail; mailer never rejects).

## Known issues
- Entry chunk ~531 kB (>500 kB Rollup warning).
- `/lab` (`scroll-video.mp4`, 3.34 MB) still has 6s GOP + ~833 MB WebCodecs decode path; absent from NAV_ITEMS. Next action: re-encode all-intra like `/capabilities`.
- `/api/auth/me` errors (502/401) — only relevant on `/dashboard/*`. External BHK widget SDK logs a 502 (not app code).
- Recent (Aug 26, Claude-Mem): reported "goBack x2 from /contact lands on wrong page" — not yet verified or documented in PROJECT_MEMORY.md.
- Rate-limit state is in-memory per process; no password-change UI; `mustChangePassword` recorded but unused.

## Current state
- `/capabilities` is complete and Playwright-verified (desktop 1280–1920; phones gated, zero heavy assets). Production build passes.
- **Uncommitted working-tree changes exist**: `frontend/src/App.jsx`, `frontend/src/components/capabilities/ImageTrail.jsx`, `frontend/PROJECT_MEMORY.md` (last session: App.jsx refactor + ImageTrail simplification). Review before committing.
- Environment: Windows, no Python, no system ffmpeg. Browser testing = Playwright (not Chrome MCP).

## When asked about a library/framework
Use Context7 MCP (`resolve-library-id` → `query-docs`) before answering docs/API questions.
