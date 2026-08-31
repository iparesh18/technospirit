/**
 * The launcher's centre mark.
 *
 * A circular crop of `public/images/ai-logo.avif`, breathing very slightly.
 *
 * The element is one <img> inside a round, overflow-hidden wrapper — no
 * canvas, no filters, no recolouring, no encoding. The browser fetches the
 * AVIF once, from the ordinary static path, and caches it; the three instances
 * on screen (launcher, panel header, thinking indicator) share that one
 * request.
 *
 * WHY `cover` AND NOT `contain`
 * The source is 736x981 — portrait, with no alpha and an opaque lavender
 * ground. `contain` would letterbox that rectangle inside the circle and paint
 * its corners with whatever sits behind, i.e. a visible rectangle in a round
 * hole. `cover` fills the circle and crops only the empty ground above the
 * dome and the reflection below it, so nothing of the subject is lost. The
 * vertical `object-position` is tuned in ai-chat.css: the dome sits above the
 * middle of the frame, and centring the FRAME would leave the subject riding
 * high in the circle.
 *
 * MOTION
 * The breathing is unchanged and still belongs to the wrapper, not the image —
 * see `.ts-ai-blob-breathe`. Nothing animates inside the picture.
 *
 * ACCESSIBILITY
 * `alt=""` is deliberate. The button around this already carries
 * aria-label="Open TechnoSpirit customer support"; describing the mark again
 * would announce the same control twice.
 */

/** The one asset, referenced once. */
const LOGO = "/images/ai-logo.avif";

export default function LivingBlob({ size = 56, className = "" }) {
  return (
    <span className={`ts-ai-blob-scale ${className}`}>
      <span className="ts-ai-blob-breathe">
        <span className="ts-ai-orb" style={{ width: size, height: size }}>
          <img
            src={LOGO}
            alt=""
            /* Intrinsic size stated so the box is reserved before the image
               decodes — the circle never resizes under the ring. */
            width={size}
            height={size}
            draggable="false"
            decoding="async"
          />
        </span>
      </span>
    </span>
  );
}
