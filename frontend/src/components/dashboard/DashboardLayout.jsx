import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Inbox, LayoutGrid, LogOut, Menu, PhoneCall, X } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { cn } from "@/lib/utils";

/**
 * The dashboard chrome.
 *
 * Same identity as the public site — Archivo, JetBrains Mono microcopy, zero
 * radius, hard rules, black/white/red — but deliberately NOT the same
 * behaviour. No GSAP, no Lenis, no cursor follower, no route wipe. Nothing
 * here animates on a scroll frame. An operator opening this forty times a day
 * wants it to be instant and legible; the expressive layer belongs on the
 * marketing site, and running it here would make the tool feel slower than it
 * is. Transitions are limited to sub-200ms colour and border changes.
 *
 * The sidebar is the extension point: SECTIONS is the whole navigation model,
 * and adding AI Conversations / Leads / Analytics / Settings later is one entry
 * each plus a route. Nothing else in this file needs to change.
 */
const SECTIONS = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/inquiries", label: "Inquiries", icon: Inbox },
  { to: "/dashboard/calls", label: "Booked Calls", icon: PhoneCall },
];

export default function DashboardLayout() {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer on navigation; leaving it open over the new page
  // is the classic mobile-nav bug.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock the page behind the drawer, and release it on unmount so a fast
  // navigation cannot strand the lock.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/dashboard/login", { replace: true });
  };

  const nav = (
    <nav className="ts-dash-nav" aria-label="Dashboard sections">
      {SECTIONS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn("ts-dash-link", isActive && "is-active")}
        >
          <Icon className="ts-dash-link-icon" strokeWidth={1.6} aria-hidden="true" />
          <span className="ts-dash-link-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    // data-zone="ink" re-points the shadcn/border token contract for the whole
    // subtree, the same mechanism the public site's black sections use.
    <div className="ts-dash" data-zone="ink">
      {/* ── top bar ─────────────────────────────────────────────────── */}
      <header className="ts-dash-topbar">
        <button
          type="button"
          className="ts-dash-burger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="ts-dash-sidebar"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
        </button>

        <span className="ts-dash-mark">
          TECHNOSPIRIT
          <span className="ts-dash-mark-sub">ADMIN</span>
        </span>

        <div className="ts-dash-who">
          <span className="ts-label ts-dash-who-email" title={admin?.email}>
            {admin?.email}
          </span>
          <button type="button" onClick={handleSignOut} className="ts-dash-signout">
            <LogOut size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="ts-dash-body">
        {/* ── sidebar ───────────────────────────────────────────────── */}
        <aside
          id="ts-dash-sidebar"
          className={cn("ts-dash-side", menuOpen && "is-open")}
          data-open={menuOpen ? "" : undefined}
        >
          <div className="ts-dash-side-inner">
            {nav}

            <div className="ts-dash-side-foot">
              {/* Named as the roadmap it is, rather than rendered as dead
                  links. Showing disabled items for modules that do not exist
                  would be the fabricated-proof problem in a new place. */}
              <span className="ts-label ts-dash-soon-head">NEXT MODULES</span>
              <span className="ts-label ts-dash-soon">
                AI Conversations · Leads · Analytics · Settings
              </span>

              <button type="button" onClick={handleSignOut} className="ts-dash-side-signout">
                <LogOut size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {menuOpen && (
          <button
            type="button"
            className="ts-dash-veil"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* ── the work surface ──────────────────────────────────────── */}
        <main className="ts-dash-main" id="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
