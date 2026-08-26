import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import useWorldClock from "@/hooks/useWorldClock";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { index: "01", label: "Home", to: "/" },
  { index: "02", label: "About", to: "/about" },
  { index: "03", label: "Services", to: "/services" },
  { index: "04", label: "Capabilities", to: "/capabilities" },
  { index: "05", label: "Why Us", to: "/why-us" },
  { index: "06", label: "Contact", to: "/contact" },
];

/* -------------------------------------------------------------------------- */
/*  Desktop link — index number slides in, label lifts, red rule draws under   */
/* -------------------------------------------------------------------------- */
function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      data-cursor="open"
      className={({ isActive }) =>
        cn(
          "group/nav relative flex items-baseline gap-2 py-2 transition-colors duration-300",
          isActive ? "text-[var(--fg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "ts-label text-[0.6rem] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isActive
                ? "text-signal opacity-100"
                : "opacity-0 -translate-x-1 group-hover/nav:translate-x-0 group-hover/nav:opacity-100",
            )}
            aria-hidden="true"
          >
            {item.index}
          </span>

          {/* rollover: the label lifts out and an identical one rides in */}
          <span className="ts-label relative block overflow-hidden text-[0.7rem]">
            <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/nav:-translate-y-full">
              {item.label}
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/nav:translate-y-0"
            >
              {item.label}
            </span>
          </span>

          <span
            aria-hidden="true"
            className={cn(
              "absolute -bottom-0.5 left-0 h-px w-full bg-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isActive
                ? "scale-x-100"
                : "origin-right scale-x-0 group-hover/nav:origin-left group-hover/nav:scale-x-100",
            )}
          />
        </>
      )}
    </NavLink>
  );
}

