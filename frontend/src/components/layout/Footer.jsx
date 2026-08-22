import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MaskText from "@/components/ui/MaskText";
import Reveal from "@/components/ui/Reveal";
import { ActionLink } from "@/components/ui/ActionLink";
import { SystemLabel } from "@/components/ui/SystemLabel";
import Magnet from "@/components/motion/Magnet";
import ScrambleText from "@/components/motion/ScrambleText";
// Aurora is the only thing in the project that pulls in `ogl`, and it is a
// decorative band at the bottom of every page — never on screen at first
// paint. Splitting it out is what takes the entry chunk under Rollup's 500 kB
// warning. <AuroraBand> below also holds the fetch until the footer is
// actually approaching, so it never competes with the hero for bandwidth.
const Aurora = lazy(() => import("@/components/motion/Aurora"));
// Both of the footer's heavy pieces are `ogl` shaders sitting far below the
// fold, so both are split out and neither is fetched until the footer is
// actually approaching. Keeping WarpText a static import would drag `ogl`
// straight back into the entry chunk and undo the Aurora split.
const WarpText = lazy(() => import("@/components/motion/WarpText"));
import useWorldClock from "@/hooks/useWorldClock";

const CAPABILITIES = [
  { name: "Web Development", to: "/services" },
  { name: "AI & Automation", to: "/services" },
  { name: "Voice Agents", to: "/services" },
  { name: "Digital Growth", to: "/services" },
];

/**
 * The aurora band, held back until the footer is within a viewport of the
 * scroll position.
 *
 * The geometry here is exactly what used to be inline: same box, same 58%
 * height, same 0.78 opacity, same shader props. The only change is *when* the
 * shader arrives. Two reasons to gate it rather than just render the lazy
 * component: the chunk carries `ogl`, which has no business being fetched
 * while the hero is still painting; and there is no point compiling a WebGL
 * program for something several screens below the fold.
 *
 * The container renders either way, so nothing in the footer moves when the
 * canvas appears — it is a background band with no layout participation.
 * Aurora itself still parks on its own IntersectionObserver once mounted.
 */
/**
 * True once the referenced element has come within `rootMargin` of the
 * viewport, and true from then on.
 *
 * Both heavy things in this footer are `ogl` canvases several screens below
 * the fold — the aurora band and the wordmark's warp shader. Neither should be
 * fetched, and neither should have a WebGL program compiled for it, while the
 * hero is still painting.
 */
function useNearViewport(ref, rootMargin = "100% 0px") {
  // Derived at first render, not from an effect: on a browser with no
  // IntersectionObserver there is nothing to wait for, and flipping the flag
  // inside the effect would just spend an extra render to reach the same
  // answer.
  const [near, setNear] = useState(() => typeof IntersectionObserver !== "function");

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, near, rootMargin]);

  return near;
}

