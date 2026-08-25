/**
 * Input hygiene.
 *
 * Two separate jobs that are easy to confuse:
 *
 * 1. `cleanText` normalises what gets STORED — trims, collapses runaway
 *    whitespace, strips control characters. It does not try to be an HTML
 *    sanitiser, because the stored value is never interpolated into markup
 *    as HTML: the dashboard renders it as a React text node, and the emails
 *    run it through `escapeHtml` below.
 *
 * 2. `escapeHtml` is what makes a value safe to drop into an email template.
 *    That is the one place in this codebase where an inquiry field really does
 *    become HTML, so it is the one place that has to escape.
 */

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function cleanText(value, { maxLength = 5000 } = {}) {
  if (typeof value !== "string") return "";
  return value
    .replace(CONTROL_CHARS, "")
    .replace(/\r\n/g, "\n")
    // Cap consecutive blank lines; a message is allowed paragraphs, not a void.
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]{3,}/g, "  ")
    .trim()
    .slice(0, maxLength);
}

/** Single-line fields: the above, plus newlines folded to spaces. */
export function cleanLine(value, { maxLength = 254 } = {}) {
  return cleanText(value, { maxLength: maxLength * 2 })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Escapes a value for use inside an email header (Subject, Reply-To).
 * Newlines in a header are header injection; nodemailer guards this too, but
 * the visitor's name reaches a Subject line and it costs nothing to be sure.
 */
export function cleanHeader(value, { maxLength = 160 } = {}) {
  return cleanLine(value, { maxLength }).replace(/[\r\n]/g, " ");
}

/**
 * Escapes a user string for safe use inside a RegExp. The admin search box
 * builds a `$regex` query, and an unescaped `(` or `*` there is either a crash
 * or a catastrophic-backtracking DoS.
 */
export function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
