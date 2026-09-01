import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import * as api from "@/lib/api";
import StatusPill from "@/components/dashboard/StatusPill";
import { relative, stamp } from "@/lib/formatDate";
import usePageMeta from "@/hooks/usePageMeta";

/**
 * Every number on this page is counted in MongoDB by GET /api/admin/stats.
 * Nothing is estimated, extrapolated or placeheld — the public site refuses to
 * carry invented proof and an internal tool has even less excuse, because
 * someone will make a decision from it.
 */
export default function Overview() {
  usePageMeta({ title: "Overview — TechnoSpirit Admin", noindex: true });

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      api.fetchStats(controller.signal),
      api.fetchInquiries({ page: 1, limit: 5, signal: controller.signal }),
    ])
      .then(([statsData, listData]) => {
        setStats(statsData.stats);
        setRecent(listData.inquiries);
        setState("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message);
        setState("error");
      });

    return () => controller.abort();
  }, []);

  const tiles = stats
    ? [
        { key: "total", label: "TOTAL INQUIRIES", value: stats.total, tone: "plain" },
        { key: "new", label: "NEW", value: stats.new, tone: "signal" },
        { key: "contacted", label: "CONTACTED", value: stats.contacted, tone: "plain" },
        { key: "week", label: "THIS WEEK", value: stats.thisWeek, tone: "plain" },
      ]
    : [];

  return (
    <div className="ts-dash-page">
      <header className="ts-dash-head">
        <div>
          <span className="ts-label ts-dash-eyebrow">DASHBOARD / 01</span>
          <h1 className="ts-display-tight ts-dash-title">Overview</h1>
        </div>
        {stats?.latestAt && (
          <span className="ts-label ts-dash-head-meta">
            LATEST {relative(stats.latestAt).toUpperCase()}
          </span>
        )}
      </header>

      {state === "error" && (
        <p className="ts-dash-error" role="alert">
          {error}
        </p>
      )}

      {/* ── the four counts ─────────────────────────────────────────── */}
      <div className="ts-stat-grid">
        {state === "loading"
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

      {/* ── the rest of the breakdown ───────────────────────────────── */}
      {stats && (
        <div className="ts-dash-block">
          <div className="ts-dash-block-head">
            <span className="ts-label">BY STATUS</span>
          </div>
          <dl className="ts-dash-ledger">
            {[
              ["New", stats.new, "new"],
              ["Contacted", stats.contacted, "contacted"],
              ["In progress", stats.inProgress, "in-progress"],
              ["Closed", stats.closed, "closed"],
            ].map(([label, value, key]) => (
              <div key={key} className="ts-dash-ledger-row">
                <dt className="ts-dash-ledger-key">
                  <StatusPill status={key} />
                  <span className="ts-dash-ledger-name">{label}</span>
                </dt>
                <dd className="ts-dash-ledger-val tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* ── most recent ─────────────────────────────────────────────── */}
      <div className="ts-dash-block">
        <div className="ts-dash-block-head">
          <span className="ts-label">MOST RECENT</span>
          <Link to="/dashboard/inquiries" className="ts-dash-more">
            <span className="ts-label">ALL INQUIRIES</span>
            <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>

        {state === "ready" && recent.length === 0 && (
          <p className="ts-dash-empty">No inquiries yet.</p>
        )}

        <ul className="ts-dash-recent">
          {recent.map((item) => (
            <li key={item.id}>
              <Link to={`/dashboard/inquiries/${item.id}`} className="ts-dash-recent-row">
                <span className="ts-dash-recent-name">{item.name}</span>
                <span className="ts-dash-recent-purpose">{item.purpose}</span>
                <StatusPill status={item.status} className="ts-dash-recent-pill" />
                <span className="ts-label ts-dash-recent-when">{stamp(item.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
