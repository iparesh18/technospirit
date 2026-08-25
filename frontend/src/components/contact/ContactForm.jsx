import { useCallback, useRef, useState } from "react";
import FormField from "@/components/contact/FormField";
import ContactCTA from "@/components/contact/ContactCTA";
import { SystemLabel } from "@/components/ui/SystemLabel";
import { submitInquiry } from "@/lib/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = "TELL US WHO YOU ARE";
  if (!EMAIL.test(values.email.trim())) errors.email = "CHECK THIS ADDRESS";
  if (values.message.trim().length < 12) errors.message = "A LINE OR TWO MORE";
  return errors;
}

/**
 * The calm half. The left side is where the page is expressive; this side is
 * where it is useful, and the contrast is the point — three fields, one
 * button, nothing that moves unless the visitor moved it.
 */
export default function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  /** Server-level failure (network, rate limit, 500) — distinct from `errors`,
   *  which is per-field. One line above the button, never a layout shift. */
  const [failure, setFailure] = useState(null);
  const nodes = useRef(new Map());
  /**
   * The honeypot value. A real visitor never types into it — it is rendered
   * off-screen and hidden from assistive tech — so anything non-empty here
   * came from a bot filling every input it found.
   */
  const honeypot = useRef(null);
  /**
   * Guards the in-flight window. `status` alone is not enough: two submit
   * events in the same tick both read the old state and both would fire a
   * request, creating two inquiries for one message.
   */
  const inFlight = useRef(false);

  const register = useCallback((id, node) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    // Clear on type, re-check on submit. Validating every keystroke means
    // telling someone their email is wrong while they are still typing it.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    // Two gates on purpose: `inFlight` closes the same-tick double-submit that
    // a state check cannot see, `status` covers the rest.
    if (inFlight.current || status !== "idle") return;

    setFailure(null);

    const found = validate(values);
    setErrors(found);

    const first = ["name", "email", "message"].find((k) => found[k]);
    if (first) {
      nodes.current.get(`contact-${first}`)?.focus();
      return;
    }

    inFlight.current = true;
    setStatus("sending");

    try {
      await submitInquiry({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        // Empty for a human; the server answers 200 either way and never says
        // it noticed, so a bot learns nothing from being caught.
        website: honeypot.current?.value ?? "",
      });
      setStatus("sent");
    } catch (error) {
      /**
       * The server is the real validator, so if it disagreed per-field, its
       * messages win and the visitor is returned to the form rather than being
       * shown a generic failure they cannot act on.
       */
      if (error.fields) {
        const mapped = {};
        for (const [key, message] of Object.entries(error.fields)) {
          if (key in values) mapped[key] = String(message).toUpperCase();
        }
        setErrors(mapped);
        const firstServer = ["name", "email", "message"].find((k) => mapped[k]);
        if (firstServer) nodes.current.get(`contact-${firstServer}`)?.focus();
      } else {
        setFailure(error.message);
      }
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  };

  if (status === "sent") {
    return (
      <div className="ts-form-done" role="status">
        <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-4">
          <SystemLabel className="text-ink">THE BRIEF</SystemLabel>
          <SystemLabel className="text-signal-ink">LOGGED</SystemLabel>
        </div>

        <p className="ts-display-tight mt-9 text-[clamp(2rem,5vw,3.4rem)] text-ink">
          Got it,
          <br />
          {values.name.trim().split(" ")[0]}.
        </p>

        <p className="ts-body mt-6 max-w-sm border-t-2 border-ink pt-5 text-[0.98rem] text-ash">
          We have what we need to come back to you with the system, what it takes, and how
          long it runs.
        </p>

        <dl className="mt-8 border-t border-hair">
          {[["REPLY TO", values.email.trim()]].map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-5 border-b border-hair py-3">
              <dt className="ts-label w-24 shrink-0 text-ash-dim">{k}</dt>
              <dd className="ts-body min-w-0 truncate text-[0.95rem] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <form className="ts-form" onSubmit={onSubmit} noValidate>
      <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-4">
        <SystemLabel className="text-ink">THE BRIEF</SystemLabel>
        <SystemLabel className="hidden text-ash sm:inline-flex">03 FIELDS</SystemLabel>
      </div>

      <div className="ts-form-stack">
        <div data-c-field>
          <FormField
            id="contact-name"
            name="name"
            label="Name"
            hint="REQUIRED"
            autoComplete="name"
            placeholder="Your name"
            value={values.name}
            onChange={set("name")}
            error={errors.name}
            onRegister={register}
          />
        </div>

        <div data-c-field>
          <FormField
            id="contact-email"
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
        </div>

        <div data-c-field>
          <FormField
            id="contact-message"
            name="message"
            as="textarea"
            rows={4}
            label="Tell us about it"
            hint="REQUIRED"
            placeholder="The idea, the problem, or the opportunity…"
            value={values.message}
            onChange={set("message")}
            error={errors.message}
            onRegister={register}
          />
        </div>
      </div>

      {/* Honeypot. Off-screen rather than display:none — some bots skip
          fields that are not rendered — and removed from the accessibility
          tree and the tab order, so no real visitor can reach it. */}
      <div className="ts-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          ref={honeypot}
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div data-c-field className="ts-form-foot">
        {/* Reserves no height when empty, so a failure does not push the
            button down the page. */}
        {failure && (
          <p className="ts-label ts-form-error" role="alert">
            {failure}
          </p>
        )}

        <ContactCTA status={status} />
        <p className="ts-label ts-form-note">NO NEWSLETTER. NO SALES SEQUENCE.</p>
      </div>
    </form>
  );
}
