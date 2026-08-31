import { escapeHtml } from "../utils/sanitize.js";

/**
 * TechnoSpirit email identity.
 *
 * Email HTML is not web HTML. What is used here and why:
 *   - tables for layout, because Outlook (Word rendering engine) does not do
 *     flexbox, grid, or reliable float
 *   - every style inlined, because Gmail strips <style> in some views and
 *     removes <head> entirely when forwarding
 *   - no border-radius (the brand has none anyway), no shadows, no gradients
 *   - Archivo is NOT loaded; a webfont fails in most clients and falls back
 *     mid-render. Helvetica/Arial carries the same Swiss register natively,
 *     and the layout does not depend on the width axis the site uses
 *   - hard rules and generous spacing do the work the typography does on site
 *
 * The palette is the site's own: paper #ffffff, ink #000000, signal #ff2d16,
 * ash #6b6b6b, hairline #e4e4e4.
 */

const INK = "#000000";
const PAPER = "#ffffff";
const SIGNAL = "#ff2d16";
const ASH = "#6b6b6b";
const HAIR = "#e4e4e4";
const SMOKE = "#f4f4f4";

const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "SFMono-Regular, Consolas, Menlo, monospace";

/** Mono microcopy — the site's `.ts-label`, restated in email-safe CSS. */
const label = (text, color = ASH) =>
  `<span style="font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${color};">${escapeHtml(
    text,
  )}</span>`;

/** Preheader: the grey line a client shows next to the subject in the list. */
const preheader = (text) =>
  `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAPER};opacity:0;">${escapeHtml(
    text,
  )}</div>`;

/**
 * The shell every TechnoSpirit email sits in: centred 600px column on a smoke
 * ground, black rule at the top, wordmark, content, then the baseline.
 */
