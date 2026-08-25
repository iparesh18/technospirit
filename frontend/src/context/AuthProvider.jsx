import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/context/authContext";
import * as api from "@/lib/api";

/**
 * Restores the session on mount by asking the server who we are.
 *
 * This is what makes refreshing /dashboard keep you signed in: the cookie
 * survives the reload, and this asks whether it is still good rather than
 * assuming it is not. Any non-401 failure (API down, network) also resolves to
 * "anonymous" — but the login screen surfaces the real reason when you try.
 */
export default function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const controller = new AbortController();

    api
      .fetchMe(controller.signal)
      .then((data) => {
        setAdmin(data.admin);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setAdmin(null);
        setStatus("anonymous");
      });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setAdmin(data.admin);
    setStatus("authenticated");
    return data.admin;
  }, []);

  const signOut = useCallback(async () => {
    // Clear locally even if the request fails — the intent was to sign out,
    // and the cookie is already unusable to us either way.
    try {
      await api.logout();
    } finally {
      setAdmin(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ admin, status, signIn, signOut }),
    [admin, status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
