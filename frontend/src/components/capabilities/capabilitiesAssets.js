/**
 * Every optimised asset this page ships, and the beat map that decides when
 * each one is allowed to exist.
 *
 * Paths point at `public/capabilities/optimized/`, which is written by
 * `scripts/optimize-capabilities-images.mjs` and
 * `scripts/optimize-capabilities-video.mjs`. The untouched sources stay as the
 * masters (stills in `public/images/`, footage in `public/`) and are never
 * referenced by the app — the browser has no path to the 981 KB PNG or the
 * single-keyframe MP4s.
 */

const DIR = "/capabilities/optimized";

export const HAND_HUMAN = {
  avif: `${DIR}/human-hand.avif`,
  webp: `${DIR}/human-hand.webp`,
  avifSm: `${DIR}/human-hand-1280.avif`,
  webpSm: `${DIR}/human-hand-1280.webp`,
  width: 1672,
  height: 941,
};

export const HAND_ROBOT = {
  avif: `${DIR}/robo-hand.avif`,
  webp: `${DIR}/robo-hand.webp`,
  avifSm: `${DIR}/robo-hand-1280.avif`,
  webpSm: `${DIR}/robo-hand-1280.webp`,
  width: 1672,
  height: 941,
};

/**
 * What the opening lens reveals behind the paper.
 *
 * A visor with a galaxy in it, on a starfield — chosen for the reveal because
 * it reads at any crop: the pointer finds the helmet in the middle, nebula
 * toward the edges and deep field in the corners, so the window never lands on
 * nothing. It also carries its own light, which is what the dispersing rim
 * needs something to disperse.
 */
export const REVEAL_BG = {
  avif: `${DIR}/reveal-bg.avif`,
  webp: `${DIR}/reveal-bg.webp`,
  avifSm: `${DIR}/reveal-bg-1280.avif`,
  webpSm: `${DIR}/reveal-bg-1280.webp`,
  width: 1672,
  height: 941,
};

export const SNEAKER_RAW = {
  mp4: `${DIR}/sneaker-raw.mp4`,
  poster: `${DIR}/sneaker-raw-poster.avif`,
};

export const SNEAKER_REFINED = {
  mp4: `${DIR}/sneaker-refined.mp4`,
  poster: `${DIR}/sneaker-refined-poster.avif`,
};

export const AIRCRAFT = {
  mp4: `${DIR}/aircraft.mp4`,
  poster: `${DIR}/aircraft-poster.avif`,
  /** 240 frames at 24fps. Both are exact, and both are load-bearing: the
      scrub steps in whole frames and the seek target is derived from them. */
  frames: 240,
  fps: 24,
};

/**
 * Vertical seat of the contact point, as a fraction of the stage height.
 *
 * Declared here and consumed in two places that MUST agree: `capabilities.css`
 * positions both hand plates against it (via the `--cap-contact-fy` custom
 * property, set from this value), and `SneakerScene` uses it as the centre of
 * the aperture. If they drifted, the circle would open from somewhere other
 * than the point the reader just watched appear.
 *
 * Above centre, because the composition wants more air beneath the hands than
 * above them, and because it keeps the point clear of the fixed header.
 */
export const CONTACT_FY = 0.47;

/**
 * THE BEAT MAP.
 *
 * Every scene works in its own local 0..1 and reads its window from here, so
 * the shape of the whole page is one object rather than a set of magic numbers
 * scattered across nine files. Overlaps are deliberate — a beat that ends
 * exactly where the next begins produces a visible seam, and the point of this
 * page is that there are none.
 */
export const BEATS = {
  act1: {
    /** CAPABILITIES holds, alone, while the reader finds the lens. */
    openHold: [0.0, 0.1],
    openOut: [0.1, 0.17],
    /** The hands are already fading up under the paper as it goes. */
    handsIn: [0.12, 0.2],
    /** The approach. The longest single stretch on the page, on purpose. */
    approach: [0.17, 0.5],
    /** Contact, and the signal point. */
    contact: [0.5, 0.555],
    /** The point becomes the aperture of the next world. */
    circle: [0.555, 0.67],
    /** The sneaker is live and explorable. */
    sneaker: [0.67, 0.95],
    sneakerOut: [0.95, 1.0],
  },
  act2: {
    statement: [0.0, 0.15],
    handoff: [0.14, 0.22],
    /** The aircraft, scrubbed. 240 frames across this window. */
    scrub: [0.2, 0.97],
  },
};

