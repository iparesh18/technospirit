import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import * as api from "@/lib/api";
import BookingPill, {
  BOOKING_STATUS_KEYS,
  BOOKING_STATUS_META,
  TagRow,
  bookingTags,
} from "@/components/dashboard/BookingPill";
import { stamp } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

/**
 * One booked call, in full.
 *
 * Structurally identical to <InquiryDetail> — same `.ts-detail*` shell, same
 * sticky pane, same optimistic status control, same close affordance — so an
 * operator who has used one has already used this. What differs is only what a
 * call needs and an email does not: the number to dial, and the same instant
 * printed twice, once in the client's timezone and once in the reader's.
 */

/** The instant, rendered in a named zone. Two calls to this are what makes the
 *  "their time / your time" pair unambiguous. */
function inZone(value, timeZone, options) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

function zoneAbbr(value, timeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
        .formatToParts(date)
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

const DATE = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
const TIME = { hour: "numeric", minute: "2-digit", hour12: true };

export default function BookingDetail({ id, onClose, onStatusChanged }) {
  const [booking, setBooking] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setSaveError(null);

    api
      .fetchBooking(id, controller.signal)
      .then((data) => {
        setBooking(data.booking);
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
    if (!booking || next === booking.status || saving) return;

    const previous = booking.status;
    setSaving(true);
    setSaveError(null);
    // Optimistic, and rolled back if the server refuses — a status click that
    // waits on a round trip feels broken.
    setBooking((current) => ({ ...current, status: next }));

    try {
      const data = await api.updateBookingStatus(id, next);
      setBooking(data.booking);
      onStatusChanged?.(data.booking);
    } catch (err) {
      setBooking((current) => ({ ...current, status: previous }));
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

  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  /**
   * Three clocks can disagree about one instant, so the pane names all three
   * and is explicit about which is which.
   *
   * The BOOKING clock leads — TechnoSpirit's own zone, the one the popup
   * labelled every slot with and the one both emails state. That is the time
   * the client agreed to, so it is the time to dial at.
   */
  const bookingZone = booking.businessTimezone || booking.timezone || viewerZone;
  const clientZone = booking.timezone || bookingZone;
  const showClientTime = clientZone !== bookingZone;
  const showViewerTime = viewerZone !== bookingZone && viewerZone !== clientZone;

  return (
    <section className="ts-detail" aria-label={`Call with ${booking.name}`}>
      <div className="ts-detail-bar">
        <span className="ts-label ts-detail-ref">
          REF {String(booking._id).slice(-6).toUpperCase()}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ts-detail-close"
          aria-label="Close detail"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>

      <div className="ts-detail-scroll">
        {/* ── the call, first: it is the thing with a deadline ───────── */}
        <div className="ts-detail-block">
          <div className="ts-detail-legend-row">
            <span className="ts-label ts-detail-legend">CALL</span>
            <BookingPill status={booking.status} />
          </div>

          <p className="ts-bkd-when">{inZone(booking.scheduledAt, bookingZone, DATE)}</p>
          <p className="ts-bkd-when ts-bkd-when-time">
            {inZone(booking.scheduledAt, bookingZone, TIME)}
            <span className="ts-bkd-zone">{zoneAbbr(booking.scheduledAt, bookingZone)}</span>
          </p>

          <dl className="ts-detail-rows">
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">TIMEZONE</dt>
              <dd className="ts-detail-val">{bookingZone}</dd>
            </div>
            {showClientTime && (
              <div className="ts-detail-row">
                <dt className="ts-label ts-detail-key">CLIENT TIME</dt>
                <dd className="ts-detail-val">
                  {inZone(booking.scheduledAt, clientZone, DATE)} ·{" "}
                  {inZone(booking.scheduledAt, clientZone, TIME)}{" "}
                  {zoneAbbr(booking.scheduledAt, clientZone)} · {clientZone}
                </dd>
              </div>
            )}
            {showViewerTime && (
              <div className="ts-detail-row">
                <dt className="ts-label ts-detail-key">YOUR TIME</dt>
                <dd className="ts-detail-val">
                  {inZone(booking.scheduledAt, viewerZone, DATE)} ·{" "}
                  {inZone(booking.scheduledAt, viewerZone, TIME)}{" "}
                  {zoneAbbr(booking.scheduledAt, viewerZone)}
                </dd>
              </div>
            )}
          </dl>

          <TagRow tags={bookingTags(booking)} className="ts-bkd-tags" />
        </div>

        {/* ── client ─────────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <span className="ts-label ts-detail-legend">CLIENT</span>

          <h2 className="ts-display-tight ts-detail-name">{booking.name}</h2>

          <a href={`mailto:${booking.email}`} className="ts-detail-email">
            {booking.email}
          </a>

          <dl className="ts-detail-rows">
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">PHONE</dt>
              <dd className="ts-detail-val">
                <a href={`tel:${booking.phone}`} className="ts-bkd-tel">
                  {booking.phone}
                </a>
              </dd>
            </div>
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">COUNTRY</dt>
              <dd className="ts-detail-val">{booking.country || "—"}</dd>
            </div>
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">COMPANY</dt>
              <dd className="ts-detail-val">{booking.company || "—"}</dd>
            </div>
          </dl>
        </div>

        {/* ── discussion ─────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <span className="ts-label ts-detail-legend">DISCUSSION</span>
          {/* pre-wrap: the visitor's paragraphing is information */}
          <p className="ts-detail-message">
            {booking.discussion || "Nothing was written here."}
          </p>
        </div>

        {/* ── status ─────────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <div className="ts-detail-legend-row">
            <span className="ts-label ts-detail-legend">STATUS</span>
            <BookingPill status={booking.status} />
          </div>

          <div className="ts-detail-status" role="group" aria-label="Change status">
            {BOOKING_STATUS_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => changeStatus(key)}
                disabled={saving}
                aria-pressed={booking.status === key}
                className={cn("ts-detail-status-btn", booking.status === key && "is-active")}
              >
                {BOOKING_STATUS_META[key].label}
              </button>
            ))}
          </div>

          {saveError && (
            <p className="ts-dash-error" role="alert">
              {saveError}
            </p>
          )}
        </div>

        {/* ── system ─────────────────────────────────────────────────── */}
        <div className="ts-detail-block">
          <span className="ts-label ts-detail-legend">SYSTEM</span>
          <dl className="ts-detail-rows">
            <div className="ts-detail-row">
              <dt className="ts-label ts-detail-key">BOOKED</dt>
              <dd className="ts-detail-val">{stamp(booking.createdAt)}</dd>
            </div>
            {booking.mail && (
              <div className="ts-detail-row">
                <dt className="ts-label ts-detail-key">MAIL</dt>
                <dd className="ts-detail-val ts-detail-mail">
                  <span data-state={booking.mail.customer}>
                    client: {booking.mail.customer}
                  </span>
                  <span data-state={booking.mail.internal}>
                    internal: {booking.mail.internal}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* ── the action ─────────────────────────────────────────────────
          One tap on a phone, one click to hand the number to a desktop
          softphone. This pane's whole purpose is to end in a call. */}
      <div className="ts-detail-foot">
        <a href={`tel:${booking.phone}`} className="ts-detail-reply">
          <span className="ts-label">CALL {booking.phone}</span>
          <Phone size={16} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
