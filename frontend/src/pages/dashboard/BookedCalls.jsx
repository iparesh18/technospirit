import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import * as api from "@/lib/api";
import BookingPill, { TagRow, bookingTags } from "@/components/dashboard/BookingPill";
import BookingDetail from "@/components/dashboard/BookingDetail";
import { relative } from "@/lib/formatDate";
import usePageMeta from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

/**
 * The views, in the order an operator needs them.
 *
 * Not the four statuses — those are what a call IS, and they belong on the row
 * as a badge. These are what a call is TO YOU right now, which is the question
 * this screen is opened to answer.
 */
const SEGMENTS = [
  { key: "upcoming", label: "UPCOMING" },
  { key: "today", label: "TODAY" },
  { key: "past", label: "PAST" },
  { key: "all", label: "ALL" },
];

/**
 * The call time on the BOOKING clock — TechnoSpirit's own zone.
 *
 * The same time the popup labelled the slot with and the same time both emails
 * state, which is the only one the client ever agreed to. The client's own zone
 * is still stored and is shown in the detail pane; leading with it here would
 * put a third rendering of one instant in front of whoever has to dial.
 */
function callTime(booking) {
  const date = new Date(booking.scheduledAt);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—", zone: "" };
  const zone = booking.businessTimezone || booking.timezone || undefined;

  const format = (options) => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: zone, ...options }).format(date);
    } catch {
      return new Intl.DateTimeFormat("en-US", options).format(date);
    }
  };

  let abbr = "";
  try {
    abbr =
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
        .formatToParts(date)
        .find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    abbr = "";
  }

  return {
    date: format({ month: "short", day: "numeric" }),
    time: format({ hour: "numeric", minute: "2-digit", hour12: true }),
    zone: abbr,
  };
}

/**
 * Booked calls.
 *
 * A copy of the Inquiries screen's architecture, not a new one: the same
 * master/detail split, the same search box, the same segmented control, the
 * same pager, the same `/…/:id` route so a single call can be linked and
 * refreshed. Nothing about the existing dashboard changed to make room for it
 * — one entry in SECTIONS and two routes.
 */
