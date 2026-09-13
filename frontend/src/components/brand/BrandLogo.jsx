import { cn } from "@/lib/utils";

/**
 * The TechnoSpirit lockup: the supplied artwork plus the ™, as one unit.
 *
 * The ™ is set in type and positioned against the artwork — it is never baked
 * into the asset, so it stays sharp at any scale and can be corrected without
 * re-cutting the image. Everything that decides where it lands lives here and
 * only here; call sites choose which asset to draw and how big the lockup is,
 * and the mark follows.
 *
 * ── why the numbers below are what they are ─────────────────────────────────
 *
 * Both assets are the same crop of the same master at two resolutions, which
 * is what lets one rule cover both. Measured off the alpha channels:
 *
 *   logo-nav.png     1200x469  ratio 2.5586
 *   logo-footer.*     760x297  ratio 2.5589
 *   ink bbox         flush to all four frame edges in both
 *   ascender line    35.2% / 35.4% from the top, over the right quarter
 *
 * The final 't' of "Spirit" is clipped flush to the right edge of the frame,
 * so there is no room *beside* the wordmark. The ™ goes above it instead,
 * right-aligned to the artwork's own edge and resting just clear of the
 * ascenders and the i-dots — which is where a trademark belongs on a wordmark
 * anyway, and it costs the lockup no extra width.
 *
 * `bottom` is offset, not naive: ™ is a superscript glyph that draws in the
 * top third of its em box, so roughly 6.7% of the frame sits empty between the
 * ink and the bottom of the span. Positioning the box at the ascender line
 * left an 11px hole and the mark read as floating. 60.5% puts the *ink* 2.8%
 * above the letters — measured off rendered pixels, not the box model.
 *
 * Both offsets are percentages and the size is in `cqw`, and all three resolve
 * against the same box, so the whole relationship is scale-invariant: it is
 * pinned to the artwork, not to a breakpoint.
 */

/**
 * The frame ratio, held on the wrapper rather than left to the image.
 *
 * It is what makes the box's two dimensions interchangeable — the navbar sizes
 * the lockup by height and the footer by width, and the ™'s container query
 * needs a definite inline size either way. It also means the box can never
 * disagree with the artwork, so `object-contain` below has nothing to correct.
 */
const FRAME = "1200/469";

/**
 * The two cuts of the wordmark. Same crop, different resolutions and delivery:
 * the navbar's is above the fold and eager, the footer's is several screens
 * down and ships as AVIF with a WebP fallback.
 */
const ASSETS = {
  nav: {
    src: "/images/logo-nav.png",
    width: 1200,
    height: 469,
    sources: [],
  },
  footer: {
    src: "/images/logo-footer.webp",
    width: 760,
    height: 297,
    sources: [{ srcSet: "/images/logo-footer.avif", type: "image/avif" }],
  },
};

/**
 * @param {object} props
 * @param {"nav" | "footer"} [props.asset]  which cut of the artwork to draw
 * @param {string} [props.alt]              omit or pass "" to mark it decorative
 * @param {string} [props.className]        sizes the lockup — height *or* width
 * @param {string} [props.imgClassName]     artwork only, e.g. the ink-zone filter
 * @param {string} [props.markClassName]    the ™ only, e.g. its colour
 * @param {"lazy" | "eager"} [props.loading]
 * @param {"async" | "auto" | "sync"} [props.decoding]
 */
export default function BrandLogo({
  asset = "footer",
  alt,
  className,
  imgClassName,
  markClassName,
  loading,
  decoding,
  ...rest
}) {
  const art = ASSETS[asset] ?? ASSETS.footer;
  const decorative = !alt;

  const image = (
    <img
      src={art.src}
      width={art.width}
      height={art.height}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      loading={loading}
      decoding={decoding}
      /* The wrapper already carries the artwork's ratio, so this fills it
         exactly and `object-contain` is only ever a guard against a future
         asset whose crop drifts. Out of flow so <picture>'s inline box can't
         put a stray line box inside the ratio. */
      className={cn("absolute inset-0 block h-full w-full object-contain", imgClassName)}
    />
  );

  return (
    <span
      {...rest}
      className={cn("relative block", className)}
      style={{ aspectRatio: FRAME, ...rest.style }}
    >
      {art.sources.length > 0 ? (
        <picture>
          {art.sources.map((source) => (
            <source key={source.type} srcSet={source.srcSet} type={source.type} />
          ))}
          {image}
        </picture>
      ) : (
        image
      )}

      {/* The query container is this overlay rather than the wrapper itself.
          `container-type: inline-size` also applies inline-size *containment*,
          which computes the element's width as if it had no contents — on the
          wrapper that is a live hazard, because the navbar sizes the lockup by
          height and lets the ratio supply the width. Pinned to `inset-0`, the
          width comes from the containing block instead, so 1cqw is 1% of the
          artwork's width no matter which dimension the call site set. */}
      <span aria-hidden="true" className="@container pointer-events-none absolute inset-0">
        <span
          className={cn(
            "absolute right-0 bottom-[60.5%] font-sans leading-none font-medium select-none",
            markClassName,
          )}
          /* Overridable per call site with `[--ts-tm-size:…]`. The navbar's
             lockup is a quarter of the footer's, and the strictly proportional
             size falls under the optical floor there. */
          style={{ fontSize: "var(--ts-tm-size, max(10px, 5cqw))" }}
        >
          ™
        </span>
      </span>
    </span>
  );
}
