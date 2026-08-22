import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import SmoothScroll from "@/components/layout/SmoothScroll";
import RouteTransition from "@/components/layout/RouteTransition";
import Cursor from "@/components/layout/Cursor";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import { ScrollTrigger } from "@/lib/gsap";

import Home from "@/pages/Home";

// Home is imported eagerly: it is the landing route, and its hero owns the
// first paint — putting it behind a dynamic import would add a request
// round-trip in front of the LCP element for no benefit. The other four routes
// are split out, which is what takes the entry chunk under Rollup's 500 kB
// warning. Their load is invisible in practice because <RouteTransition>
// covers the screen for ~0.9s on every navigation, and because warmRoutes()
// below has usually already fetched them during idle time.
const About = lazy(() => import("@/pages/About"));
const Services = lazy(() => import("@/pages/Services"));
const WhyUs = lazy(() => import("@/pages/WhyUs"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Pulls the split route chunks into the module cache once the browser is idle,
 * so a navigation never has to wait on the network behind the wipe. Fetch
 * failures are swallowed deliberately: this is an optimisation, and the real
 * import inside <Suspense> is still there to surface a genuine problem.
 */
function warmRoutes() {
  const warm = () => {
    import("@/pages/About").catch(() => {});
    import("@/pages/Services").catch(() => {});
    import("@/pages/WhyUs").catch(() => {});
  };

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(warm, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(warm, 2000);
  return () => window.clearTimeout(id);
}

/**
 * Recalculates every ScrollTrigger once the new route's DOM and webfonts have
 * settled. Without this, pinned sections measure against the previous page.
 *
 * This lives *inside* the route <Suspense> boundary on purpose. React detaches
 * the effects of a suspended boundary's children and re-runs them when the
 * boundary reveals, so mounting it here ties the refresh to the moment the
 * lazy chunk has actually rendered — not to the moment the URL changed, which
 * on a cold chunk is several hundred milliseconds too early.
 */
function ScrollSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    const settle = setTimeout(() => ScrollTrigger.refresh(), 320);

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [pathname]);

  return null;
}

export default function App() {
  useEffect(warmRoutes, []);

  return (
    <BrowserRouter>
      <SmoothScroll>
        <Cursor />
        <RouteTransition />
        <div className="ts-grain-layer" aria-hidden="true" />

        <Nav />

        <main id="main">
          {/* fallback is null, not a spinner: the wipe panel is already over
              the viewport when a chunk is in flight, so anything drawn here
              would only ever be seen behind black. */}
          <Suspense fallback={null}>
            <ScrollSync />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/why-us" element={<WhyUs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </SmoothScroll>
    </BrowserRouter>
  );
}