/* -------------------------------------------------------------------------- */
/*  Full-bleed mobile menu — Radix Dialog primitive, completely re-skinned     */
/* -------------------------------------------------------------------------- */
function MobileMenu({ open, onOpenChange }) {
  const clocks = useWorldClock();

  /**
   * The open sequence is entirely CSS — see .ts-menu-sheet in index.css.
   *
   * It was a GSAP timeline, keyed on `open`, and it never ran once: <Portal>
   * renders null until its own layout effect flips an internal "mounted" flag,
   * so on the commit where `open` turns true the panel is not in the document
   * yet, and the commit that does mount it doesn't change `open`.
   *
   * Keying off the node instead fixed that but exposed a second, worse problem
   * — GSAP's clock and the sheet's CSS clock don't start together, so the
   * stagger drifted against the sheet by the cost of the mount. Both on CSS
   * keyframes is the version that actually stays in sync.
   */

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ts-menu-veil fixed inset-0 z-[90] bg-black/40" />
        <DialogPrimitive.Content
          data-zone="ink"
          className="ts-menu-sheet fixed inset-0 z-[95] flex flex-col bg-black text-white outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Site navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Primary navigation links for TechnoSpirit.
          </DialogPrimitive.Description>

          {/* header row */}
          <div className="flex items-center justify-between border-b border-white/16 px-5 py-5">
            <span className="ts-label text-white/60">
              <span className="text-signal">●</span> MENU / OPEN
            </span>
            <DialogPrimitive.Close className="ts-label border border-white/25 px-4 py-2.5 text-white transition-colors duration-300 hover:border-signal hover:bg-signal">
              CLOSE
            </DialogPrimitive.Close>
          </div>

          {/* nav rows */}
          <nav className="flex-1 overflow-y-auto" aria-label="Mobile">
            {NAV_ITEMS.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => onOpenChange(false)}
                style={{ "--i": i }}
                className="group/row flex items-center justify-between border-b border-white/16 px-5 py-6 transition-colors duration-200 active:bg-signal"
              >
                <span className="ts-mask flex items-baseline gap-3" data-menu-row>
                  <span className="ts-display block text-[clamp(2.4rem,13vw,4.5rem)] text-white">
                    {item.label}
                  </span>
                </span>
                <span className="ts-label text-signal" data-menu-index>
                  {item.index}
                </span>
              </Link>
            ))}

            <Link
              to="/contact"
              onClick={() => onOpenChange(false)}
              data-menu-cta
              className="flex items-center justify-between border-b border-white/16 bg-signal px-5 py-6 text-white"
            >
              <span className="ts-label text-[0.72rem]">START A PROJECT</span>
              <ArrowUpRight className="size-5" strokeWidth={1.75} />
            </Link>
          </nav>

          {/* world clock strip */}
          <div className="grid grid-cols-3 border-t border-white/16">
            {clocks.slice(0, 6).map((z, i) => (
              <div
                key={z.code}
                data-menu-meta
                style={{ "--i": i }}
                className="border-r border-b border-white/10 px-4 py-3 last:border-r-0"
              >
                <div className="ts-label text-white/45">{z.code}</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-white">{z.time}</div>
              </div>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/*  Nav shell                                                                  */
/* -------------------------------------------------------------------------- */
export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [onInk, setOnInk] = useState(false);
  const header = useRef(null);
  const location = useLocation();

  // close the menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // condense after the first viewport, and invert over black grounds
  useGSAP(
    () => {
      const condenseTrigger = ScrollTrigger.create({
        start: "top -80",
        end: 99999,
        onToggle: (self) => setCondensed(self.isActive),
      });

      /**
       * Rather than predicting which section owns the top of the viewport with
       * per-section triggers — which desynchronise as soon as a pinned section
       * sits in the chain, and race each other at every boundary — hit-test
       * what is genuinely rendered just below the bar and read its zone.
       * Exact by construction, and immune to pinning and reordering.
       */
      let lastZone = null;
      const sampleZone = () => {
        const bar = header.current;
        if (!bar) return;
        // Sample *through* the bar: take the topmost element at the bar's own
        // midline that isn't part of the bar. Sampling below the bar instead
        // would couple this to the bar's height, and any section whose top
        // band is a different colour from its body would flicker.
        const stack = document.elementsFromPoint(window.innerWidth / 2, 28);
        const el = stack.find((node) => node !== bar && !bar.contains(node));
        const zone = el?.closest("[data-zone]")?.dataset.zone ?? "paper";
        if (zone !== lastZone) {
          lastZone = zone;
          setOnInk(zone === "ink");
        }
      };

      sampleZone();
      ScrollTrigger.addEventListener("refresh", sampleZone);
      // ScrollTrigger.update runs on every Lenis frame; piggyback on it so we
      // don't add a second scroll listener.
      const sampler = ScrollTrigger.create({
        start: 0,
        end: 99999,
        onUpdate: sampleZone,
      });

      // The scroll-driven sample alone is one beat too early when a pinned
      // section engages: ScrollTrigger fires onUpdate, *then* applies the pin,
      // which changes what is painted under the bar. If the user stops
      // scrolling on that frame — which is exactly what happens when you flick
      // to the horizontal act and let go — the bar keeps the pre-pin zone and
      // sits there as a white slab on black. A cheap ticker sample every
      // fourth frame catches any layout change the scroll pass missed.
      let frame = 0;
      const settle = () => {
        frame += 1;
        if (frame % 4 === 0) sampleZone();
      };
      gsap.ticker.add(settle);

      return () => {
        condenseTrigger.kill();
        sampler.kill();
        gsap.ticker.remove(settle);
        ScrollTrigger.removeEventListener("refresh", sampleZone);
      };
    },
    // revertOnUpdate is not optional here.
    //
    // useGSAP only wires its cleanup to the *unmount* when a non-empty
    // dependency array is given — on a dependency change it re-runs the
    // callback into the same context without reverting first. <Nav> never
    // unmounts, so every route change was stacking another pair of
    // ScrollTriggers, another gsap.ticker callback and another "refresh"
    // listener on top of the last set, and the hit-test below ran once more
    // per frame for the rest of the session. revertOnUpdate makes the context
    // tear down before it rebuilds, which is what the returned cleanup was
    // always written to expect.
    { dependencies: [location.pathname], revertOnUpdate: true },
  );

  return (
    <>
      <a href="#main" className="ts-skip-link ts-label bg-signal px-4 py-3 text-white">
        Skip to content
      </a>

      <header
        ref={header}
        data-zone={onInk ? "ink" : "paper"}
        className={cn(
          "fixed inset-x-0 top-0 z-[80] transition-[background-color,border-color,padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          condensed
            ? "border-b border-[var(--line)] bg-[var(--bg)]/92 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--bg)]/80"
            : "border-b border-transparent py-6",
          onInk ? "text-white" : "text-black",
        )}
      >
        <div className="ts-shell flex items-center justify-between gap-6">
          {/* wordmark */}
          <Link
            to="/"
            data-cursor="open"
            aria-label="TechnoSpirit — home"
            className="group/mark flex items-center gap-2.5"
          >
            <span
              className={cn(
                "block bg-signal transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                condensed ? "size-1.5" : "size-2",
              )}
              aria-hidden="true"
            />
            <span className="ts-display-wide relative block overflow-hidden text-[0.95rem] leading-none sm:text-[1.05rem]">
              <span className="block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/mark:-translate-y-full">
                TECHNOSPIRIT
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 block translate-y-full text-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/mark:translate-y-0"
              >
                TECHNOSPIRIT
              </span>
            </span>
          </Link>

          {/* desktop links */}
          <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/contact"
              data-cursor="start"
              className="group/start relative hidden overflow-hidden border border-current px-5 py-3 md:block"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 origin-bottom scale-y-0 bg-signal transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/start:scale-y-100"
              />
              <span className="ts-label relative z-10 flex items-center gap-2 text-[0.66rem] transition-colors duration-300 group-hover/start:text-white">
                START A PROJECT
                <ArrowUpRight className="size-3.5" strokeWidth={2} />
              </span>
            </Link>

            {/* word-label menu button, not a hamburger icon */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation menu"
              className="ts-label relative border border-current px-4 py-3 text-[0.66rem] transition-colors duration-300 hover:bg-signal hover:text-white lg:hidden"
            >
              MENU
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