function shell({ title, preview, body }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${SMOKE};-webkit-text-size-adjust:100%;">
${preheader(preview)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SMOKE};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${PAPER};">

        <!-- top rule: the brand's hard black structure -->
        <tr><td style="background:${INK};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>

        <!-- wordmark -->
        <tr>
          <td style="padding:26px 40px 22px 40px;border-bottom:1px solid ${HAIR};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left" style="font-family:${SANS};font-size:17px;font-weight:800;letter-spacing:-0.01em;color:${INK};">
                  TECHNOSPIRIT
                </td>
                <td align="right">${label("Build. Automate. Scale.")}</td>
              </tr>
            </table>
          </td>
        </tr>

${body}

        <!-- baseline -->
        <tr>
          <td style="padding:24px 40px 30px 40px;border-top:1px solid ${HAIR};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left">${label("TechnoSpirit")}</td>
                <td align="right">${label("Without Borders.")}</td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  1. Customer confirmation                                           */
/* ------------------------------------------------------------------ */

export function customerConfirmation({ name, message, purpose }) {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "there";

  const body = `
        <tr>
          <td style="padding:44px 40px 0 40px;">
            ${label("Confirmation / Received", SIGNAL)}
          </td>
        </tr>

        <tr>
          <td style="padding:18px 40px 0 40px;font-family:${SANS};font-size:38px;line-height:1.02;font-weight:800;letter-spacing:-0.03em;color:${INK};">
            WE GOT YOUR<br />MESSAGE.
          </td>
        </tr>

        <tr>
          <td style="padding:28px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:${SIGNAL};height:3px;line-height:3px;font-size:0;width:64px;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;font-family:${SANS};font-size:16px;line-height:1.65;color:${INK};">
            Hi ${escapeHtml(firstName)},
          </td>
        </tr>

        <tr>
          <td style="padding:14px 40px 0 40px;font-family:${SANS};font-size:16px;line-height:1.65;color:${ASH};">
            Thanks for reaching out to TechnoSpirit.<br /><br />
            We&rsquo;ve received your inquiry and our team will review the details shortly.
            We&rsquo;ll come back to you with the system that solves it, what it takes, and
            how long it runs.
          </td>
        </tr>

        <!-- what they sent, so the reply has context without a second lookup -->
        <tr>
          <td style="padding:34px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${INK};">
              <tr>
                <td style="padding:16px 0 0 0;">${label("Your brief")}</td>
              </tr>
              ${purpose ? `<tr><td style="padding:14px 0 0 0;">${row("Purpose", purpose)}</td></tr>` : ""}
              <tr>
                <td style="padding:14px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};white-space:pre-wrap;">${escapeHtml(
                  message,
                )}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:34px 40px 40px 40px;font-family:${SANS};font-size:14px;line-height:1.6;color:${ASH};">
            No newsletter. No sales sequence. Just a reply from the people who would
            actually build it.
          </td>
        </tr>`;

  const text = [
    "WE GOT YOUR MESSAGE.",
    "",
    `Hi ${firstName},`,
    "",
    "Thanks for reaching out to TechnoSpirit.",
    "",
    "We've received your inquiry and our team will review the details shortly.",
    "We'll get back to you soon.",
    "",
    "— YOUR BRIEF —",
    purpose ? `Purpose: ${purpose}` : null,
    message,
    "",
    "TechnoSpirit",
    "Build. Automate. Scale.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: "We received your message — TechnoSpirit",
    html: shell({
      title: "We received your message",
      preview: "We've received your inquiry and will review the details shortly.",
      body,
    }),
    text,
  };
}

/* ------------------------------------------------------------------ */
/*  2. Internal notification                                           */
/* ------------------------------------------------------------------ */

/** One label/value pair on a hairline — the dashboard's row, in email HTML. */
function row(key, value, { mono = false } = {}) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="96" valign="top" style="padding:0 12px 0 0;">${label(key, "#9a9a9a")}</td>
      <td valign="top" style="font-family:${mono ? MONO : SANS};font-size:15px;line-height:1.55;color:${INK};">${escapeHtml(
        value,
      )}</td>
    </tr>
  </table>`;
}

export function internalNotification({ name, email, purpose, message, createdAt, id }) {
  const stamp = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(createdAt ?? new Date());

  const body = `
        <tr>
          <td style="padding:36px 40px 0 40px;">
            ${label("Internal / New inquiry", SIGNAL)}
          </td>
        </tr>

        <tr>
          <td style="padding:14px 40px 0 40px;font-family:${SANS};font-size:30px;line-height:1.06;font-weight:800;letter-spacing:-0.025em;color:${INK};">
            ${escapeHtml(name)}
          </td>
        </tr>

        <tr>
          <td style="padding:8px 40px 0 40px;font-family:${SANS};font-size:15px;color:${ASH};">
            ${escapeHtml(purpose || "General Inquiry")}
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${INK};">
              <tr><td style="padding:16px 0 0 0;">${row("Name", name)}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Email", email, { mono: true })}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Purpose", purpose || "General Inquiry")}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Received", `${stamp} UTC`, { mono: true })}</td></tr>
              ${id ? `<tr><td style="padding:12px 0 0 0;">${row("Ref", String(id), { mono: true })}</td></tr>` : ""}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIR};">
              <tr><td style="padding:16px 0 0 0;">${label("Message")}</td></tr>
              <tr>
                <td style="padding:12px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};white-space:pre-wrap;">${escapeHtml(
                  message,
                )}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Reply-To is set to the visitor, so Gmail's Reply goes to them. -->
        <tr>
          <td style="padding:30px 40px 40px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${INK};">
                  <a href="mailto:${encodeURI(email)}?subject=${encodeURIComponent(
                    "Re: Your TechnoSpirit inquiry",
                  )}"
                     style="display:inline-block;padding:14px 26px;font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${PAPER};text-decoration:none;">
                    Reply to ${escapeHtml(name)} &#8599;
                  </a>
                </td>
              </tr>
            </table>
            <div style="padding:14px 0 0 0;">${label("Reply goes straight to the sender")}</div>
          </td>
        </tr>`;

  const text = [
    `NEW INQUIRY — ${name} — ${purpose || "General Inquiry"}`,
    "",
    `Name:     ${name}`,
    `Email:    ${email}`,
    `Purpose:  ${purpose || "General Inquiry"}`,
    `Received: ${stamp} UTC`,
    id ? `Ref:      ${id}` : null,
    "",
    "Message:",
    message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: `New Inquiry — ${name} — ${purpose || "General Inquiry"}`,
    html: shell({
      title: "New inquiry",
      preview: `${name} · ${purpose || "General Inquiry"}`,
      body,
    }),
    text,
  };
}

/* ------------------------------------------------------------------ */
/*  3. Call booking — shared time formatting                           */
/* ------------------------------------------------------------------ */

/**
 * One instant, rendered the way the person reading it experiences it.
 *
 * The booking is stored in UTC with the visitor's IANA zone beside it, so
 * every human-readable string in both emails is produced here from those two
 * values together. `zone` comes back as the platform's own abbreviation —
 * "EDT" in New York, "GMT+5:30" in Kolkata — which is the honest label for
 * zones that have no letters.
 *
 * An unusable zone (a browser sending something ICU does not know) falls back
 * to UTC rather than throwing: a confirmation email that fails to render is a
 * far worse outcome than one that says UTC.
 */
export function callStamp(scheduledAt, timeZone) {
  const at = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);

  const format = (options) => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: timeZone || "UTC", ...options }).format(at);
    } catch {
      return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(at);
    }
  };

  const zonePart = (() => {
    try {
      return (
        new Intl.DateTimeFormat("en-US", { timeZone: timeZone || "UTC", timeZoneName: "short" })
          .formatToParts(at)
          .find((part) => part.type === "timeZoneName")?.value ?? "UTC"
      );
    } catch {
      return "UTC";
    }
  })();

  return {
    /** "Tuesday, September 8, 2026" */
    date: format({ weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    /** "11:30 AM" */
    time: format({ hour: "numeric", minute: "2-digit", hour12: true }),
    /** "EDT" / "GMT+5:30" */
    zone: zonePart,
    /** "Asia/Kolkata" — the unambiguous machine form, printed for the team. */
    timeZone: timeZone || "UTC",
  };
}

/* ------------------------------------------------------------------ */
/*  4. Call booking — customer confirmation                            */
/* ------------------------------------------------------------------ */

export function bookingConfirmation({
  name,
  phone,
  scheduledAt,
  timezone,
  businessTimezone,
  discussion,
}) {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "there";

  /**
   * The booking clock leads, and it is TechnoSpirit's — the same Eastern Time
   * the popup labelled every slot with. This email has to repeat the time the
   * visitor actually pressed; leading with their own zone instead would state
   * a different-looking number for the same instant and read as a mistake.
   *
   * Their local time follows underneath whenever it differs, so nobody has to
   * do the arithmetic to know when the phone will ring.
   */
  const when = callStamp(scheduledAt, businessTimezone || timezone);
  const local =
    timezone && businessTimezone && timezone !== businessTimezone
      ? callStamp(scheduledAt, timezone)
      : null;

  const body = `
        <tr>
          <td style="padding:44px 40px 0 40px;">
            ${label("Confirmation / Call booked", SIGNAL)}
          </td>
        </tr>

        <tr>
          <td style="padding:18px 40px 0 40px;font-family:${SANS};font-size:38px;line-height:1.02;font-weight:800;letter-spacing:-0.03em;color:${INK};">
            YOU&rsquo;RE<br />BOOKED.
          </td>
        </tr>

        <tr>
          <td style="padding:28px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:${SIGNAL};height:3px;line-height:3px;font-size:0;width:64px;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;font-family:${SANS};font-size:16px;line-height:1.65;color:${INK};">
            Hi ${escapeHtml(firstName)},
          </td>
        </tr>

        <tr>
          <td style="padding:14px 40px 0 40px;font-family:${SANS};font-size:16px;line-height:1.65;color:${ASH};">
            Your call with TechnoSpirit has been booked successfully.
          </td>
        </tr>

        <!-- The three facts the reader actually opened this to check. Large,
             on their own rule, above everything else. -->
        <tr>
          <td style="padding:32px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${INK};">
              <tr><td style="padding:18px 0 0 0;">${label("Call details")}</td></tr>
              <tr>
                <td style="padding:14px 0 0 0;font-family:${SANS};font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${INK};">
                  ${escapeHtml(when.date)}
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0 0 0;font-family:${SANS};font-size:22px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${INK};">
                  ${escapeHtml(when.time)} <span style="color:${SIGNAL};">${escapeHtml(when.zone)}</span>
                </td>
              </tr>