/**
 * STAGED LOADING.
 *
 * The thresholds below are the answer to "the visitor should never reach a
 * thing and then wait for it". Each one is placed a beat and a half before the
 * asset is needed, which at this page's scroll rate is several seconds of
 * reading time even for someone moving quickly — and none of them is placed
 * earlier than that, so a reader who stops at the opening never pays for the
 * aircraft.
 *
 *   1  hands              mounted immediately (41 KB of AVIF, both plates)
 *   2  sneaker metadata   during the approach
 *   3  sneaker ready      before the circle opens
 *   4  aircraft metadata  while the sneaker is being explored
 *   5  aircraft ready     while the sneaker is still being explored
 *
 * STAGES 4 AND 5 MOVED EARLIER when the aircraft encode was rebuilt. The file
 * went from 3.43 MB to 5.29 MB, and a runway that was correct for the smaller
 * one is not automatically correct for the larger: the point of the staging is
 * that the reader never arrives at an asset and then waits for it, so the
 * runway has to grow with the bytes.
 *
 * Act one is 760svh and act two is 520svh, and the aircraft is first SEEN at
 * act2 0.2 — 104svh into act two. From stage 5 the reader therefore has
 * (1 - 0.80) x 760 + 104 = 256svh of scrolling before the first frame is
 * needed, up from 180. On a 900px viewport that is ~2,300px of travel, which
 * at this page's rate is several seconds of reading even for someone moving
 * quickly. Nothing is fetched before 0.66 of act one, so a reader who stops at
 * the opening still pays nothing for any of it.
 */
export const LOAD_STAGES = [
  { stage: 1, act: "act1", at: 0 },
  { stage: 2, act: "act1", at: 0.26 },
  { stage: 3, act: "act1", at: 0.46 },
  { stage: 4, act: "act1", at: 0.66 },
  { stage: 5, act: "act1", at: 0.8 },
];

/** Scroll distance for each act, in svh. */
export const TRAVEL = {
  act1: 760,
  act2: 520,
};

/**
 * THE INTENT TRAIL — the opening beat's image trail.
 *
 * The same five pictures `/contact` rides on the pointer, in the same order and
 * against the same five words, cut down to 440px by
 * `scripts/optimize-capabilities-images.mjs`. Sharing the set is the point: the
 * opening beat's sub-line reads HUMAN INTENT, and these are what the site
 * already calls its intents. See `ImageTrail.jsx` for the art direction.
 *
 * 440px is DPR-2 for the largest card (196 CSS px x 1.06 fast-pointer scale).
 * `/contact` keeps loading the 600px originals from `/intent/` — its plate is
 * ~340px wide and genuinely needs them.
 */
const TRAIL_DIR = `${DIR}/intent`;

export const INTENT_TRAIL = [
  { stem: "img1", index: "01", word: "Build", width: 440, height: 660 },
  { stem: "img2", index: "02", word: "Automate", width: 440, height: 550 },
  { stem: "img3", index: "03", word: "Scale", width: 440, height: 550 },
  { stem: "img4", index: "04", word: "Collaborate", width: 440, height: 660 },
  { stem: "img5", index: "05", word: "Something else", width: 440, height: 550 },
].map((i) => ({
  ...i,
  avif: `${TRAIL_DIR}/${i.stem}.avif`,
  webp: `${TRAIL_DIR}/${i.stem}.webp`,
}));

/** Total shipped weight of the set above, for the record: 102.5 KB AVIF
    (141.4 KB if the browser has to take the WebP path), down from 283.2 KB. */
export const INTENT_TRAIL_BYTES = 104_960;
