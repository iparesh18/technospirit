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
