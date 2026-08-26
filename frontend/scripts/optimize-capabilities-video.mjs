/**
 * /capabilities — video optimisation.
 *
 *   node scripts/optimize-capabilities-video.mjs
 *
 * All three sources arrive identical: 1280x720, H.264 High L3.1, yuv420p,
 * 24fps, 240 frames, 10.006s, with a 128kbps stereo AAC track nobody hears —
 * and, critically, **exactly one keyframe each**. The whole ten seconds is a
 * single GOP.
 *
 * That one fact splits the three files into two completely different jobs,
 * because it only hurts a file that gets seeked:
 *
 *   SNEAKERS (raw + refined) are PLAYED. A decoder that starts at frame 0 and
 *   runs forward never pays for a long GOP, so these are re-encoded purely for
 *   weight — with a 1s GOP kept only so the drift corrector's occasional
 *   currentTime write stays cheap.
 *
 *   AIRCRAFT is SCRUBBED, forwards and backwards, one seek per animation
 *   frame. With a 10s GOP every backward step costs a decode from frame 0, and
 *   /lab already proved where that ends: the only way out was decoding the
 *   whole file to ~833MB of ImageBitmaps behind a 2.6-6.5s gate. So it is
 *   re-encoded ALL-INTRA (-g 1). Every frame becomes a keyframe, every seek
 *   costs exactly one frame decode, and reverse scrubbing costs the same as
 *   forward. That buys back the entire WebCodecs path, the memory, and the
 *   prepare gate.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * THE AIRCRAFT QUALITY INVESTIGATION
 *
 * The aircraft looked soft. It was, and the cause was not the resolution, the
 * upscale, the poster, ScrollyVideo (this page does not use it), or the source.
 * It was THIS FILE: all-intra was the right call and CRF 28 was the wrong
 * number to pay for it.
 *
 * All-intra throws away every bit of temporal prediction. On this footage —
 * a slowly rotating airframe on a plain studio ground, where consecutive
 * frames are nearly identical — that is most of the compression available, so
 * the encoder has to spend far more per frame to hold the same quality. CRF 28
 * was chosen to keep the file near the source's size, and what it actually
 * bought was a 3.43 MB file that measured 38.10 dB PSNR-Y against the source.
 * The source itself is 2,575 kbps IPPP; the all-intra encode at 2,879 kbps was
 * spending MORE bits for a visibly worse picture.
 *
 * MEASURED, 240 frames, PSNR-Y / SSIM-Y against the delogo'd source, and
 * browser seek latency in headless Chromium (software decode, so every seek
 * number is a worst case — hardware decode is strictly faster):
 *
 *   g=1  CRF 28  3.43 MB   38.10 dB  0.9754   seek p50 14 ms   worst 49 ms  <- was
 *   g=1  CRF 22  5.68 MB   41.65 dB  0.9866   seek p50 19 ms   worst 35 ms
 *   g=1  CRF 21  6.27 MB   42.37 dB  0.9882   seek p50 20 ms   worst 46 ms  <- is
 *   g=1  CRF 20  6.86 MB   43.05 dB  0.9894   seek p50 21 ms   worst 46 ms
 *   g=1  CRF 16 10.83 MB   46.28 dB  0.9934   seek p50 25 ms   worst 74 ms
 *   g=2  CRF 22  5.04 MB   44.05 dB  0.9910   seek p50 28 ms   worst 62 ms
 *   g=4  CRF 19  5.06 MB   46.02 dB  0.9934   seek p50 39 ms   worst 135 ms
 *   g=8  CRF 19  3.99 MB   46.60 dB  0.9938   seek p50 39 ms   worst 117 ms
 *   g=12 CRF 19  3.67 MB   46.91 dB  0.9940   seek p50 44 ms   worst 113 ms
 *
 * The bottom half of that table is the tempting half and it is a trap. A GOP
 * of 8 measures BETTER than all-intra at CRF 16 and costs a third of the
 * bytes — but it triples the seek and quadruples the worst case, and this
 * file is seeked once per animation frame in both directions. At 60 Hz a frame
 * is 16.7 ms; a 39 ms median seek is the picture running two and a half frames
 * behind the scroll on every step, and a 135 ms worst case is the settling
 * this page exists to not have. Quality that is only available at the cost of
 * the interaction is not available.
 *
 * So: all-intra stays, and CRF goes 28 -> 21. That is +2.84 MB for +4.27 dB
 * and, on the zoomed crops, the return of the truss struts, the cabling and
 * the placards that CRF 28 had smeared. The worst-case seek is 46 ms against
 * the old file's 49 ms — the scrub is not paying for any of it.
 *
 * WHAT IS NOT FIXABLE HERE: the source is 1280x720 and there is no larger
 * master. The stage is full-bleed, so the picture is upscaled 1.25x at
 * 1440x900 and up to 2.5x on a 2x display, and no encode creates detail that
 * was never shot. Encoding a 1080p or 1440p derivative would only move the
 * resampling from the browser's scaler to ffmpeg's at three times the bitrate;
 * it was not done, and the softness that remains at 100% zoom is the source's.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * No WebM. Both jobs depend on hardware decode — the aircraft for 60fps
 * seeking, the sneakers for running two streams at once — and H.264 is the one
 * codec guaranteed to get it on every target. Offering a VP9 alternative would
 * risk a browser choosing a software-decoded path for a page whose whole
 * premise is that it never drops a frame.
 */
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "public";
const OUT = "public/capabilities/optimized";
fs.mkdirSync(OUT, { recursive: true });

