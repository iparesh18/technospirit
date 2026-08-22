import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * WarpText — type rasterised to a texture and pushed through a refracting
 * warp shader, so the letterforms drift, bulge toward the cursor and split
 * into faint chromatic fringes at the edges.
 *
 * Origin: React Bits `WarpText` (`@react-bits/WarpText-JS-CSS`). As with every
 * other React Bits item in this project the shadcn CLI could not install it —
 * it parses the item's `.css` file as JavaScript and dies on
 * "Unexpected token (1:0)" after installing the dependencies but before
 * writing any files — so it was lifted from
 * https://reactbits.dev/r/WarpText-JS-CSS.json by hand. Its only dependency,
 * `ogl`, was already here for Aurora.
 *
 * The shader (fbm ambient drift, pointer lens/bulge, ripple ring, RGB split)
 * is upstream's, unchanged. What was rebuilt:
 *
 *  - It ran its own requestAnimationFrame loop. This site has exactly ONE
 *    frame loop — GSAP's ticker, which also drives Lenis — because a second
 *    RAF is what makes the pinned sections jitter. The loop is now a ticker
 *    callback, added only while the element is on screen and the tab is
 *    visible, and removed the moment either stops being true.
 *  - It shipped a global `.warp-text` class in a separate stylesheet. No
 *    global CSS: the container is styled from here and by the caller.
 *  - Its rasteriser always inset the type to 86% of the box width and centred
 *    it. That is fine for a hero paragraph and wrong for a wordmark that has
 *    to land exactly on both margins, so `fitWidth` / `fitHeight` are props.
 *    They default to upstream's 0.86 / 0.78 to preserve upstream behaviour;
 *    pass 1 for edge to edge.
 *  - The starting font size is now scaled UP as well as down. Upstream only
 *    ever shrank to fit (`Math.min(1, ...)`), so a size smaller than the box
 *    stayed small and the box kept dead space. Solving for the binding axis in
 *    both directions is what lets the caller hand over a nominal size and get
 *    a mark that fills its box, which is how the SVG `textLength` fit that
 *    this component replaced used to behave.
 *  - `role="img"` + `aria-label` are upstream's default and still are, but
 *    `ariaHidden` turns them off for callers that already expose the text to
 *    assistive tech some other way (the footer has an `.sr-only` span).
 *  - prefers-reduced-motion now comes from the project helper, and the ticker
 *    is never even started under it: a single frame is rendered and left
 *    alone, so the type is legible and completely still.
 *  - HOVER-GATED. Upstream distorted permanently: the fbm drift ran forever,
 *    the pointer position wandered on a sine when nothing was tracking it, the
 *    pointer term rested at 0.18 rather than 0, and the chromatic split had a
 *    0.35 floor that applied with the cursor nowhere near the element. The
 *    result had no undistorted state at all. There is now a single `uHover`
 *    amount, 0 at rest and 1 under the cursor, that every distortion channel
 *    is multiplied by, and the fragment shader returns the raw texture
 *    outright below 0.0005 — so at rest this is pixel-exact type, not type
 *    with the effect turned down low. The loop parks itself once it settles
 *    back to 0, so an un-hovered mark holds one static frame and occupies no
 *    ticker slot.
 *
 * Note on variable fonts: canvas 2D `ctx.font` accepts family/size/weight but
 * has no way to express `font-variation-settings`, so an axis other than
 * weight cannot be reached here. Archivo's `wdth` axis is therefore at its
 * default 100 in this component, and horizontal fit is achieved with tracking
 * and size instead of by condensing the glyphs.
 */

