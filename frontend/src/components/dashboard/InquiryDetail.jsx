import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import * as api from "@/lib/api";
import StatusPill, { STATUS_KEYS, STATUS_META } from "@/components/dashboard/StatusPill";
import { dateOnly, timeOnly } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

/**
 * Builds a Gmail compose URL addressed to the visitor.
 *
 * This opens Gmail's own compose window in a new tab — it is a link, nothing
 * more. No credential, token or app password is involved on this side; the
 * operator is already signed into Gmail in their own browser, and the sending
 * account's App Password never leaves the server's environment.
 *
 * `?authuser=` is deliberately omitted: hard-coding an account index sends
 * people to the wrong mailbox when they are signed into more than one.
 */
function gmailComposeUrl({ email, name }) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
    su: "Re: Your TechnoSpirit inquiry",
    body: `Hi ${String(name || "").trim().split(/\s+/)[0] || "there"},\n\n`,
  });
  return `https://mail.google.com/mail/?${params}`;
}

export default function InquiryDetail({ id, onClose, onStatusChanged }) {
  const [inquiry, setInquiry] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setSaveError(null);

    api
      .fetchInquiry(id, controller.signal)
      .then((data) => {
        setInquiry(data.inquiry);
        setState("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err.message);
        setState("error");
      });

    return () => controller.abort();
  }, [id]);

  const changeStatus = async (next) => {
    if (!inquiry || next === inquiry.status || saving) return;

    const previous = inquiry.status;
    setSaving(true);
    setSaveError(null);
    // Optimistic: the control answers immediately and rolls back if the
    // server refuses. A status click that waits on a round-trip feels broken.
    setInquiry((current) => ({ ...current, status: next }));

    try {
      const data = await api.updateInquiryStatus(id, next);
      setInquiry(data.inquiry);
      onStatusChanged?.(data.inquiry);
    } catch (err) {
      setInquiry((current) => ({ ...current, status: previous }));
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") {
    return (
      <section className="ts-detail" aria-busy="true">
        <div className="ts-detail-bar">
          <span className="ts-label">LOADING</span>
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="ts-detail">
        <div className="ts-detail-bar">
          <span className="ts-label">ERROR</span>
          <button type="button" onClick={onClose} className="ts-detail-close" aria-label="Close">
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
        <p className="ts-dash-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="ts-detail" aria-label={`Inquiry from ${inquiry.name}`}>
      <div className="ts-detail-bar">
        <span className="ts-label ts-detail-ref">
          REF {String(inquiry._id).slice(-6).toUpperCase()}
        </span>
        <button type="button" onClick={onClose} className="ts-detail-close" aria-label="Close detail">
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div className="ts-detail-scroll">
        {/* ── customer ──────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <span className="ts-label ts-detail-legend">CUSTOMER</span>

          <h2 className="ts-display-tight ts-detail-name">{inquiry.name}</h2>

          <a href={`mailto:${inquiry.email}`} className="ts-detail-email">
            {inquiry.email}
          </a>
        </div>

        {/* ── inquiry ───────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <span className="ts-label ts-detail-legend">INQUIRY</span>

          <dl className="ts-detail-rows">
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">PURPOSE</dt>
              <dd className="ts-detail-val">{inquiry.purpose}</dd>
            </div>
          </dl>

          {/* pre-wrap: the visitor's paragraphing is information */}
          <p className="ts-detail-message">{inquiry.message}</p>
        </div>

        {/* ── received ──────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <span className="ts-label ts-detail-legend">RECEIVED</span>
          <dl className="ts-detail-rows">
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">DATE</dt>
              <dd className="ts-detail-val">{dateOnly(inquiry.createdAt)}</dd>
            </div>
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">TIME</dt>
              <dd className="ts-detail-val tabular-nums">{timeOnly(inquiry.createdAt)}</dd>
            </div>
            {inquiry.mail && (
              <div className="ts-detail-row">
                <dt className="ts-label ts-detail-key">MAIL</dt>
                <dd className="ts-detail-val ts-detail-mail">
                  <span data-state={inquiry.mail.customer}>
                    customer: {inquiry.mail.customer}
                  </span>
                  <span data-state={inquiry.mail.internal}>
                    internal: {inquiry.mail.internal}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* ── status ────────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <div className="ts-detail-legend-row">
            <span className="ts-label ts-detail-legend">STATUS</span>
            <StatusPill status={inquiry.status} />
          </div>

          <div className="ts-detail-status" role="group" aria-label="Change status">
            {STATUS_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => changeStatus(key)}
                disabled={saving}
                aria-pressed={inquiry.status === key}
                className={cn("ts-detail-status-btn", inquiry.status === key && "is-active")}
              >
                {STATUS_META[key].label}
              </button>
            ))}
          </div>

          {saveError && (
            <p className="ts-dash-error" role="alert">
              {saveError}
            </p>
          )}
        </div>
      </div>

      {/* ── reply ───────────────────────────────────────────────────── */}
      <div className="ts-detail-foot">
        <a
          href={gmailComposeUrl(inquiry)}
          target="_blank"
          rel="noreferrer noopener"
          className="ts-detail-reply"
        >
          <span className="ts-label">REPLY VIA EMAIL</span>
          <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
