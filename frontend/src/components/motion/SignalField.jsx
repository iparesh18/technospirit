import { useCallback, useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Interactive background: a grid of squares that lights red and recoils from
 * the cursor.
 *
 * Origin: React Bits `DotGrid`. Reworked fairly heavily:
 *
 *  - It required gsap's InertiaPlugin and started a tween per dot per pointer
 *    burst. Hundreds of concurrent tweens is a lot of machinery for a
 *    background. The displacement is now computed inside the draw loop from a
 *    single smoothed pointer, so there are zero tweens and no extra plugin.
 *  - It registered a `click` listener on **window**, so clicking anything
 *    anywhere on the page fired a shockwave here. Gone — pointer input is
 *    scoped to this element.
 *  - It drew every frame forever, even scrolled far off screen. An
 *    IntersectionObserver parks it, and it also parks once the field has
 *    settled back to rest.
 *  - Circles became squares and the palette became ink/signal: this brand has
 *    zero border-radius, and a round dot grid reads as generic tech-startup.
 *  - Respects prefers-reduced-motion (renders the grid once, statically) and
 *    ignores touch input.
 *
 * INPUT DETECTION — do not reintroduce a `(pointer: fine)` media query here.
 * This used to decide at setup time whether the field was interactive by
 * asking `matchMedia("(pointer: fine)")`. That query reports on the *primary*
 * pointer, and a Windows laptop with a touchscreen answers `false` even with a
 * mouse attached and in use, which left the grid drawn but permanently inert —
 * no error, no console warning, just a dead background. Capability is now
 * inferred from real events: the field goes live on the first `pointermove`
 * that is not a touch. Until then it costs nothing at all, because the ticker
 * callback is not even registered.
 */
export default function SignalField({
  className,
  dot = 3,
  gap = 34,
  baseColor = "rgba(255,255,255,0.16)",
  activeColor = "#ff2d16",
  proximity = 190,
  push = 16,
  /**
   * Pointer follow smoothing, 0..1 — the fraction of the remaining distance
   * closed per frame. The old hard-coded 0.12 left the lit patch trailing the
   * cursor by a visible beat; 0.32 keeps it under the pointer while still
   * easing rather than teleporting.
   */
  lerp = 0.32,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dotsRef = useRef([]);
  const pointer = useRef({ x: -9999, y: -9999, tx: -9999, ty: -9999 });

  const build = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    if (width === 0 || height === 0) return;

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

    const cell = dot + gap;
    const cols = Math.max(1, Math.floor((width + gap) / cell));
    const rows = Math.max(1, Math.floor((height + gap) / cell));
    const offsetX = (width - (cell * cols - gap)) / 2;
    const offsetY = (height - (cell * rows - gap)) / 2;

    const dots = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        dots.push({ x: offsetX + c * cell, y: offsetY + r * cell });
      }
    }
    dotsRef.current = dots;
  }, [dot, gap]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    build();

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduced = prefersReducedMotion();

    const draw = () => {
      const { width, height } = canvas;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.clearRect(0, 0, width / dpr, height / dpr);

      const { x: px, y: py } = pointer.current;
      const dots = dotsRef.current;

      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        const dx = d.x - px;
        const dy = d.y - py;
        const dist = Math.hypot(dx, dy);
        const t = dist < proximity ? 1 - dist / proximity : 0;

        if (t === 0) {
          ctx.fillStyle = baseColor;
          ctx.fillRect(d.x, d.y, dot, dot);
          continue;
        }

        // smoothstep so the falloff has a soft shoulder, not a linear cone
        const p = t * t * (3 - 2 * t);
        const nx = dist > 0.01 ? dx / dist : 0;
        const ny = dist > 0.01 ? dy / dist : 0;
        const size = dot + p * dot * 2.2;

        ctx.fillStyle = p > 0.55 ? activeColor : baseColor;
        ctx.globalAlpha = 0.16 + p * 0.84;
        ctx.fillRect(
          d.x + nx * push * p - (size - dot) / 2,
          d.y + ny * push * p - (size - dot) / 2,
          size,
          size,
        );
        ctx.globalAlpha = 1;
      }
    };

    if (reduced) {
      draw();
      const roStatic = new ResizeObserver(() => {
        build();
        draw();
      });
      roStatic.observe(wrap);
      return () => roStatic.disconnect();
    }

    let visible = false;
    let settled = false;
    let live = false;

    const tick = () => {
      if (!visible) return;

      const p = pointer.current;
      p.x += (p.tx - p.x) * lerp;
      p.y += (p.ty - p.y) * lerp;

      const atRest =
        Math.abs(p.tx - p.x) < 0.4 &&
        Math.abs(p.ty - p.y) < 0.4 &&
        (p.tx < -1000 || p.ty < -1000);

      if (atRest && settled) return;
      draw();
      settled = atRest;
    };

    const onMove = (e) => {
      // A finger dragging over the section is not a hover; it would light a
      // patch and leave it stranded when the contact ends.
      if (e.pointerType === "touch") return;

      // First real pointing device seen — only now does the field need a slot
      // on the shared ticker.
      if (!live) {
        live = true;
        gsap.ticker.add(tick);
      }

      const rect = canvas.getBoundingClientRect();
      const first = pointer.current.tx < -1000;
      pointer.current.tx = e.clientX - rect.left;
      pointer.current.ty = e.clientY - rect.top;
      // Snap on the first reading instead of easing in from the off-canvas
      // sentinel, which would otherwise drag a bright wave across the whole
      // grid before settling under the cursor.
      if (first) {
        pointer.current.x = pointer.current.tx;
        pointer.current.y = pointer.current.ty;
      }
      settled = false;
    };
    const onLeave = () => {
      pointer.current.tx = -9999;
      pointer.current.ty = -9999;
      settled = false;
    };

    // The canvas sits behind the section content and is pointer-events:none,
    // so it would never see a move event itself — listen on the section that
    // owns it instead.
    const host = wrap.parentElement ?? wrap;
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          settled = false;
          draw();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      build();
      settled = false;
      draw();
    });
    ro.observe(wrap);

    draw();

    return () => {
      if (live) gsap.ticker.remove(tick);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [build, dot, proximity, push, baseColor, activeColor, lerp]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