const vertex = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uFalloff;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uRipple;
uniform float uMotion;
uniform float uHover;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;

  // Fully at rest: hand back the rasterised texture untouched. Not an
  // optimisation — it is the guarantee that the resting mark is pixel-exact
  // type with no displacement and no colour fringe, rather than "distortion
  // that happens to be small".
  if (uHover < 0.0005) {
    fragColor = sampleText(uv);
    return;
  }

  float aspect = uResolution.x / max(uResolution.y, 1.0);

  // ── the localisation term ─────────────────────────────────────────────
  // Distance from the cursor, with x scaled by the aspect ratio so the
  // affected region is a true circle rather than an ellipse stretched across
  // a very wide element.
  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);

  // 1 under the cursor, 0 at the radius edge, smooth shoulder in between so
  // there is no hard circular seam. EVERY distortion channel below is
  // multiplied by this, which is what keeps the rest of the line untouched —
  // upstream applied its fbm drift across the whole quad, so hovering
  // anywhere rippled the entire word.
  float falloff = pow(smoothstep(radius, 0.0, dist), uFalloff) * uHover;

  // Outside the lens nothing moves, so skip the four-octave fbm entirely.
  // This is most of the surface most of the time.
  if (falloff < 0.0005) {
    fragColor = sampleText(uv);
    return;
  }

  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * uWarpStrength * 0.045 * uMotion * falloff;

  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = falloff;
  // A ring: zero at the centre, zero at the rim, peaking about a third of the
  // way out. That is what makes the lens read as a bulge rather than a smear.
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uHover;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = -dir * bulge * uPointerStrength * 0.045;
  pointerWarp += dir * rippleRing * bulge * uPointerStrength * 0.016;

  vec2 displaced = uv + ambient + pointerWarp;
  vec2 splitDir = ambient + pointerWarp;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  // Upstream's 0.35 floor kept a chromatic fringe on the type even with the
  // cursor nowhere near it; folding the falloff in confines the fringe to the
  // lens as well, so colour never leaks onto the untouched letters.
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65) * falloff;

  vec4 base = sampleText(displaced);
  float r = sampleText(displaced + split).r;
  float g = base.g;
  float b = sampleText(displaced - split).b;
  float a = max(max(sampleText(displaced + split).a, base.a), sampleText(displaced - split).a);

  vec3 color = vec3(r, g, b) + lens * base.a * 0.055;
  fragColor = vec4(color, a);
}
`;

const getFontValue = (value) => (typeof value === "number" ? `${value}px` : value);

const measureLine = (ctx, line, letterSpacing) => {
  const chars = Array.from(line);
  const textWidth = chars.reduce((width, char) => width + ctx.measureText(char).width, 0);
  return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
};

const drawLine = (ctx, line, x, y, letterSpacing) => {
  const chars = Array.from(line);
  let cursor = x - measureLine(ctx, line, letterSpacing) / 2;

  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
  });
};

const buildTextCanvas = ({ container, width, height, dpr, props }) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Resolve the caller's CSS-flavoured font props against the real cascade,
  // so `fontFamily: "inherit"` and clamp()-based sizes mean what they say.
  const probe = document.createElement("span");
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre",
    inset: "0 auto auto 0",
    fontFamily: props.fontFamily,
    fontSize: getFontValue(props.fontSize),
    fontWeight: String(props.fontWeight),
    letterSpacing: getFontValue(props.letterSpacing),
    lineHeight: typeof props.lineHeight === "number" ? String(props.lineHeight) : props.lineHeight,
  });
  container.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  let fontSizePx = parseFloat(computed.fontSize) || 96;
  const fontFamily = computed.fontFamily || "sans-serif";
  const fontWeight = computed.fontWeight || String(props.fontWeight);
  let letterSpacing = computed.letterSpacing === "normal" ? 0 : parseFloat(computed.letterSpacing) || 0;
  let lineHeight = parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    lineHeight = fontSizePx * (typeof props.lineHeight === "number" ? props.lineHeight : 0.92);
  }
  probe.remove();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = props.color;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const lines = String(props.text || "").split("\n");
  const applyFont = () => {
    ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  };
  applyFont();

  const maxWidth = width * props.fitWidth;
  const maxHeight = height * props.fitHeight;
  const widest = Math.max(...lines.map((line) => measureLine(ctx, line, letterSpacing)), 1);
  const blockHeight = Math.max(lineHeight * lines.length, 1);

  // Upstream clamped this with Math.min(1, …), i.e. shrink-only. Solving for
  // the binding axis in both directions means the caller can pass a nominal
  // size and still get a block that exactly fills the box on whichever axis
  // runs out first — which is what replaces the SVG textLength fit.
  const fit = Math.min(maxWidth / widest, maxHeight / blockHeight);

  if (Number.isFinite(fit) && fit > 0 && Math.abs(fit - 1) > 0.001) {
    fontSizePx *= fit;
    letterSpacing *= fit;
    lineHeight *= fit;
    applyFont();
  }

  // Close the last fraction of a pixel by tracking rather than by scaling, so
  // the glyphs keep their drawn weight. Only meaningful when width is the
  // binding axis; when height binds, `slack` is large and this is skipped.
  if (props.justify) {
    const natural = Math.max(...lines.map((line) => measureLine(ctx, line, letterSpacing)), 1);
    const longest = Math.max(...lines.map((line) => Array.from(line).length), 2);
    const slack = maxWidth - natural;
    if (slack > 0 && slack < maxWidth * 0.25) {
      letterSpacing += slack / (longest - 1);
    }
  }

  const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
  lines.forEach((line, index) =>
    drawLine(ctx, line, width / 2, startY + index * lineHeight, letterSpacing),
  );

  return canvas;
};

const syncUniforms = (program, props) => {
  const uniforms = program.uniforms;
  uniforms.uWarpStrength.value = props.warpStrength;
  uniforms.uWarpScale.value = props.warpScale;
  uniforms.uSpeed.value = props.speed;
  uniforms.uPointerInfluence.value = props.pointerInfluence;
  uniforms.uPointerStrength.value = props.pointerStrength;
  uniforms.uRefraction.value = props.refraction;
  uniforms.uRipple.value = props.ripple ? 1 : 0;
  uniforms.uFalloff.value = props.falloff;
};

const WarpText = ({
  text = "Bend the moment",
  color = "#f8f5ff",
  warpStrength = 0.08,
  warpScale = 1.7,
  speed = 0.55,
  pointerInfluence = 0.42,
  pointerStrength = 0.38,
  refraction = 0.018,
  ripple = true,
  fontSize = "clamp(3rem, 10vw, 9rem)",
  fontWeight = 800,
  fontFamily = "inherit",
  letterSpacing = "-0.06em",
  lineHeight = 0.9,
  /** fraction of the box the type is allowed to fill — 1 is edge to edge */
  fitWidth = 0.86,
  fitHeight = 0.78,
  /**
   * How fast the distortion takes hold under the cursor, and how fast it
   * lets go again — the per-frame fraction of the remaining distance closed.
   * Release is slower than attack so leaving the mark reads as the type
   * settling rather than the effect being switched off.
   */
  hoverAttack = 0.16,
  hoverRelease = 0.075,
  /**
   * Shape of the radial falloff at the edge of the lens, as an exponent on
   * the smoothstep. 1 is the plain smooth shoulder; higher values pull the
   * distortion tighter around the cursor and make the outer edge fade sooner.
   * There is no hard boundary at any value.
   */
  falloff = 1.35,
  /**
   * How hard the lens tracks the cursor, per frame. High on purpose: the
   * affected region is small, so any lag reads as the lens sliding off the
   * pointer rather than following it.
   */
  pointerTracking = 0.34,
  /** distribute any leftover width into tracking so the line lands on both margins */
  justify = false,
  /** hide from assistive tech; for callers that expose the text some other way */
  ariaHidden = false,
  className = "",
  style,
}) => {
  const containerRef = useRef(null);
  const propsRef = useRef(null);
  const contextRef = useRef(null);

  propsRef.current = {
    text,
    color,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
    fitWidth,
    fitHeight,
    justify,
    hoverAttack,
    hoverRelease,
    falloff,
    pointerTracking,
  };

  // Push prop changes into the live GL context without tearing it down.
  useEffect(() => {
    if (contextRef.current) {
      syncUniforms(contextRef.current.program, propsRef.current);
      contextRef.current.rasterize();
    }
  }, [
    text,
    color,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    warpStrength,
    warpScale,
    speed,
    pointerInfluence,
    pointerStrength,
    refraction,
    ripple,
    fitWidth,
    fitHeight,
    justify,
    falloff,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return undefined;

    let renderer;
    let gl;
    let program;
    let geometry;
    let mesh;
    let texture;
    let resizeObserver;
    let intersectionObserver;
    let disposed = false;
    let contextLost = false;
    let visible = true;
    let pageVisible = !document.hidden;
    let running = false;
    let reduceMotion = prefersReducedMotion();
    let rasterVersion = 0;

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, activeTarget: 0 };
    // 0 = the lens is absent, 1 = fully present. This is only the fade in/out
    // on enter and leave; WHERE the distortion lands is decided entirely by
    // the radial falloff in the shader, around uPointer.
    let hover = 0;
    const hoverAttack = propsRef.current.hoverAttack;
    const hoverRelease = propsRef.current.hoverRelease;
    const pointerTracking = propsRef.current.pointerTracking;

    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
      gl = renderer.gl;
    } catch {
      // `#version 300 es` is WebGL2-only. Fail soft to nothing rather than
      // throwing on a context we cannot get.
      return undefined;
    }

    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    texture = new Texture(gl, {
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    });

    geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTextTexture: { value: texture },
        uResolution: { value: new Float32Array([1, 1]) },
        uPointer: { value: new Float32Array([0.5, 0.5]) },
        uTime: { value: 0 },
        uFalloff: { value: propsRef.current.falloff },
        uWarpStrength: { value: propsRef.current.warpStrength },
        uWarpScale: { value: propsRef.current.warpScale },
        uSpeed: { value: propsRef.current.speed },
        uPointerInfluence: { value: propsRef.current.pointerInfluence },
        uPointerStrength: { value: propsRef.current.pointerStrength },
        uRefraction: { value: propsRef.current.refraction },
        uRipple: { value: propsRef.current.ripple ? 1 : 0 },
        uMotion: { value: reduceMotion ? 0 : 1 },
        uHover: { value: 0 },
      },
    });
    mesh = new Mesh(gl, { geometry, program });

    const renderOnce = () => {
      if (disposed || contextLost) return;
      renderer.render({ scene: mesh });
    };

    const rasterize = async () => {
      const version = ++rasterVersion;
      // The mark is a webfont at a large size; rasterising before it lands
      // would bake the fallback face into the texture.
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          /* fonts.ready can reject on a cancelled load; the draw below is
             still worth attempting with whatever face is available. */
        }
      }
      if (disposed || contextLost || version !== rasterVersion) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      texture.image = buildTextCanvas({
        container,
        width: rect.width,
        height: rect.height,
        dpr,
        props: propsRef.current,
      });
      texture.needsUpdate = true;
      renderOnce();
    };

    // ── the one frame loop ────────────────────────────────────────────
    // A gsap.ticker callback, not requestAnimationFrame. `time` is the
    // ticker's own clock in seconds, so this stays in step with Lenis and
    // ScrollTrigger instead of racing them.
    //
    // The mark is plain type until it is hovered. `hover` is the single 0..1
    // amount every distortion channel in the shader is multiplied by, and the
    // loop parks itself the moment it reaches 0 again, so a footer nobody is
    // pointing at costs one static frame and no ticker slot.
    const loop = (time) => {
      if (disposed || contextLost) return;

      const wanted = pointer.activeTarget;
      // Asymmetric on purpose: it should take hold quickly under the cursor
      // and recede more slowly, so leaving the mark reads as the type settling
      // rather than the effect being switched off.
      hover += (wanted - hover) * (wanted > hover ? hoverAttack : hoverRelease);

      // No idle wander. Upstream drifted the pointer around on a sine when it
      // was not being tracked, which is exactly the always-on movement this is
      // meant to stop; the position simply holds where the cursor left it.
      // Tracking is deliberately stiff — the lens is a small region and any
      // lag reads as it sliding off the cursor rather than following it.
      if (wanted > 0) {
        pointer.x += (pointer.tx - pointer.x) * pointerTracking;
        pointer.y += (pointer.ty - pointer.y) * pointerTracking;
      }

      program.uniforms.uPointer.value[0] = pointer.x;
      program.uniforms.uPointer.value[1] = pointer.y;
      program.uniforms.uTime.value = time;
      program.uniforms.uHover.value = hover;

      renderOnce();

      // Settled back to rest — snap the residue to exactly zero, draw the
      // clean frame once, and give up the ticker until the next hover.
      if (wanted === 0 && hover < 0.002) {
        hover = 0;
        program.uniforms.uHover.value = 0;
        renderOnce();
        stop();
      }
    };

    const start = () => {
      // Under reduced motion the shader is evaluated once and left there: the
      // type stays readable, nothing drifts, and no ticker slot is taken.
      if (running || disposed || contextLost || reduceMotion) return;
      running = true;
      gsap.ticker.add(loop);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      gsap.ticker.remove(loop);
    };
    // Only run frames when there is actually something to animate. Scrolling
    // the footer into view is not, by itself, a reason to start rendering —
    // the resting mark is a single static frame.
    const busy = () => pointer.activeTarget > 0 || hover > 0;
    const sync = () => {
      if (!visible || !pageVisible) {
        stop();
        return;
      }
      if (busy()) start();
      else {
        stop();
        renderOnce();
      }
    };

    const resize = () => {
      if (disposed || contextLost) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(rect.width, rect.height);
      program.uniforms.uResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.uResolution.value[1] = gl.drawingBufferHeight;
      rasterize();
    };

    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const first = pointer.activeTarget === 0;
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      // Entering from rest: put the lens under the cursor immediately rather
      // than sliding it in from wherever the pointer last left the mark.
      if (first && hover === 0) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
      pointer.activeTarget = 1;
      // The loop parks itself at rest, so hovering has to wake it.
      start();
    };

    const onPointerLeave = () => {
      pointer.activeTarget = 0;
      // Keep running just long enough to ease back down to plain type.
      start();
    };

    const onContextLost = (event) => {
      event.preventDefault();
      contextLost = true;
      stop();
    };

    const onVisibility = () => {
      pageVisible = !document.hidden;
      sync();
    };

    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onReducedMotion = (event) => {
      reduceMotion = event.matches;
      program.uniforms.uMotion.value = reduceMotion ? 0 : 1;
      if (reduceMotion) {
        // Drop straight back to plain type — uHover 0 is the clean state.
        stop();
        hover = 0;
        program.uniforms.uTime.value = 0;
        program.uniforms.uHover.value = 0;
      }
      renderOnce();
      sync();
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    document.addEventListener("visibilitychange", onVisibility);
    mediaQuery?.addEventListener("change", onReducedMotion);

    syncUniforms(program, propsRef.current);
    contextRef.current = { program, rasterize };
    resize();
    sync();

    return () => {
      disposed = true;
      contextRef.current = null;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);
      mediaQuery?.removeEventListener("change", onReducedMotion);

      if (!contextLost) {
        try {
          if (texture?.texture) gl.deleteTexture(texture.texture);
          geometry?.remove?.();
          program?.remove?.();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        } catch {
          /* the context may already be gone; nothing left to release */
        }
      }

      if (canvas.parentNode === container) container.removeChild(canvas);
    };
    // Built once. Every prop change is pushed through the effect above rather
    // than by tearing down and rebuilding the GL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative isolate block w-full overflow-hidden", className)}
      style={style}
      {...(ariaHidden ? { "aria-hidden": "true" } : { role: "img", "aria-label": text })}
    />
  );
};

export default WarpText;
