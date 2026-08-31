import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import FormField from "@/components/contact/FormField";
import { COUNTRIES, countryByCode, guessCountry } from "./countries";
import {
  groupByDay,
  longDate,
  slotTime,
  visitorTimeZone,
  zoneAbbr,
  zoneLongName,
} from "./bookingTime";
import { createBooking, fetchAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";
import "@/styles/booking.css";

/**
 * BOOK A CALL.
 *
 * A portal at the document root, not a child of /contact — the page underneath
 * keeps its own GSAP timeline, its own scroll triggers and its own layout, and
 * this file adds nothing to any of them. Nothing here reaches into the Contact
 * page and the Contact page owns nothing here except the flag that opens it.
 *
 * All motion is CSS keyframes keyed on `data-state`, which is this project's
 * rule for overlays and portals (motion rule 5). A GSAP timeline keyed on an
 * `open` prop cannot win the race against the portal's own mount — the children
 * do not exist on the frame the flag flips — and that failure has already been
 * paid for once here, in the mobile menu.
 */

/* The exit duration lives with the opener that has to wait for it — see
   BOOKING_EXIT_MS in pages/Contact.jsx, and the keyframes in booking.css. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** E.164, restated on the client so a visitor gets an answer without a round
 *  trip. The server applies the identical rule and is the one that counts. */
const E164 = /^\+[1-9]\d{6,17}$/;

const COPY = {
  idle: "BOOK CALL",
  sending: "BOOKING...",
};

/**
 * Dial code + national number → one dialable string.
 *
 * The leading zero is dropped: UK, India and most of Europe write their numbers
 * with a trunk prefix that is wrong once a country code is in front of it, and
 * "+44 07911…" is not a number anyone can ring.
 */
function toE164(dial, national) {
  const digits = String(national ?? "").replace(/\D/g, "").replace(/^0+/, "");
  const code = String(dial ?? "").replace(/\D/g, "");
  return digits && code ? `+${code}${digits}` : "";
}

export default function BookCallModal({ state, onClose }) {
  const panel = useRef(null);
  const scroller = useRef(null);
  const nodes = useRef(new Map());
  const honeypot = useRef(null);
  /** Closes the same-tick double submit that a state check cannot see. */
  const inFlight = useRef(false);

  const timeZone = useMemo(() => visitorTimeZone(), []);

  const [values, setValues] = useState(() => {
    const guess = guessCountry(timeZone);
    return {
      name: "",
      email: "",
      phone: "",
      countryCode: guess?.code ?? "",
      dial: guess?.dial ?? "",
      company: "",
      discussion: "",
      slot: "",
    };
  });

  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  /** "idle" | "sending" | "done" */
  const [status, setStatus] = useState("idle");
  const [confirmed, setConfirmed] = useState(null);

  const [slots, setSlots] = useState(null);
  /**
   * TechnoSpirit's own zone, as reported by the availability endpoint.
   *
   * Every time in this popup is printed in it. That is the deliberate choice:
   * the calendar is TechnoSpirit's working day, the clients this is built for
   * are in the US, and a published standard beats a per-visitor rendering that
   * showed an Indian reader slots at 12:30 AM. Null until the first response —
   * the calendar does not render before then.
   */
  const [bookingZone, setBookingZone] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [dayKey, setDayKey] = useState("");

  const register = useCallback((id, node) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  /* — availability ————————————————————————————————
   * Fetched on mount and re-fetched after a lost race. Nothing about the
   * calendar is decided here: the browser receives instants and renders them.
   */
  const load = useCallback((signal) => {
    setLoadState("loading");
    return fetchAvailability(signal)
      .then((data) => {
        setSlots(data.slots ?? []);
        if (data.businessTimezone) setBookingZone(data.businessTimezone);
        setLoadState("ready");
        return data.slots ?? [];
      })
      .catch((error) => {
        if (error?.name === "AbortError") return [];
        setLoadState("error");
        return [];
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * The zone every time in this popup is printed in.
   *
   * Falls back to the visitor's only if the endpoint somehow sent no business
   * zone — a rendering in *some* named zone beats no calendar at all.
   */
  const displayZone = bookingZone ?? timeZone;

  /** True when the reader is not already on the booking clock, and therefore
   *  needs the second line to know when their phone will ring. */
  const showLocal = displayZone !== timeZone;

  const days = useMemo(
    () => (slots ? groupByDay(slots, displayZone) : []),
    [slots, displayZone],
  );

  /**
   * The day on screen.
   *
   * Derived, not stored. `dayKey` only ever records what the visitor CLICKED;
   * which day is actually shown falls out of the current availability, so a
   * refetch that fills the selected day moves on by itself and there is no
   * effect writing state during a render pass to keep the two in step.
   */
  const activeDay =
    days.find((d) => d.key === dayKey && d.open) ??
    days.find((d) => d.open) ??
    days[0] ??
    null;

  /* — chrome —————————————————————————————————————
   * Escape, backdrop, focus and the page behind. Each is a separate effect so
   * one of them failing cannot take the others with it.
   */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * The page behind stops moving.
   *
   * `overflow: hidden` on <body> propagates to the viewport (the root element
   * has no overflow of its own), which is the same lock the dashboard drawer
   * uses. The padding compensates for the scrollbar the lock removes, so the
   * page underneath does not jump a few pixels wider as the scrim fades in.
   */
  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, []);

  /**
   * Focus lands inside before paint, so a screen reader announces the dialog
   * rather than the page it opened over.
   *
   * Queried from the DOM, NOT from the `nodes` registry: <FormField> registers
   * itself in a passive effect, and passive effects run after layout effects —
   * so on the mount frame the registry is still empty and this focused
   * nothing. The node itself, however, is already in the tree.
   */
  useLayoutEffect(() => {
    if (state !== "open") return;
    panel.current?.querySelector("#book-name")?.focus({ preventScroll: true });
  }, [state]);

  /** Small hand-rolled trap — the same one the chat panel uses, for the same
   *  reason: a known, short set of focusables does not need a dependency. */
  const onKeyDownCapture = useCallback((event) => {
    if (event.key !== "Tab" || !panel.current) return;
    const focusable = [
      ...panel.current.querySelectorAll(
        [
          'button:not(:disabled)',
          'input:not(:disabled)',
          'select:not(:disabled)',
          'textarea:not(:disabled)',
          'a[href]',
        ]
          // The honeypot and the scrim are both tabindex=-1 and must stay
          // outside the cycle, or Tab lands on an invisible input.
          .map((selector) => `${selector}:not([tabindex="-1"])`)
          .join(", "),
      ),
    ].filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  /* — form ———————————————————————————————————————— */

  const set = (key) => (event) => {
    const { value } = event.target;
    setValues((v) => ({ ...v, [key]: value }));
    // Clear on type, re-check on submit — telling someone their email is wrong
    // while they are still typing it is the classic validation mistake.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const selectCountry = (event) => {
    const country = countryByCode(event.target.value);
    setValues((v) => ({
      ...v,
      countryCode: country?.code ?? "",
      // The dial code follows the country unless the visitor has already
      // overridden it — someone in Germany may well be reachable on a +1.
      dial: country?.dial ?? v.dial,
    }));
    setErrors((e) => ({ ...e, countryCode: undefined, phone: undefined }));
  };

  /** Stable, so React does not detach and re-attach the ref every render. */
  const phoneRef = useCallback((node) => { register("book-phone", node); }, [register]);
  const countryRef = useCallback((node) => { register("book-countryCode", node); }, [register]);

  const chooseSlot = (iso) => {
    setValues((v) => ({ ...v, slot: v.slot === iso ? "" : iso }));
    setErrors((e) => (e.slot ? { ...e, slot: undefined } : e));
    setFailure(null);
  };

  function validate() {
    const found = {};
    if (values.name.trim().length < 2) found.name = "TELL US WHO YOU ARE";
    if (!EMAIL.test(values.email.trim())) found.email = "CHECK THIS ADDRESS";
    if (!E164.test(toE164(values.dial, values.phone))) found.phone = "CHECK THIS NUMBER";
    if (!values.countryCode) found.countryCode = "SELECT A COUNTRY";
    if (!values.slot) found.slot = "PICK A TIME";
    return found;
  }

  /** Where the focus goes when validation fails — the first problem, in the
   *  order the fields are read. */
  const FOCUS_ORDER = ["name", "email", "phone", "countryCode", "slot"];

  const focusFirstError = (found) => {
    const first = FOCUS_ORDER.find((key) => found[key]);
    if (!first) return;
    if (first === "slot") {
      scroller.current
        ?.querySelector("[data-book-slots]")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    nodes.current.get(`book-${first}`)?.focus();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (inFlight.current || status !== "idle") return;

    setFailure(null);

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }

    const phone = toE164(values.dial, values.phone);
    const country = countryByCode(values.countryCode);

    inFlight.current = true;
    setStatus("sending");

    try {
      const result = await createBooking({
        name: values.name.trim(),
        email: values.email.trim(),
        phone,
        dialCode: values.dial,
        country: country?.name ?? "",
        countryCode: values.countryCode,
        company: values.company.trim(),
        discussion: values.discussion.trim(),
        slot: values.slot,
        timezone: timeZone,
        // Empty for a human. The server answers 201 either way and never says
        // it noticed, so a bot learns nothing from being caught.
        website: honeypot.current?.value ?? "",
      });

      const at = new Date(result?.booking?.scheduledAt ?? values.slot);
      setConfirmed({
        // The booking clock, matching what was on the button they pressed and
        // what the confirmation email will say.
        date: longDate(at, displayZone),
        time: slotTime(at, displayZone),
        zone: zoneAbbr(at, displayZone),
        // …and the same instant where they are, for anyone outside it.
        localDate: showLocal ? longDate(at, timeZone) : null,
        localTime: showLocal ? slotTime(at, timeZone) : null,
        localZone: showLocal ? zoneAbbr(at, timeZone) : null,
        phone,
        email: values.email.trim(),
        name: values.name.trim(),
      });
      setStatus("done");
    } catch (error) {
      /**
       * The slot went while the form was being filled in. The honest response
       * is to say so, drop the dead selection and put fresh availability on
       * screen — not to retry the same booking against a slot that is gone.
       */
      if (error?.status === 409 || error?.code === "SLOT_TAKEN" || error?.code === "SLOT_INVALID") {
        setValues((v) => ({ ...v, slot: "" }));
        setFailure(error.message);
        load();
        setStatus("idle");
        return;
      }

      // The server is the real validator; when it disagrees per field its
      // messages win and the visitor is returned to the field, not to a
      // generic banner they cannot act on.
      if (error?.fields) {
        const mapped = {};
        for (const [key, message] of Object.entries(error.fields)) {
          const target = key === "country" ? "countryCode" : key;
          mapped[target] = String(message).toUpperCase();
        }
        setErrors(mapped);
        focusFirstError(mapped);
      } else if (error?.code === "NETWORK") {
        setFailure("We couldn't complete the booking. Please try again.");
      } else {
        setFailure(error?.message ?? "We couldn't complete the booking. Please try again.");
      }
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  };

  /* — render ———————————————————————————————————————— */

  /**
   * "EASTERN DAYLIGHT TIME · EDT", and "EASTERN STANDARD TIME · EST" after the
   * clocks go back — both read off Intl for the instant in question, so the
   * changeover needs no code change and cannot be stated wrongly.
   */
  const zoneLabel = useMemo(() => {
    const sample = values.slot ? new Date(values.slot) : new Date();
    const long = zoneLongName(sample, displayZone);
    const abbr = zoneAbbr(sample, displayZone);
    if (long && abbr) return `${long} · ${abbr}`;
    return abbr || long || displayZone;
  }, [displayZone, values.slot]);

  /** The selected slot where the visitor is sitting. Only ever rendered when
   *  that is a different clock from the one the buttons are labelled in. */
  const localEcho = useMemo(() => {
    if (!showLocal || !values.slot) return null;
    const at = new Date(values.slot);
    const abbr = zoneAbbr(at, timeZone);
    return `${slotTime(at, timeZone)}${abbr ? ` ${abbr}` : ""} · ${longDate(at, timeZone)}`;
  }, [showLocal, values.slot, timeZone]);

  const busy = status === "sending";

  const body = status === "done" && confirmed ? (
    /* ── confirmation ─────────────────────────────────────────────── */
    <div className="ts-bk-done" role="status">
      <span className="ts-label ts-bk-done-tag">CONFIRMED</span>

      <p className="ts-display-tight ts-bk-done-head">
        You&rsquo;re
        <br />
        booked.
      </p>

      <p className="ts-body ts-bk-done-lead">
        Your call with TechnoSpirit is confirmed.
      </p>

      <div className="ts-bk-done-when">
        <span className="ts-bk-done-date">{confirmed.date}</span>
        <span className="ts-bk-done-time">
          {confirmed.time}
          {confirmed.zone ? <em className="ts-bk-done-zone">{confirmed.zone}</em> : null}
        </span>
        {confirmed.localTime && (
          <span className="ts-label ts-bk-done-local">
            {confirmed.localTime}
            {confirmed.localZone ? ` ${confirmed.localZone}` : ""} · {confirmed.localDate} YOUR
            TIME
          </span>
        )}
      </div>

      <dl className="ts-bk-done-rows">
        <div className="ts-bk-done-row">
          <dt className="ts-label">WE&rsquo;LL CALL</dt>
          <dd>{confirmed.phone}</dd>
        </div>
        <div className="ts-bk-done-row">
          <dt className="ts-label">CONFIRMATION SENT TO</dt>
          <dd>{confirmed.email}</dd>
        </div>
      </dl>

      <button type="button" className="ts-cta ts-bk-submit" onClick={onClose} data-cursor="start">
        <span aria-hidden="true" className="ts-cta-fill" />
        <span className="ts-label ts-cta-label">DONE</span>
        <ArrowUpRight className="ts-cta-arrow" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  ) : (
    /* ── the form ─────────────────────────────────────────────────── */
    <form className="ts-bk-form" onSubmit={onSubmit} noValidate>
      <div className="ts-bk-scroll" ref={scroller}>
        {/* — 01 you — */}
        <section className="ts-bk-sect" aria-labelledby="ts-bk-you">
          <div className="ts-bk-sect-head">
            <span className="ts-label ts-bk-sect-idx">01</span>
            <span className="ts-label ts-bk-sect-name" id="ts-bk-you">
              YOU
            </span>
          </div>

          <div className="ts-bk-stack">
            <FormField
              id="book-name"
              name="name"
              label="Full name"
              hint="REQUIRED"
              autoComplete="name"
              placeholder="Your name"
              value={values.name}
              onChange={set("name")}
              error={errors.name}
              onRegister={register}
            />

            <FormField
              id="book-email"
              name="email"
              type="email"
              label="Email"
              hint="REQUIRED"
              autoComplete="email"
              inputMode="email"
              placeholder="you@company.com"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
              onRegister={register}
            />

            {/* Phone. A composite rather than a FormField, because two controls
                share one rule and one message slot — the dial code and the
                number are one answer, not two. */}
            <div className="ts-field" data-invalid={errors.phone ? "" : undefined}>
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor="book-phone" className="ts-label ts-field-label">
                  Phone number
                </label>
                <span
                  id="book-phone-msg"
                  className={cn("ts-label ts-field-msg", errors.phone && "ts-field-msg-error")}
                  aria-live="polite"
                >
                  {errors.phone || "REQUIRED"}
                </span>
              </div>

              <div className="ts-field-box ts-bk-phone">
                <select
                  className="ts-bk-dial"
                  aria-label="Country dialling code"
                  value={values.dial}
                  onChange={(event) => {
                    setValues((v) => ({ ...v, dial: event.target.value }));
                    setErrors((e) => (e.phone ? { ...e, phone: undefined } : e));
                  }}
                >
                  <option value="">+—</option>
                  {COUNTRIES.map((c) => (
                    <option key={`${c.code}-dial`} value={c.dial}>
                      {c.dial} {c.code}
                    </option>
                  ))}
                </select>

                <input
                  ref={phoneRef}
                  id="book-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="201 555 0147"
                  className="ts-field-input ts-bk-phone-input"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby="book-phone-msg book-phone-note"
                  value={values.phone}
                  onChange={set("phone")}
                />

                <span className="ts-field-rule" aria-hidden="true">
                  <span className="ts-field-rule-live" />
                </span>
              </div>

              <p className="ts-label ts-bk-note" id="book-phone-note">
                WE&rsquo;LL CALL YOU AT THIS NUMBER AT THE SCHEDULED TIME.
              </p>
            </div>

            {/* Country. A native select on purpose — it is the control every
                mobile OS already knows how to present, and a custom listbox
                here would be a worse version of it. */}
            <div className="ts-field" data-invalid={errors.countryCode ? "" : undefined}>
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor="book-countryCode" className="ts-label ts-field-label">
                  Country
                </label>
                <span
                  id="book-countryCode-msg"
                  className={cn(
                    "ts-label ts-field-msg",
                    errors.countryCode && "ts-field-msg-error",
                  )}
                  aria-live="polite"
                >
                  {errors.countryCode || "REQUIRED"}
                </span>
              </div>

              <div className="ts-field-box">
                <select
                  ref={countryRef}
                  id="book-countryCode"
                  name="country"
                  className="ts-field-input ts-bk-select"
                  aria-invalid={errors.countryCode ? true : undefined}
                  aria-describedby="book-countryCode-msg"
                  value={values.countryCode}
                  onChange={selectCountry}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="ts-field-rule" aria-hidden="true">
                  <span className="ts-field-rule-live" />
                </span>
              </div>
            </div>

            <FormField
              id="book-company"
              name="company"
              label="Company"
              hint="OPTIONAL"
              autoComplete="organization"
              placeholder="Where you work"
              value={values.company}
              onChange={set("company")}
              onRegister={register}
            />
          </div>
        </section>

        {/* — 02 when — */}
        <section className="ts-bk-sect" aria-labelledby="ts-bk-when" data-book-slots>
          <div className="ts-bk-sect-head">
            <span className="ts-label ts-bk-sect-idx">02</span>
            <span className="ts-label ts-bk-sect-name" id="ts-bk-when">
              WHEN
            </span>
            <span
              className={cn("ts-label ts-bk-sect-msg", errors.slot && "ts-field-msg-error")}
              aria-live="polite"
            >
              {errors.slot || "REQUIRED"}
            </span>
          </div>

          {/* The one line that removes every timezone ambiguity from the rest
              of this section, and from both emails. */}
          <p className="ts-label ts-bk-zone">
            ALL TIMES IN <strong>{zoneLabel}</strong>
          </p>

          {loadState === "loading" && (
            <p className="ts-bk-state" role="status">
              Loading available times…
            </p>
          )}

          {loadState === "error" && (
            <div className="ts-bk-state">
              <p>We couldn&rsquo;t load the calendar.</p>
              <button type="button" className="ts-bk-retry ts-label" onClick={() => load()}>
                TRY AGAIN
              </button>
            </div>
          )}

          {loadState === "ready" && days.length === 0 && (
            <p className="ts-bk-state" role="status">
              There are no times available right now. Send a brief instead and we&rsquo;ll come
              back with one.
            </p>
          )}

          {loadState === "ready" && days.length > 0 && (
            <>
              <div className="ts-bk-daylabel ts-label">CHOOSE A DAY</div>
              <div className="ts-bk-days" role="group" aria-label="Choose a day">
                {days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    disabled={!day.open}
                    onClick={() => setDayKey(day.key)}
                    aria-pressed={day.key === activeDay?.key}
                    className={cn("ts-bk-day", day.key === activeDay?.key && "is-active")}
                  >
                    <span className="ts-bk-day-wd">{day.weekday}</span>
                    <span className="ts-bk-day-no">{day.day}</span>
                    <span className="ts-bk-day-mo">{day.month}</span>
                  </button>
                ))}
              </div>

              <div className="ts-bk-daylabel ts-label">
                CHOOSE A TIME
                {activeDay ? <em className="ts-bk-daylabel-day">{activeDay.long}</em> : null}
              </div>

              <div className="ts-bk-times" role="group" aria-label="Choose a time">
                {(activeDay?.slots ?? []).map((slot) => (
                  <button
                    key={slot.at}
                    type="button"
                    disabled={slot.taken}
                    onClick={() => chooseSlot(slot.at)}
                    aria-pressed={values.slot === slot.at}
                    className={cn("ts-bk-time", values.slot === slot.at && "is-active")}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>

              {/* The one line a visitor outside Eastern Time needs, and only
                  when they have actually chosen something: the same instant on
                  their own clock, so nobody works out the offset in their head
                  and nobody misses the call. Absent entirely for a US reader,
                  for whom it would just repeat the button they pressed. */}
              {localEcho && (
                <p className="ts-label ts-bk-local" aria-live="polite">
                  YOUR LOCAL TIME — <strong>{localEcho}</strong>
                </p>
              )}
            </>
          )}
        </section>

        {/* — 03 context — */}
        <section className="ts-bk-sect" aria-labelledby="ts-bk-what">
          <div className="ts-bk-sect-head">
            <span className="ts-label ts-bk-sect-idx">03</span>
            <span className="ts-label ts-bk-sect-name" id="ts-bk-what">
              CONTEXT
            </span>
          </div>

          <FormField
            id="book-discussion"
            name="discussion"
            as="textarea"
            rows={3}
            label="What would you like to discuss?"
            hint="OPTIONAL"
            placeholder="AI automation, a chatbot, a voice agent, a website, custom software — or something else."
            value={values.discussion}
            onChange={set("discussion")}
            onRegister={register}
          />
        </section>

        {/* Honeypot — off-screen rather than display:none, so a bot that skips
            undisplayed inputs skips the trap too. */}
        <div className="ts-honeypot" aria-hidden="true">
          <label htmlFor="book-website">Website</label>
          <input
            ref={honeypot}
            id="book-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>
      </div>

      <div className="ts-bk-foot">
        {failure && (
          <p className="ts-label ts-form-error ts-bk-failure" role="alert">
            {failure}
          </p>
        )}

        <button
          type="submit"
          data-cursor="start"
          disabled={busy}
          className="ts-cta ts-bk-submit"
          aria-live="polite"
        >
          <span aria-hidden="true" className="ts-cta-fill" />
          <span className="ts-label ts-cta-label">{COPY[status] ?? COPY.idle}</span>
          <ArrowUpRight className="ts-cta-arrow" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </form>
  );

  return createPortal(
    <div className="ts-bk-root" data-state={state}>
      <button
        type="button"
        className="ts-bk-scrim"
        aria-label="Close booking"
        tabIndex={-1}
        onClick={onClose}
      />

      <div
        ref={panel}
        className="ts-bk-panel"
        data-zone="paper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ts-bk-title"
        /* The site cursor arms a 58px red block over anything button-shaped.
           This is a dense form with forty of them; the same escape hatch the
           chat panel and the intent list use gets it out of the way. */
        data-cursor-mute=""
        onKeyDownCapture={onKeyDownCapture}
      >
        <header className="ts-bk-head">
          <span className="ts-label ts-bk-title" id="ts-bk-title">
            BOOK A CALL
          </span>
          <button
            type="button"
            className="ts-bk-close"
            onClick={onClose}
            aria-label="Close booking"
          >
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        {body}
      </div>
    </div>,
    document.body,
  );
}
