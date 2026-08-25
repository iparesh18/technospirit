import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * The auth cookie.
 *
 * The JWT goes in an HttpOnly cookie, not in localStorage and not in a JSON
 * response body — so no script on the page can read it, which removes the
 * whole class of "XSS steals the session token" outcomes. The React app never
 * sees the token; it asks `GET /api/auth/me` whether it is signed in.
 */
export const AUTH_COOKIE = "ts_admin_token";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // keep in step with JWT_EXPIRES_IN

export function signToken(admin) {
  return jwt.sign(
    { sub: String(admin._id), email: admin.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, issuer: "technospirit" },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { issuer: "technospirit" });
}

/**
 * `sameSite: "lax"` is the right default here: the dashboard is a same-origin
 * app (Vite proxies /api in dev, one origin in production), so "lax" costs
 * nothing and blocks cross-site POSTs carrying the cookie — CSRF protection
 * without a token dance. If the API is ever moved to a genuinely different
 * origin this has to become "none" + `secure`, and CSRF needs revisiting.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_MS,
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, cookieOptions());
}

export function clearAuthCookie(res) {
  // Same attributes minus maxAge — a cookie only clears if path/sameSite match.
  const { maxAge, ...options } = cookieOptions();
  void maxAge;
  res.clearCookie(AUTH_COOKIE, options);
}