/** Generator watermark box, identical across all three sources. */
const WATERMARK = { x: 1130, y: 568, w: 64, h: 64 };

const JOBS = [
  {
    src: "raw-shoe.mp4",
    out: "sneaker-raw.mp4",
    poster: "sneaker-raw-poster",
    // 1s GOP: never seeked in normal operation, but the sync corrector may
    // write currentTime, and 24 frames is a cheap worst case for that.
    g: 24,
    crf: 22,
    note: "playback",
  },
  {
    src: "polished-shoe.mp4",
    out: "sneaker-refined.mp4",
    poster: "sneaker-refined-poster",
    g: 24,
    crf: 22,
    note: "playback",
  },
  {
    src: "aircraft-video.mp4",
    out: "aircraft.mp4",
    poster: "aircraft-poster",
    // ALL-INTRA. This is the load-bearing decision on this page.
    g: 1,
    // CRF 21, up from 28 — see THE AIRCRAFT QUALITY INVESTIGATION above.
    crf: 21,
    /**
     * `aq-mode=3` biases bits toward the darker regions of each frame, which on
     * this footage is the airframe itself sitting on a near-white studio
     * ground; the default mode 1 spends them evenly and leaves the smooth
     * ground looking better than the subject. `aq-strength` is nudged up for
     * the same reason.
     *
     * `deblock=-1,-1` weakens the in-loop deblocking filter by one step on
     * both axes. It costs a little PSNR by definition — the filter exists to
     * raise it — and buys back edge acuity on the trusses and cabling, which
     * is the thing that actually reads as "sharp" on a picture the page then
     * upscales 1.25x to 2.5x to fill the stage. Measured both ways: 41.65 dB
     * without, 41.70 dB with, at the same CRF, and visibly crisper struts.
     */
    params: "aq-mode=3:aq-strength=0.9:deblock=-1,-1",
    preset: "veryslow",
    note: "scrub (all-intra)",
  },
];