export default function BookedCalls() {
  usePageMeta({ title: "Booked calls — TechnoSpirit Admin" });

  const { id: selectedId } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState("upcoming");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  /** Debounced, for the same reason as the inquiry search: one request per
   *  word, not one per keystroke. */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");

    Promise.all([
      api.fetchBookings({
        page,
        limit: PAGE_SIZE,
        segment,
        search,
        signal: controller.signal,
      }),
      api.fetchBookingStats(controller.signal),
    ])
      .then(([list, statsData]) => {
        setRows(list.bookings);
        setPagination(list.pagination);
        setStats(statsData.stats);
        setState("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message);
        setState("error");
      });

    return () => controller.abort();
  }, [page, segment, search, revision]);

  /** Keeps the row in step with a status changed in the detail pane, without
   *  refetching the page and losing scroll position. */
  const onStatusChanged = useCallback((updated) => {
    setRows((current) =>
      current.map((row) => (row.id === updated._id ? { ...row, status: updated.status } : row)),
    );
  }, []);

  const listRef = useRef(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [page, segment, search]);

  const showDetailPane = Boolean(selectedId);

  const tiles = stats
    ? [
        { key: "upcoming", label: "UPCOMING", value: stats.upcoming, tone: "signal" },
        { key: "today", label: "TODAY", value: stats.today, tone: "plain" },
        { key: "completed", label: "COMPLETED", value: stats.completed, tone: "plain" },
        { key: "total", label: "TOTAL", value: stats.total, tone: "plain" },
      ]
    : [];

  return (
    <div className={cn("ts-dash-page ts-inq", showDetailPane && "has-detail")}>
      <header className="ts-dash-head">
        <div>
          <span className="ts-label ts-dash-eyebrow">DASHBOARD / 03</span>
          <h1 className="ts-display-tight ts-dash-title">Booked calls</h1>
        </div>
        {stats?.next && (
          <span className="ts-label ts-dash-head-meta">
            NEXT {relative(stats.next.scheduledAt).toUpperCase()}
          </span>
        )}
      </header>

      {/* ── the counts ──────────────────────────────────────────────── */}
      <div className="ts-stat-grid">
        {state === "loading" && !stats
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ts-stat is-loading" aria-hidden="true">
                <span className="ts-stat-label">&nbsp;</span>
                <span className="ts-stat-value">&nbsp;</span>
              </div>
            ))
          : tiles.map((tile) => (
              <div key={tile.key} className="ts-stat" data-tone={tile.tone}>
                <span className="ts-label ts-stat-label">{tile.label}</span>
                <span className="ts-stat-value tabular-nums">{tile.value}</span>
              </div>
            ))}
      </div>

      {/* ── controls ────────────────────────────────────────────────── */}
      <div className="ts-inq-controls ts-bkl-controls">
        <div className="ts-inq-search">
          <Search size={15} strokeWidth={1.8} aria-hidden="true" className="ts-inq-search-icon" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone, company or country…"
            aria-label="Search booked calls"
            className="ts-inq-search-input"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="ts-inq-search-clear"
              aria-label="Clear search"
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="ts-seg" role="group" aria-label="Filter calls">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSegment(s.key);
                setPage(1);
              }}
              className={cn("ts-seg-btn", segment === s.key && "is-active")}
              aria-pressed={segment === s.key}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && state === "error" && (
        <p className="ts-dash-error" role="alert">
          {error}
        </p>
      )}

      {/* ── list + detail ───────────────────────────────────────────── */}
      <div className="ts-inq-split">
        <div className="ts-inq-listcol" ref={listRef}>
          {state === "loading" && (
            <ul className="ts-inq-list" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="ts-inq-row is-loading">
                  <span className="ts-inq-skel ts-inq-skel-name" />
                  <span className="ts-inq-skel ts-inq-skel-line" />
                </li>
              ))}
            </ul>
          )}

          {state === "ready" && rows.length === 0 && (
            <p className="ts-dash-empty">
              {search
                ? "Nothing matches that search."
                : segment === "upcoming"
                  ? "No upcoming calls."
                  : "No calls here yet."}
            </p>
          )}

          {state === "ready" && rows.length > 0 && (
            <ul className="ts-inq-list">
              {rows.map((row) => {
                const when = callTime(row);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/calls/${row.id}`)}
                      className={cn("ts-inq-row", selectedId === row.id && "is-selected")}
                      aria-current={selectedId === row.id ? "true" : undefined}
                    >
                      <span className="ts-inq-row-top">
                        <span className="ts-inq-row-name">{row.name}</span>
                        <BookingPill status={row.status} />
                      </span>

                      {row.company && (
                        <span className="ts-inq-row-purpose ts-bkl-company">{row.company}</span>
                      )}

                      {/* The two facts this list exists for: when to call, and
                          what to dial. Given the row's own emphasis. */}
                      <span className="ts-bkl-when">
                        <span className="ts-bkl-when-date">
                          {when.date} · {when.time}
                        </span>
                        {when.zone && <span className="ts-bkl-when-zone">{when.zone}</span>}
                        <span className="ts-bkl-phone">{row.phone}</span>
                      </span>

                      <TagRow tags={bookingTags(row)} />

                      <span className="ts-inq-row-foot">
                        <span className="ts-label ts-inq-row-email">{row.email}</span>
                        <span className="ts-label ts-inq-row-when">
                          BOOKED {relative(row.createdAt).toUpperCase()}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {pagination.pages > 1 && (
            <div className="ts-inq-pager">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="ts-inq-page-btn"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} strokeWidth={1.8} />
              </button>

              <span className="ts-label ts-inq-page-count tabular-nums">
                {pagination.page} / {pagination.pages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages}
                className="ts-inq-page-btn"
                aria-label="Next page"
              >
                <ChevronRight size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>

        {showDetailPane && (
          <div className="ts-inq-detailcol">
            <BookingDetail
              id={selectedId}
              onClose={() => navigate("/dashboard/calls")}
              onStatusChanged={onStatusChanged}
              onDeleted={refresh}
            />
          </div>
        )}
      </div>
    </div>
  );
}
