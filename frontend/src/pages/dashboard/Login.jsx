import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/authContext";
import usePageMeta from "@/hooks/usePageMeta";

/**
 * The way in.
 *
 * No credentials are printed on this screen, and none exist in this file. The
 * development identity lives in the backend's `.env` (ADMIN_EMAIL /
 * ADMIN_INITIAL_PASSWORD) and is bcrypt-hashed before it reaches Mongo —
 * putting a hint here would ship it to every visitor who finds the URL.
 *
 * Styled as one black plate with a red signal rule: the site's grammar, at the
 * density of a tool rather than a landing page.
 */
export default function Login() {
  /**
   * noindex, and robots.txt is not a substitute for it.
   *
   * `Disallow: /dashboard` stops the crawl, not the indexing: a disallowed URL
   * that Google finds referenced anywhere can still be listed, as a bare URL
   * with no snippet, precisely because the rule forbids fetching the page that
   * would say otherwise. The meta directive is the one that removes it — and
   * it only works on a page Google is allowed to fetch, so the two rules are
   * doing different jobs rather than repeating one.
   *
   * This page is also the only dashboard route reachable without a session, so
   * it is the one that can actually be crawled and the one that most needs it.
   */
  usePageMeta({
    title: "Admin — TechnoSpirit",
    description: "TechnoSpirit internal dashboard.",
    noindex: true,
  });

  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);
  const inFlight = useRef(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Already signed in — do not show a login form to a live session.
  if (status === "authenticated") {
    return <Navigate to={location.state?.from?.pathname ?? "/dashboard"} replace />;
  }

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    setError(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (inFlight.current) return;

    if (!values.email.trim() || !values.password) {
      setError("Enter both an email and a password.");
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setError(null);

    try {
      await signIn(values.email.trim(), values.password);
      navigate(location.state?.from?.pathname ?? "/dashboard", { replace: true });
    } catch (err) {
      // The server deliberately gives one message for "no such admin" and
      // "wrong password"; this shows exactly what it said and invents nothing.
      setError(err.message);
      setValues((v) => ({ ...v, password: "" }));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="ts-login" data-zone="ink">
      <div className="ts-login-plate">
        <div className="ts-login-head">
          <span className="ts-label ts-login-eyebrow">TECHNOSPIRIT / INTERNAL</span>
          <span className="ts-login-rule" aria-hidden="true" />
        </div>

        <h1 className="ts-display-tight ts-login-title">
          Admin
          <br />
          access.
        </h1>

        <form className="ts-login-form" onSubmit={onSubmit} noValidate>
          <div className="ts-login-field">
            <label htmlFor="admin-email" className="ts-label ts-login-label">
              Email
            </label>
            <input
              ref={emailRef}
              id="admin-email"
              name="email"
              type="text"
              autoComplete="username"
              spellCheck="false"
              autoCapitalize="none"
              value={values.email}
              onChange={set("email")}
              className="ts-login-input"
              disabled={busy}
            />
          </div>

          <div className="ts-login-field">
            <label htmlFor="admin-password" className="ts-label ts-login-label">
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={set("password")}
              className="ts-login-input"
              disabled={busy}
            />
          </div>

          {error && (
            <p className="ts-label ts-login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="ts-login-submit" disabled={busy}>
            <span className="ts-label">{busy ? "CHECKING" : "SIGN IN"}</span>
            <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </form>

        <p className="ts-label ts-login-foot">AUTHORISED PERSONNEL ONLY</p>
      </div>
    </div>
  );
}