function AuroraBand() {
  const box = useRef(null);
  const near = useNearViewport(box);

  return (
    <div
      ref={box}
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[58%] opacity-[0.78]"
    >
      {near && (
        <Suspense fallback={null}>
          <Aurora amplitude={1.05} blend={0.62} speed={0.45} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * One full-width lockup, sized so the line always lands on both margins.
 *
 * This used to be an SVG <text> with `textLength` + `lengthAdjust="spacing"`,
 * filled with a React Bits ShinyText sweep. It is now React Bits WarpText: the
 * word is rasterised to a texture and pushed through a refraction shader, so
 * it drifts, bulges toward the cursor and carries faint chromatic fringes at
 * the edges instead of a red band crossing it. `ShinyText` is left in the tree
 * unused — nothing imports it, so it is tree-shaken out of the bundle — in
 * case the sweep is ever wanted back.
 *
 * The lockup's geometry is preserved across the swap. The container keeps the
 * old viewBox's aspect ratio (1000×116 on one line, 1000×292 stacked) so the
 * footer's rhythm is unchanged, and `fitWidth={1}` + `justify` reproduce the
 * `textLength` behaviour: the type is scaled to the box and any last few
 * pixels of slack are distributed into tracking, so the word still touches
 * both margins.
 *
 * One real difference, and it is a limitation of canvas rather than a choice:
 * `ctx.font` cannot express `font-variation-settings`, so Archivo's `wdth`
 * axis is at its default 100 here instead of the old 62/74/125. The fit is
 * carried by size and tracking instead of by condensing the glyphs.
 */
function Wordmark({ lines, tone = "paper", stacked = false }) {
  const box = useRef(null);
  // A tighter margin than the aurora's: the wordmark is the very last thing on
  // the page, so half a viewport of warning is plenty and it keeps the shader
  // off the critical path for anyone who never scrolls this far.
  const near = useNearViewport(box, "50% 0px");

  return (
    <div ref={box} className={stacked ? "aspect-[1000/292]" : "aspect-[1000/116]"}>
      {near && (
        <Suspense fallback={null}>
          <WarpText
            text={lines.join("\n")}
            // Faded rather than solid white: the mark sits under the aurora
            // and should read as a watermark pressed into the black, not as a
            // second headline competing with the contact block above it.
            color={tone === "signal" ? "rgba(255,45,22,0.72)" : "rgba(255,255,255,0.72)"}
            fontFamily='"Archivo Variable", "Archivo", Helvetica, Arial, sans-serif'
            fontWeight={800}
            // A deliberately oversized nominal value: WarpText solves for
            // whichever axis binds, so this only has to be bigger than the box
            // and the fit does the rest.
            fontSize={420}
            letterSpacing={0}
            lineHeight={stacked ? 1.02 : 0.92}
            // edge to edge, standing in for the old textLength fit
            fitWidth={1}
            fitHeight={stacked ? 0.98 : 1}
            justify
            // The word is already announced by the .sr-only span below the
            // lockup; role="img" here would read it out a second time.
            ariaHidden
            className="h-full"
            // Well past upstream's defaults (0.08 / 1.7 / 0.55 / 0.42 / 0.38 /
            // 0.018): the shader multiplies warpStrength by 0.045 and
            // refraction by 0.16 before they reach the sampler, so the numbers
            // have to get large before anything is visible at all.
            //
            // pointerInfluence is the LENS RADIUS, in aspect-corrected uv, and
            // it is the prop to reach for first. On a mark this wide (~8.6:1)
            // a value of 1.0 works out to roughly a sixth of the width, which
            // is big enough for the displacement to read as glass moving over
            // the letters rather than tearing a hole in one of them.
            warpStrength={0.34}
            warpScale={1.9}
            speed={0.7}
            pointerInfluence={1.0}
            pointerStrength={0.95}
            refraction={0.07}
            falloff={1.5}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function Footer() {
  const clocks = useWorldClock();
  const year = new Date().getFullYear();

  return (
    <footer
      data-zone="ink"
      id="contact"
      // `relative` + `overflow-hidden` + `isolate` is what keeps the aurora
      // inside the footer. `isolate` gives it its own stacking context so the
      // negative z-index below cannot escape behind the page.
      className="relative isolate overflow-hidden bg-black text-white"
    >
      {/* ── aurora ────────────────────────────────────────────────────────
          Atmospheric light spilling in over the top edge of the footer and
          falling away downward. It is a band, not a background: 62% of the
          footer's height, pinned to the top, so the wordmark and the small
          copy at the bottom sit on plain black.

          Two separate falloffs stack here, deliberately:
            1. the shader's own — `intensity` scales with `uv.y`, and `uv.y`
               is 0 at the *bottom* in GL, so the band is born bright along the
               top edge and thins out as it descends. No inversion needed.
            2. a CSS mask on top of that, fading the canvas to fully
               transparent by its own bottom, which is what guarantees the
               contact details and links never have to compete with it.

          The palette is ember → signal red → ember. Upstream ships violet into
          green; this is lighting, not a light show. */}
      <AuroraBand />

      {/* a hairline of pure signal on the cut, so the light reads as entering
          through the seam rather than sitting on top of it */}
      <div className="absolute inset-x-0 top-0 z-10 h-px bg-signal/60" aria-hidden="true" />

      {/* ── closing statement ─────────────────────────────────────────── */}
      <div className="ts-shell relative border-b border-white/16 pt-16 pb-12 sm:pt-20 sm:pb-14">
        <div className="ts-grid items-end">
          <div className="col-span-12 lg:col-span-8">
            <SystemLabel className="mb-7 text-white/50">
              GET IN TOUCH
            </SystemLabel>

            <MaskText
              as="h2"
              lines={["Let's build", "what's next."]}
              className="ts-display-tight text-[clamp(3rem,11vw,10rem)] text-white"
              wordClassName="[&>*]:inline"
            />

            <p className="ts-body mt-7 max-w-md text-base text-white/55 sm:text-lg">
              Tell us what the business needs to do. We'll design the system that does it —
              and keep it running long after launch.
            </p>
          </div>

          <div className="col-span-12 mt-9 lg:col-span-4 lg:mt-0 lg:justify-self-end">
            <Magnet padding={70} strength={4}>
              <ActionLink to="/services" tone="outline" className="w-full sm:w-auto">
                START A PROJECT
              </ActionLink>
            </Magnet>
          </div>
        </div>
      </div>

      {/* ── capabilities + contact + coverage ─────────────────────────── */}
      <div className="ts-shell relative border-b border-white/16 py-12">
        <Reveal className="ts-grid gap-y-10" staggerChildren y={16}>
          <div className="col-span-12 md:col-span-4">
            <div className="ts-label mb-5 text-signal">CAPABILITIES</div>
            <ul className="space-y-3">
              {CAPABILITIES.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    data-cursor="open"
                    className="group/f relative inline-block text-[0.95rem] text-white/70 transition-colors duration-300 hover:text-white"
                  >
                    {link.name}
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-signal transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/f:origin-left group-hover/f:scale-x-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="ts-label mb-5 text-signal">CONTACT</div>
            {/* Real business details land here once provided — no invented data. */}
            <ul className="space-y-3 text-[0.95rem] text-white/70">
              <li className="flex items-baseline gap-3">
                <span className="ts-label text-white/35">EMAIL</span>
                <span className="text-white/40">— pending —</span>
              </li>
              <li className="flex items-baseline gap-3">
                <span className="ts-label text-white/35">PHONE</span>
                <span className="text-white/40">— pending —</span>
              </li>
              <li className="flex items-baseline gap-3">
                <span className="ts-label text-white/35">BASE</span>
                <span className="text-white/40">— pending —</span>
              </li>
            </ul>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="ts-label mb-5 text-signal">COVERAGE</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {clocks.map((z) => (
                <div key={z.code} className="flex items-baseline justify-between gap-3">
                  <span className="ts-label text-white/45">{z.code}</span>
                  <span className="font-mono text-[0.8rem] tabular-nums text-white/75">
                    {z.time}
                  </span>
                </div>
              ))}
            </div>
            <p className="ts-label mt-5 leading-relaxed text-white/30">WORKING ACROSS TIME ZONES</p>
          </div>
        </Reveal>
      </div>

      {/* ── the wordmark: the signature ───────────────────────────────────
          SVG rather than HTML because `textLength` + `lengthAdjust` is the
          only way to guarantee the word lands exactly on both margins whether
          or not the webfont has arrived. The viewBox is cropped tight to the
          cap height so the block carries no dead band above or below.

          This sits below the aurora's mask on purpose. It is the last thing on
          the site and it should read as a signature — solid white, edge to
          edge, on black, with air around it and nothing moving behind it. */}
      <div className="relative px-3 pt-14 pb-8 sm:px-5 sm:pt-20 sm:pb-10">
        {/* one line, ≥640px */}
        <div className="hidden sm:block">
          <Wordmark lines={["TECHNOSPIRIT"]} />
        </div>

        {/* two lines, <640px — twelve characters across 390px collapse into a
            grey stripe, so the word breaks and the width axis opens up */}
        <div className="block sm:hidden">
          <Wordmark lines={["TECHNO", "SPIRIT"]} stacked />
        </div>
      </div>

      <span className="sr-only">TechnoSpirit</span>

      {/* ── baseline ──────────────────────────────────────────────────── */}
      <div className="ts-shell relative flex flex-col gap-3 border-t border-white/16 py-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="ts-label text-white/40">© {year} TECHNOSPIRIT</span>
        <span className="ts-label flex items-center text-white/40">
          <ScrambleText text="BUILT WITHOUT BORDERS" />
        </span>
      </div>
    </footer>
  );
}
