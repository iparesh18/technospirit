/**
 * /capabilities — static image optimisation.
 *
 *   node scripts/optimize-capabilities-images.mjs
 *
 * Source plates are 1672x941 PNGs of a hand lit against a pure-black ground.
 * That content shape drives every setting here:
 *
 *  - There is no alpha and none is added. The plates are composited with
 *    `mix-blend-mode: screen` over a black section, which makes their black
 *    ground vanish for free. Deriving an alpha channel from luminance would be
 *    the same result with an unpremultiply step that visibly frays the soft
 *    edges of the rim light.
 *  - Nothing is upscaled. 1672 is the native width and the largest variant.
 *  - Dark smooth gradients band badly at low bitrates, so quality is set well
 *    above the usual web default and AVIF gets a slow, high-effort pass. AVIF
 *    is the format that actually matters for this content — it carries the
 *    near-black falloff and the red rim glow at a fraction of WebP's size.
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const SRC = "public";
const OUT = "public/capabilities/optimized";

const PLATES = [
  { in: "human-hand.png", stem: "human-hand" },
  { in: "robo-hand.png", stem: "robo-hand" },
  // The opening reveal. Different content from the plates — a starfield with
  // thousands of single-pixel highlights — so it gets its own quality, chosen
  // by measuring how many of those highlights survive the encode rather than
  // by eye. At q66 the count is unchanged and the file is 127 KB; below that
  // the dark nebula bands before the stars do.
  { in: "bg.png", stem: "reveal-bg", avifQuality: 66, webpQuality: 80 },
];

/** Native width first. `md` covers 1280-1600 viewports at the plate's ~1.06vw
    render width without ever asking a browser to downscale by more than 2x. */
const WIDTHS = [
  { w: 1672, tag: "" },
  { w: 1280, tag: "-1280" },
];

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

await fs.mkdir(OUT, { recursive: true });

const report = [];

for (const plate of PLATES) {
  const srcPath = path.join(SRC, plate.in);
  const srcStat = await fs.stat(srcPath);
  const meta = await sharp(srcPath).metadata();

  for (const { w, tag } of WIDTHS) {
    if (w > meta.width) continue; // never upscale

    const base = sharp(srcPath).resize({
      width: w,
      // Lanczos3 default; on a dark photographic plate it holds the fingertip
      // edge that a box filter softens into the ground.
      withoutEnlargement: true,
    });

    const avifPath = path.join(OUT, `${plate.stem}${tag}.avif`);
    const webpPath = path.join(OUT, `${plate.stem}${tag}.webp`);

    await base
      .clone()
      .avif({ quality: plate.avifQuality ?? 62, effort: 9, chromaSubsampling: "4:2:0" })
      .toFile(avifPath);

    await base
      .clone()
      .webp({ quality: plate.webpQuality ?? 82, effort: 6, smartSubsample: true })
      .toFile(webpPath);

    const [a, b] = await Promise.all([fs.stat(avifPath), fs.stat(webpPath)]);
    const h = Math.round((w / meta.width) * meta.height);

    report.push({
      source: plate.in,
      srcFormat: meta.format,
      srcDim: `${meta.width}x${meta.height}`,
      srcBytes: srcStat.size,
      outDim: `${w}x${h}`,
      avif: a.size,
      webp: b.size,
      avifPath,
      webpPath,
    });
  }
}

console.log("\n=================== STATIC IMAGE OPTIMISATION ===================");
for (const r of report) {
  const saveA = (1 - r.avif / r.srcBytes) * 100;
  const saveW = (1 - r.webp / r.srcBytes) * 100;
  console.log(
    `\n${r.source}  ${r.srcFormat.toUpperCase()} ${r.srcDim}  ${kb(r.srcBytes)}` +
      `\n  -> ${r.outDim}  AVIF ${kb(r.avif).padStart(9)}   (-${saveA.toFixed(1)}%)   ${r.avifPath}` +
      `\n  -> ${r.outDim}  WEBP ${kb(r.webp).padStart(9)}   (-${saveW.toFixed(1)}%)   ${r.webpPath}`,
  );
}