function probe(p) {
  const j = JSON.parse(
    execFileSync(ffprobe.path, ["-v","error","-print_format","json","-show_format","-show_streams",p], {
      encoding: "utf8", maxBuffer: 1 << 24,
    }),
  );
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  const csv = execFileSync(ffprobe.path, [
    "-v","error","-select_streams","v:0",
    "-show_entries","packet=pts_time,flags","-print_format","csv=p=0", p,
  ], { encoding: "utf8", maxBuffer: 1 << 26 });
  const rows = csv.trim().split("\n");
  const keys = rows.filter((r) => (r.split(",")[1] || "").startsWith("K")).map((r) => parseFloat(r));
  const gaps = keys.slice(1).map((t, i) => t - keys[i]);
  return {
    bytes: fs.statSync(p).size,
    dim: `${v.width}x${v.height}`,
    codec: v.codec_name,
    profile: v.profile,
    fps: v.avg_frame_rate,
    frames: rows.length,
    dur: +j.format.duration,
    kbps: Math.round(j.format.bit_rate / 1000),
    audio: a ? `${a.codec_name} ${Math.round(a.bit_rate / 1000)}kbps` : "none",
    keys: keys.length,
    maxGop: gaps.length ? Math.max(...gaps) : +j.format.duration,
  };
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const rows = [];

for (const job of JOBS) {
  const src = path.join(SRC, job.src);
  const out = path.join(OUT, job.out);

  execFileSync(ffmpeg, [
    "-y", "-i", src,
    "-an",                                   // no audio track anywhere on this page
    // All three sources carry the same generator's four-point sparkle at
    // (1161, 600), ~44px across. Every instance of it sits on plain studio
    // falloff, so `delogo` interpolates it out of the border pixels with
    // nothing left behind — verified frame by frame. Applied before the
    // encode so the mark is never carried into a keyframe.
    "-vf", `delogo=x=${WATERMARK.x}:y=${WATERMARK.y}:w=${WATERMARK.w}:h=${WATERMARK.h}`,
    "-c:v", "libx264",
    "-preset", job.preset ?? "slower",
    "-crf", String(job.crf),
    "-pix_fmt", "yuv420p",                   // hardware-decodable everywhere
    "-profile:v", "high",
    "-g", String(job.g),
    "-keyint_min", String(job.g),
    "-sc_threshold", "0",                    // regular GOP, so seek cost is predictable
    ...(job.params ? ["-x264-params", job.params] : []),
    "-movflags", "+faststart",               // moov first: playable from the first bytes
    out,
  ], { stdio: "ignore" });

  // Poster: frame 0, at native size, in both modern formats. Nothing on this
  // page is ever allowed to present an empty stage.
  const tmpPng = path.join(OUT, `${job.poster}.png`);
  execFileSync(ffmpeg, ["-y","-i",out,"-vframes","1","-f","image2",tmpPng], { stdio: "ignore" });
  await sharp(tmpPng).avif({ quality: 60, effort: 9 }).toFile(path.join(OUT, `${job.poster}.avif`));
  await sharp(tmpPng).webp({ quality: 80, effort: 6 }).toFile(path.join(OUT, `${job.poster}.webp`));
  fs.unlinkSync(tmpPng);

  rows.push({ job, before: probe(src), after: probe(out),
    posterAvif: fs.statSync(path.join(OUT, `${job.poster}.avif`)).size,
    posterWebp: fs.statSync(path.join(OUT, `${job.poster}.webp`)).size });
}

console.log("\n======================= VIDEO OPTIMISATION =======================");
let bTotal = 0, aTotal = 0;
for (const { job, before, after, posterAvif, posterWebp } of rows) {
  bTotal += before.bytes;
  aTotal += after.bytes;
  console.log(`\n${job.src}  ->  capabilities/optimized/${job.out}   [${job.note}]`);
  console.log(`  BEFORE  ${before.dim} ${before.codec}/${before.profile} ${before.fps}fps ${before.frames}f ${before.dur.toFixed(3)}s`);
  console.log(`          ${mb(before.bytes)}  ${before.kbps} kbps  audio=${before.audio}`);
  console.log(`          keyframes=${before.keys}  max GOP=${before.maxGop.toFixed(3)}s (${Math.round(before.maxGop * 24)} frames)`);
  console.log(`  AFTER   ${after.dim} ${after.codec}/${after.profile} ${after.fps}fps ${after.frames}f ${after.dur.toFixed(3)}s`);
  console.log(`          ${mb(after.bytes)}  ${after.kbps} kbps  audio=${after.audio}  faststart=yes`);
  console.log(`          keyframes=${after.keys}  max GOP=${after.maxGop.toFixed(3)}s (${Math.round(after.maxGop * 24)} frames)`);
  console.log(`          delta ${((after.bytes / before.bytes - 1) * 100).toFixed(1)}%   seek cost ${(before.maxGop / after.maxGop).toFixed(0)}x cheaper`);
  console.log(`  POSTER  ${(posterAvif / 1024).toFixed(1)} KB avif / ${(posterWebp / 1024).toFixed(1)} KB webp`);
}
console.log(`\nVIDEO TOTAL  ${mb(bTotal)}  ->  ${mb(aTotal)}   ${((aTotal / bTotal - 1) * 100).toFixed(1)}%\n`);