${
  local
    ? `              <tr>
                <td style="padding:10px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${ASH};">
                  ${escapeHtml(local.date)} &middot; ${escapeHtml(local.time)} ${escapeHtml(local.zone)}
                  <span style="font-size:13px;">&nbsp;your local time</span>
                </td>
              </tr>`
    : ""
}
              <tr>
                <td style="padding:8px 0 0 0;font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${ASH};">
                  ${escapeHtml(when.timeZone)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIR};">
              <tr><td style="padding:16px 0 0 0;">${label("We'll call you at")}</td></tr>
              <tr>
                <td style="padding:10px 0 0 0;font-family:${MONO};font-size:18px;letter-spacing:0.02em;color:${INK};">
                  ${escapeHtml(phone)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;font-family:${SANS};font-size:16px;line-height:1.65;color:${ASH};">
            Please be available at the scheduled time so our team can reach you.<br /><br />
            We&rsquo;ll use the conversation to understand what you&rsquo;re looking to build, the
            problem you&rsquo;re trying to solve, and how TechnoSpirit may be able to help.
          </td>
        </tr>
${
  discussion
    ? `
        <tr>
          <td style="padding:30px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIR};">
              <tr><td style="padding:16px 0 0 0;">${label("What you'd like to discuss")}</td></tr>
              <tr>
                <td style="padding:12px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};white-space:pre-wrap;">${escapeHtml(
                  discussion,
                )}</td>
              </tr>
            </table>
          </td>
        </tr>`
    : ""
}
        <tr>
          <td style="padding:30px 40px 0 40px;font-family:${SANS};font-size:16px;line-height:1.65;color:${ASH};">
            If anything changes, simply reply to this email and let us know.<br /><br />
            Looking forward to speaking with you.
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 40px 40px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};">
            <strong style="font-weight:800;">TechnoSpirit</strong><br />
            <span style="color:${ASH};">AI &middot; Automation &middot; Digital Engineering</span>
          </td>
        </tr>`;

  const text = [
    "YOU'RE BOOKED.",
    "",
    `Hi ${firstName},`,
    "",
    "Your call with TechnoSpirit has been booked successfully.",
    "",
    "— CALL DETAILS —",
    when.date,
    `${when.time} ${when.zone} (${when.timeZone})`,
    local ? `${local.date} · ${local.time} ${local.zone} — your local time` : null,
    "",
    `We'll call you at: ${phone}`,
    "",
    "Please be available at the scheduled time so our team can reach you.",
    "We'll use the conversation to understand what you're looking to build, the",
    "problem you're trying to solve, and how TechnoSpirit may be able to help.",
    discussion ? "" : null,
    discussion ? "— WHAT YOU'D LIKE TO DISCUSS —" : null,
    discussion || null,
    "",
    "If anything changes, simply reply to this email and let us know.",
    "Looking forward to speaking with you.",
    "",
    "TechnoSpirit",
    "AI · Automation · Digital Engineering",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: "Your call with TechnoSpirit is confirmed",
    html: shell({
      title: "Your call is confirmed",
      preview: `${when.date} at ${when.time} ${when.zone} — we'll call ${phone}.`,
      body,
    }),
    text,
  };
}

