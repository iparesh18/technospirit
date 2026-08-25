import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import SmoothScroll from "@/components/layout/SmoothScroll";
import RouteTransition from "@/components/layout/RouteTransition";
import Cursor from "@/components/layout/Cursor";
import Nav from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/context/AuthProvider";
import ProtectedRoute from "@/components/dashboard/ProtectedRoute";
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
const Contact = lazy(() => import("@/pages/Contact"));
const Lab = lazy(() => import("@/pages/Lab"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * The admin area is lazy for a different reason than the marketing routes:
 * not weight, but audience. A visitor who never opens /dashboard should never
 * download it, and keeping it in its own chunk means the public bundle carries
 * no dashboard markup at all.
 */
const DashboardLayout = lazy(() => import("@/components/dashboard/DashboardLayout"));
const Login = lazy(() => import("@/pages/dashboard/Login"));
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const Inquiries = lazy(() => import("@/pages/dashboard/Inquiries"));

/**
 * Pulls the split route chunks into the module cache once the browser is idle,
 * so a navigation never has to wait on the network behind the wipe. Fetch
 * failures are swallowed deliberately: this is an optimisation, and the real
 * import inside <Suspense> is still there to surface a genuine problem.
 *
 * The dashboard is deliberately NOT warmed — it is not on any public path.
 */
function warmRoutes() {
  const warm = () => {
    import("@/pages/About").catch(() => {});
    import("@/pages/Services").catch(() => {});
    import("@/pages/WhyUs").catch(() => {});
    import("@/pages/Contact").catch(() => {});
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

/**
 * The public site: Lenis smooth scroll, the cursor follower, the route wipe,
 * the fixed nav and the footer.
 *
 * Everything expressive on this project lives in here, and the split is the
 * point — see <AdminShell> below.
 */
function MarketingShell() {
  useEffect(warmRoutes, []);

  return (
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
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </SmoothScroll>
  );
}

/**
 * The admin area, and none of the above.
 *
 * No Lenis, no GSAP ticker, no cursor follower, no route transition, no public
 * nav or footer. Three reasons, in order of weight:
 *
 * 1. The dashboard is not linked from any public navigation and must not
 *    advertise itself by appearing in the site chrome.
 * 2. An operational interface should be instant. Lenis intercepts the wheel
 *    and a 0.9s wipe between pages is exactly the wrong feel for a tool
 *    someone opens forty times a day.
 * 3. Native scroll is what a long inquiry list and a scrollable detail pane
 *    both want — including keyboard paging, which smooth-scroll hijacking
 *    interferes with.
 */
function AdminShell() {
  return (
    <Suspense
      fallback={
        <div className="ts-dash-boot" role="status">
          <span className="ts-label">LOADING</span>
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── public ────────────────────────────────────────────── */}
          <Route element={<MarketingShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/why-us" element={<WhyUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ── admin ─────────────────────────────────────────────── */}
          <Route path="/dashboard" element={<AdminShell />}>
            <Route path="login" element={<Login />} />

            {/* Everything below requires a session. The guard is a layout
                route, so a page added here is protected by default — and the
                real enforcement is still server-side on /api/admin/*. */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="inquiries" element={<Inquiries />} />
                <Route path="inquiries/:id" element={<Inquiries />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
