import { useCallback, useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const DEG = Math.PI / 180;

/** Orthographic projection of a lat/lon onto the sphere, spun by `spin` degrees. */
function project(lat, lon, spin) {
  const phi = lat * DEG;
  const lambda = (lon + spin) * DEG;
  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.sin(lambda),
    y: Math.sin(phi),
    z: cosPhi * Math.cos(lambda), // > 0 == facing the viewer
  };
}

/** Meridians every 30°, parallels every 30° — built once, rotated per frame. */
function buildGraticule() {
  const lines = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 5) pts.push([lat, lon]);
    lines.push(pts);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 5) pts.push([lat, lon]);
    lines.push({ pts, equator: lat === 0 });
  }
  return lines.map((l) => (Array.isArray(l) ? { pts: l, equator: false } : l));
}

/**
 * Wireframe globe.
 *
 * React Bits ships a Globe, but it is a **React Bits Pro** component behind a
 * paid registry (`@reactbits-starter`), which this project has no licence for —
 * `npx shadcn add @reactbits-starter/globe-tw` fails with "Unknown registry".
 * The Pro one is also three-globe/Three.js based, which would have added ~600kB
 * to a bundle already over the Rollup warning threshold, and a shaded photo
 * globe is the wrong object for a site with no gradients and no shadows.
 *
 * So this is a 2D canvas graticule instead: hairlines on the front hemisphere,
 * square markers (zero radius, like everything else here), and one red marker
 * for whichever zone is active. It costs one canvas and ~800 projected points
 * a frame, shares `gsap.ticker` with Lenis + ScrollTrigger rather than opening
 * a second RAF loop, parks itself when scrolled out of view, and holds a fixed
 * readable angle under `prefers-reduced-motion`.
 */
export default function Globe({
  markers = [],
  activeIndex = -1,
  onActivate,
  className,
  speed = 3.2,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const spinRef = useRef(-20);
  const activeRef = useRef(activeIndex);
  const hitsRef = useRef([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width: w, height: h } = wrap.getBoundingClientRect();
    if (!w || !h) return;

    const size = Math.min(w, h);
    const R = size * 0.42;
    const cx = w / 2;
    const cy = h / 2;
    const spin = spinRef.current;

    ctx.clearRect(0, 0, w, h);

    // outline
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // graticule — front hemisphere only, so the sphere reads as solid
    for (const line of GRATICULE) {
      ctx.beginPath();
      ctx.strokeStyle = line.equator ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.11)";
      let drawing = false;
      for (const [lat, lon] of line.pts) {
        const p = project(lat, lon, spin);
        if (p.z <= 0) {
          drawing = false;
          continue;
        }
        const sx = cx + R * p.x;
        const sy = cy - R * p.y;
        if (drawing) ctx.lineTo(sx, sy);
        else {
          ctx.moveTo(sx, sy);
          drawing = true;
        }
      }
      ctx.stroke();
    }

    // markers
    const hits = [];
    markers.forEach((m, i) => {
      const p = project(m.lat, m.lon, spin);
      const sx = cx + R * p.x;
      const sy = cy - R * p.y;
      const front = p.z > 0;
      const active = i === activeRef.current;
      hits.push({ i, sx, sy, front });

      if (!front && !active) return;

      const s = active ? 9 : 5;
      ctx.globalAlpha = front ? 1 : 0.25;

      if (active) {
        // a ring pulls the eye to the row you are reading
        ctx.beginPath();
        ctx.arc(sx, sy, 16, 0, Math.PI * 2);
        ctx.strokeStyle = "#ff2d16";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = active ? "#ff2d16" : "rgba(255,255,255,0.75)";
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      ctx.globalAlpha = 1;
    });
    hitsRef.current = hits;
  }, [markers]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    if (prefersReducedMotion()) {
      return () => ro.disconnect();
    }

    let visible = false;
    let last = 0;
    const tick = (time) => {
      if (!visible) return;
      const dt = last ? Math.min((time - last) / 1000, 0.1) : 0.016;
      last = time;
      spinRef.current = (spinRef.current + speed * dt) % 360;
      draw();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        last = 0;
        if (visible) draw();
      },
      { rootMargin: "100px" },
    );
    io.observe(wrap);

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      ro.disconnect();
    };
  }, [draw, speed]);

  // Mirror the active index into a ref (the draw loop reads it without
  // re-subscribing) and repaint straight away, so the marker lights the moment
  // you touch a row even if the globe is parked off screen.
  useEffect(() => {
    activeRef.current = activeIndex;
    draw();
  }, [activeIndex, draw]);

  const handlePointer = (e) => {
    if (!onActivate) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = -1;
    let bestD = 26;
    for (const hit of hitsRef.current) {
      if (!hit.front) continue;
      const d = Math.hypot(hit.sx - px, hit.sy - py);
      if (d < bestD) {
        bestD = d;
        best = hit.i;
      }
    }
    if (best !== -1) onActivate(best);
  };

  return (
    <div ref={wrapRef} className={cn("relative aspect-square w-full", className)}>
      <canvas
        ref={canvasRef}
        className="block size-full"
        onPointerMove={handlePointer}
        aria-hidden="true"
      />
    </div>
  );
}

const GRATICULE = buildGraticule();