const srcTotal = [...new Set(report.map((r) => r.source))].reduce((acc, s) => {
  const row = report.find((r) => r.source === s);
  return acc + row.srcBytes;
}, 0);
const shippedTotal = report
  .filter((r) => r.outDim.startsWith("1672"))
  .reduce((acc, r) => acc + r.avif, 0);
console.log(
  `\nOriginals (2 PNG):        ${kb(srcTotal)}` +
    `\nShipped at native (AVIF): ${kb(shippedTotal)}   -${((1 - shippedTotal / srcTotal) * 100).toFixed(1)}%\n`,
);

/* ==========================================================================
   THE INTENT TRAIL PLATES
   Source: `public/intent/img1..5.avif` — the five plates `/contact` already
   rides on the pointer, reused here as the opening beat's image trail. They
   are the same five intents the site names elsewhere (BUILD / AUTOMATE /
   SCALE / COLLABORATE / SOMETHING ELSE), which is why they are the right
   pictures for a beat whose sub-line reads HUMAN INTENT.

   They arrive as 600x750 and 600x900 AVIF — correct for /contact, where the
   plate is ~340px wide, and roughly 1.4x oversized here, where the trail card
   never exceeds 196 CSS px. A trail plate lives for 0.64s and is in motion for
   all of it, so nothing above the DPR-2 render width is ever resolvable; the
   variants below are cut at 440px, which covers 196 x 1.06 (the fast-pointer
   scale) x 2 with a little headroom.

   Re-encoding AVIF -> AVIF is normally a bad idea, but the downscale to 440
   discards more detail than the second encode does, and it is measured below:
   the shipped set is a fraction of the source bytes at a size no viewer can
   tell apart from a native-resolution crop.
   ========================================================================== */

const TRAIL_SRC = "public/intent";
const TRAIL_OUT = "public/capabilities/optimized/intent";
/** DPR-2 render width for the largest trail card. See the note above. */
const TRAIL_W = 440;

await fs.mkdir(TRAIL_OUT, { recursive: true });

const trailReport = [];

for (const stem of ["img1", "img2", "img3", "img4", "img5"]) {
  const srcPath = path.join(TRAIL_SRC, `${stem}.avif`);
  const srcStat = await fs.stat(srcPath);
  const meta = await sharp(srcPath).metadata();

  const base = sharp(srcPath).resize({ width: TRAIL_W, withoutEnlargement: true });

  const avifPath = path.join(TRAIL_OUT, `${stem}.avif`);
  const webpPath = path.join(TRAIL_OUT, `${stem}.webp`);

  // Quality is a notch below the reveal image on purpose: this content is
  // 196px wide, moving, and on screen for two thirds of a second. The starfield
  // needed q66 because single-pixel highlights had to survive; nothing here is
  // ever read at pixel level.
  await base.clone().avif({ quality: 58, effort: 9, chromaSubsampling: "4:2:0" }).toFile(avifPath);
  await base.clone().webp({ quality: 76, effort: 6, smartSubsample: true }).toFile(webpPath);

  const [a, b] = await Promise.all([fs.stat(avifPath), fs.stat(webpPath)]);
  const h = Math.round((TRAIL_W / meta.width) * meta.height);
  trailReport.push({
    stem,
    srcDim: `${meta.width}x${meta.height}`,
    srcBytes: srcStat.size,
    outDim: `${TRAIL_W}x${h}`,
    avif: a.size,
    webp: b.size,
  });
}

console.log("\n=================== INTENT TRAIL PLATES ===================");
let tSrc = 0;
let tAvif = 0;
let tWebp = 0;
for (const r of trailReport) {
  tSrc += r.srcBytes;
  tAvif += r.avif;
  tWebp += r.webp;
  console.log(
    `${r.stem}  ${r.srcDim} ${kb(r.srcBytes).padStart(9)}  ->  ${r.outDim}` +
      `   AVIF ${kb(r.avif).padStart(8)}   WEBP ${kb(r.webp).padStart(8)}`,
  );
}
console.log(
  `\nSources (5 AVIF):       ${kb(tSrc)}` +
    `\nShipped trail (AVIF):   ${kb(tAvif)}   -${((1 - tAvif / tSrc) * 100).toFixed(1)}%` +
    `\nFallback (WEBP):        ${kb(tWebp)}\n`,
);
