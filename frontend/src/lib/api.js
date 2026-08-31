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
  constructor(message, { status, code, fields, fallback } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    /** Per-field messages from server-side validation, keyed by field name. */
    this.fields = fields ?? null;
    /** A second sentence the server attaches to assistant failures — the
     *  contact number, so a visitor whose question just failed still has
     *  somewhere to go. Never present on other endpoints. */
    this.fallback = fallback ?? null;
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
      fallback: payload?.fallback,
    });
  }

  return payload;
}

/* — public ————————————————————————————————————————— */

export const submitInquiry = (brief) =>
  request("/contact", { method: "POST", body: brief });

/**
 * Ask the assistant.
 *
 * The whole client side of the AI feature is this one function. There is no
 * model name here, no provider, no SDK and no key — the browser posts a
 * question and receives a sentence, and everything that decides what that
 * sentence may contain lives on the server.
 */
export const sendChatMessage = ({ message, history }, signal) =>
  request("/chat", { method: "POST", body: { message, history }, signal });

/* — call bookings —————————————————————————————————— */

/**
 * The slots the server is currently willing to sell.
 *
 * Every instant comes back as UTC ISO. Nothing about the calendar is decided
 * in the browser — not the working days, not the hours, not which times are
 * still free — so a stale tab cannot offer a slot that no longer exists.
 */
export const fetchAvailability = (signal) => request("/bookings/availability", { signal });

/** Book one. A 409 (`code: "SLOT_TAKEN"`) means someone else got there first. */
export const createBooking = (booking) =>
  request("/bookings", { method: "POST", body: booking });

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

export function fetchBookings({ page = 1, limit = 20, segment, status, search, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (segment && segment !== "all") params.set("segment", segment);
  if (status && status !== "all") params.set("status", status);
  if (search) params.set("search", search);
  return request(`/admin/bookings?${params}`, { signal });
}

export const fetchBooking = (id, signal) => request(`/admin/bookings/${id}`, { signal });

export const updateBookingStatus = (id, status) =>
  request(`/admin/bookings/${id}/status`, { method: "PATCH", body: { status } });

export const fetchBookingStats = (signal) => request("/admin/bookings/stats", { signal });