/* ------------------------------------------------------------------ */
/*  5. Call booking — internal notification                            */
/* ------------------------------------------------------------------ */

/**
 * Written to be read in five seconds on a phone: who, when, where they are,
 * what number to dial, what they want. The visitor's local time is the headline
 * because that is the number the team has to hit; the business-timezone
 * rendering sits underneath it so nobody has to do the conversion.
 */
export function bookingNotification({
  name,
  email,
  phone,
  country,
  company,
  discussion,
  scheduledAt,
  timezone,
  businessTimezone,
  createdAt,
  id,
}) {
  /**
   * Our clock leads here too, and for the same reason as the client email:
   * this is the time the client was shown and agreed to, so it is the time the
   * team has to dial at. Their own local time follows underneath when it says
   * something different — useful for knowing whether you are calling into
   * someone's evening.
   */
  const client = callStamp(scheduledAt, businessTimezone || timezone);
  const local =
    timezone && businessTimezone && timezone !== businessTimezone
      ? callStamp(scheduledAt, timezone)
      : null;

  const created = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(createdAt ?? new Date());

  const body = `
        <tr>
          <td style="padding:36px 40px 0 40px;">
            ${label("Internal / New call booking", SIGNAL)}
          </td>
        </tr>

        <tr>
          <td style="padding:14px 40px 0 40px;font-family:${SANS};font-size:30px;line-height:1.06;font-weight:800;letter-spacing:-0.025em;color:${INK};">
            ${escapeHtml(name)}
          </td>
        </tr>

        <tr>
          <td style="padding:8px 40px 0 40px;font-family:${SANS};font-size:15px;color:${ASH};">
            ${escapeHtml(company || country || "New booking")}
          </td>
        </tr>

        <!-- WHEN, first and largest. -->
        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${INK};">
              <tr><td style="padding:16px 0 0 0;">${label("Call")}</td></tr>
              <tr>
                <td style="padding:12px 0 0 0;font-family:${SANS};font-size:20px;line-height:1.3;font-weight:800;letter-spacing:-0.02em;color:${INK};">
                  ${escapeHtml(client.date)}<br />
                  ${escapeHtml(client.time)} <span style="color:${SIGNAL};">${escapeHtml(client.zone)}</span>
                  <span style="font-size:13px;font-weight:400;color:${ASH};">&nbsp;our time</span>
                </td>
              </tr>
${
  local
    ? `              <tr>
                <td style="padding:10px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${ASH};">
                  ${escapeHtml(local.date)} &middot; ${escapeHtml(local.time)} ${escapeHtml(local.zone)}
                  <span style="font-size:13px;">&nbsp;client local time</span>
                </td>
              </tr>`
    : ""
}
              <tr><td style="padding:12px 0 0 0;">${row("Timezone", client.timeZone, { mono: true })}</td></tr>
            </table>
          </td>
        </tr>

        <!-- WHO. -->
        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIR};">
              <tr><td style="padding:16px 0 0 0;">${label("Client")}</td></tr>
              <tr><td style="padding:14px 0 0 0;">${row("Name", name)}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Email", email, { mono: true })}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Phone", phone, { mono: true })}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Country", country)}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Company", company || "—")}</td></tr>
            </table>
          </td>
        </tr>

        <!-- WHAT. -->
        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIR};">
              <tr><td style="padding:16px 0 0 0;">${label("Discussion")}</td></tr>
              <tr>
                <td style="padding:12px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};white-space:pre-wrap;">${escapeHtml(
                  discussion || "Not specified.",
                )}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 40px 0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIR};">
              <tr><td style="padding:16px 0 0 0;">${label("Booking created")}</td></tr>
              <tr><td style="padding:12px 0 0 0;">${row("Created", `${created} UTC`, { mono: true })}</td></tr>
              ${id ? `<tr><td style="padding:12px 0 0 0;">${row("Ref", String(id), { mono: true })}</td></tr>` : ""}
            </table>
          </td>
        </tr>

        <!-- One tap dials them. Reply-To is the client, same as the inquiry mail. -->
        <tr>
          <td style="padding:30px 40px 40px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${INK};">
                  <a href="tel:${encodeURI(phone)}"
                     style="display:inline-block;padding:14px 26px;font-family:${MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${PAPER};text-decoration:none;">
                    Call ${escapeHtml(phone)} &#8599;
                  </a>
                </td>
              </tr>
            </table>
            <div style="padding:14px 0 0 0;">${label("Reply goes straight to the client")}</div>
          </td>
        </tr>`;

  const text = [
    `NEW CALL BOOKING — ${name}`,
    "",
    "— CLIENT —",
    `Name:     ${name}`,
    `Email:    ${email}`,
    `Phone:    ${phone}`,
    `Country:  ${country}`,
    `Company:  ${company || "—"}`,
    "",
    "— CALL —",
    `Date:     ${client.date}`,
    `Time:     ${client.time} ${client.zone}  (our time — what the client was shown)`,
    `Timezone: ${client.timeZone}`,
    local ? `Client local: ${local.date} · ${local.time} ${local.zone}` : null,
    "",
    "— DISCUSSION —",
    discussion || "Not specified.",
    "",
    "— BOOKING CREATED —",
    `${created} UTC`,
    id ? `Ref: ${id}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: `New Call Booked — ${name}`,
    html: shell({
      title: "New call booking",
      preview: `${client.date} · ${client.time} ${client.zone} · ${phone}`,
      body,
    }),
    text,
  };
}
