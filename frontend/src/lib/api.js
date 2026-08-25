/**
 * The one place the frontend talks to the API.
 *
 * Two properties everything here depends on:
 *
 * 1. `credentials: "include"` on every call. The session is an HttpOnly
 *    cookie, so JS never holds a token — it just has to make sure the browser
 *    is allowed to attach the one it has.
 * 2. Requests are same-origin (`/api/...`). Vite proxies to the API in
 *    development; in production the app and API sit behind one origin. There
 *    is no base URL to configure and no secret of any kind in this file.
 */

/** An API failure with the pieces the UI actually renders. */
export class ApiError extends Error {
  constructor(message, { status, code, fields } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    /** Per-field messages from server-side validation, keyed by field name. */
    this.fields = fields ?? null;
  }

  /** True when the server said "not signed in" rather than "that was wrong". */
  get isAuth() {
    return this.status === 401;
  }
}

const NETWORK_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

async function request(path, { method = "GET", body, signal } = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    // fetch only rejects for network-level failures — the API being down,
    // DNS, an aborted request. Anything the server answered lands below.
    if (error?.name === "AbortError") throw error;
    throw new ApiError(NETWORK_MESSAGE, { code: "NETWORK" });
  }

  // 204 and friends have no body to parse.
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(payload?.error ?? `Request failed (${response.status}).`, {
      status: response.status,
      code: payload?.code,
      fields: payload?.fields,
    });
  }

  return payload;
}

/* — public ————————————————————————————————————————— */

export const submitInquiry = (brief) =>
  request("/contact", { method: "POST", body: brief });

/* — auth ——————————————————————————————————————————— */

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: { email, password } });

export const fetchMe = (signal) => request("/auth/me", { signal });

export const logout = () => request("/auth/logout", { method: "POST" });

/* — admin ————————————————————————————————————————— */

export function fetchInquiries({ page = 1, limit = 20, status, search, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  return request(`/admin/inquiries?${params}`, { signal });
}

export const fetchInquiry = (id, signal) => request(`/admin/inquiries/${id}`, { signal });

export const updateInquiryStatus = (id, status) =>
  request(`/admin/inquiries/${id}/status`, { method: "PATCH", body: { status } });

export const fetchStats = (signal) => request("/admin/stats", { signal });
