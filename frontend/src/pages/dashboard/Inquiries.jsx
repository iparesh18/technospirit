import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import * as api from "@/lib/api";
import StatusPill, { STATUS_KEYS, STATUS_META } from "@/components/dashboard/StatusPill";
import InquiryDetail from "@/components/dashboard/InquiryDetail";
import { relative, stamp } from "@/lib/formatDate";
import usePageMeta from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const FILTERS = [{ key: "all", label: "ALL" }, ...STATUS_KEYS.map((k) => ({ key: k, label: STATUS_META[k].label }))];

/**
 * The list, and — on desktop — the detail beside it.
 *
 * Layout is a two-pane master/detail above 1100px and a stack below, where
 * selecting a row navigates to a full-width detail view instead of squeezing
 * two panes into 390px. Same routes either way: /dashboard/inquiries/:id is a
 * real URL, so a specific inquiry can be linked, bookmarked and refreshed.
 */
export default function Inquiries() {
  usePageMeta({ title: "Inquiries — TechnoSpirit Admin" });

  const { id: selectedId } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  /**
   * Debounce the search box. Without it every keystroke is a request, and the
   * responses can land out of order — the abort below handles ordering, but
   * not sending six requests for one word is the better fix.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /** Bumped to force a refetch after a status change without duplicating state. */
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");

    api
      .fetchInquiries({ page, limit: PAGE_SIZE, status, search, signal: controller.signal })
      .then((data) => {
        setRows(data.inquiries);
        setPagination(data.pagination);
        setState("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message);
        setState("error");
      });

    return () => controller.abort();
  }, [page, status, search, revision]);

  /**
   * Keeps the row in the list in step with a status changed in the detail
   * pane, without refetching the page and losing scroll position.
   */
  const onStatusChanged = useCallback((updated) => {
    setRows((current) =>
      current.map((row) => (row.id === updated._id ? { ...row, status: updated.status } : row)),
    );
  }, []);

  const listRef = useRef(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [page, status, search]);

  const showDetailPane = Boolean(selectedId);

  return (
    <div className={cn("ts-dash-page ts-inq", showDetailPane && "has-detail")}>
      <header className="ts-dash-head">
        <div>
          <span className="ts-label ts-dash-eyebrow">DASHBOARD / 02</span>
          <h1 className="ts-display-tight ts-dash-title">Email inquiries</h1>
        </div>
        <span className="ts-label ts-dash-head-meta tabular-nums">
          {pagination.total} TOTAL
        </span>
      </header>

      {/* ── controls ────────────────────────────────────────────────── */}
      <div className="ts-inq-controls">
        <div className="ts-inq-search">
          <Search size={15} strokeWidth={1.8} aria-hidden="true" className="ts-inq-search-icon" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, purpose or message…"
            aria-label="Search inquiries"
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

        <div className="ts-seg" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
              className={cn("ts-seg-btn", status === f.key && "is-active")}
              aria-pressed={status === f.key}
            >
              {f.label}
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
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="ts-inq-row is-loading">
                  <span className="ts-inq-skel ts-inq-skel-name" />
                  <span className="ts-inq-skel ts-inq-skel-line" />
                </li>
              ))}
            </ul>
          )}

          {state === "ready" && rows.length === 0 && (
            <p className="ts-dash-empty">
              {search || status !== "all"
                ? "Nothing matches those filters."
                : "No inquiries yet."}
            </p>
          )}

          {state === "ready" && rows.length > 0 && (
            <ul className="ts-inq-list">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/inquiries/${row.id}`)}
                    className={cn("ts-inq-row", selectedId === row.id && "is-selected")}
                    aria-current={selectedId === row.id ? "true" : undefined}
                  >
                    <span className="ts-inq-row-top">
                      <span className="ts-inq-row-name">{row.name}</span>
                      <StatusPill status={row.status} />
                    </span>

                    <span className="ts-inq-row-purpose">{row.purpose}</span>
                    <span className="ts-inq-row-preview">{row.preview}</span>

                    <span className="ts-inq-row-foot">
                      <span className="ts-label ts-inq-row-email">{row.email}</span>
                      <span className="ts-label ts-inq-row-when" title={stamp(row.createdAt)}>
                        {relative(row.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* ── pagination ──────────────────────────────────────────── */}
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
            <InquiryDetail
              id={selectedId}
              onClose={() => navigate("/dashboard/inquiries")}
              onStatusChanged={onStatusChanged}
              onDeleted={refresh}
            />
          </div>
        )}
      </div>
    </div>
  );
}
