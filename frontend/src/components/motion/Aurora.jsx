import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Aurora — atmospheric light entering from the top edge.
 *
 * Origin: React Bits `Aurora` (`@react-bits/Aurora-JS-CSS`). The shadcn CLI
 * still cannot install a React Bits item that ships a `.css` file (it parses
 * the stylesheet as JS and dies on "Unexpected token (1:0)"), so the shader was
 * lifted from the registry JSON by hand. Its one dependency, `ogl`, was already
 * in the project.
 *
 * The noise field and colour ramp are upstream's, unchanged — they are the
 * reason it looks like an aurora rather than a gradient. Note that no
 * inversion was needed to make the light come from the top: `gl_FragCoord.y`
 * is zero at the *bottom* in GL, and `intensity` scales with `uv.y`, so the
 * band is already brightest along the top edge and dies out downward. That is
 * the whole brief, for free.
 *
 * Everything around the shader was rebuilt:
 *
 *  - It ran its own requestAnimationFrame loop. This site has exactly one
 *    frame loop — GSAP's ticker, which also drives Lenis — because two loops
 *    is what makes pinned sections jitter.
 *  - It re-parsed every colour stop from hex and rewrote all five uniforms on
 *    **every frame**. They are written once now; only `uTime` moves.
 *  - It rendered forever whether on screen or not. An IntersectionObserver
 *    parks it, so the rest of the page costs nothing.
 *  - Default stops were `#5227FF` violet into `#7cff67` green. This palette is
 *    black, white and one red, so the ramp runs deep ember → signal → ember.
 *  - No reduced-motion path: it now renders a single frame at a fixed time and
 *    stops. The light is still there, it just holds still.
 *  - `window.addEventListener("resize")` → ResizeObserver on its own box, so
 *    it tracks the footer rather than the viewport.
 *  - `#version 300 es` is WebGL2-only; it fails soft to nothing instead of
 *    throwing on a context it cannot get.
 *  - The global `.aurora-container` class is gone. The CSS file was never
 *    installed.
 *
 * Containment is the caller's job and is not optional: this renders a canvas
 * at `absolute inset-0`, so the parent must be `relative` + `overflow-hidden`.
 * `fade` additionally masks the bottom of the canvas to transparent, which is
 * what keeps the light off the footer's small copy.
 */

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

export default function Aurora({
  /** left → centre → right of the ramp. Ember, signal, ember. No third hue. */
  colorStops = ["#2a0704", "#ff2d16", "#5c1008"],
  amplitude = 1.05,
  blend = 0.62,
  speed = 0.5,
  /** mask the lower part of the canvas out, so copy underneath stays readable */
  fade = "linear-gradient(to bottom, #000 0%, #000 20%, rgba(0,0,0,0.30) 58%, transparent 88%)",
  className,
}) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        webgl: 2,
      });
    } catch {
      return undefined; // no WebGL2 — the footer is simply black, which is fine
    }

    const gl = renderer.gl;
    if (
      !gl ||
      typeof WebGL2RenderingContext === "undefined" ||
      !(gl instanceof WebGL2RenderingContext)
    ) {
      return undefined;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    // Parsed once. Upstream did this per frame, for every stop.
    const stops = colorStops.map((hex) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: stops },
        uResolution: { value: [host.offsetWidth, host.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    host.appendChild(gl.canvas);

    const resize = () => {
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w, h];
      renderer.render({ scene: mesh });
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const teardown = () => {
      ro.disconnect();
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };

    if (prefersReducedMotion()) {
      program.uniforms.uTime.value = 3.6;
      renderer.render({ scene: mesh });
      return teardown;
    }

    let visible = false;
    const tick = (time) => {
      if (!visible) return;
      program.uniforms.uTime.value = time * 0.001 * speed;
      renderer.render({ scene: mesh });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) resize();
      },
      { rootMargin: "150px" },
    );
    io.observe(host);

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      teardown();
    };
    // Uniforms are written once by design; changing a knob remounts the shader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 [&>canvas]:block [&>canvas]:size-full",
        className,
      )}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    />
  );
}
