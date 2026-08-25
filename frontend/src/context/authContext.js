import { createContext, useContext } from "react";

/**
 * Session state for the admin area.
 *
 * `admin` is the identity the server confirmed, never something this app
 * decided for itself — the token lives in an HttpOnly cookie the browser will
 * not show us, so "am I signed in?" is only ever answered by GET /api/auth/me.
 *
 * `status` is a three-state, and the third one matters: until the first
 * /auth/me has resolved the answer is genuinely unknown, and a protected route
 * that treats "unknown" as "signed out" bounces a signed-in admin to the login
 * screen on every refresh.
 */
export const AuthContext = createContext({
  admin: null,
  status: "checking", // "checking" | "authenticated" | "anonymous"
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
