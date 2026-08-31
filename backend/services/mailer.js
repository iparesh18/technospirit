import nodemailer from "nodemailer";
import env from "../config/env.js";
import { cleanHeader } from "../utils/sanitize.js";
import {
  bookingConfirmation,
  bookingNotification,
  customerConfirmation,
  internalNotification,
} from "./emailTemplates.js";

/**
 * Mail transport.
 *
 * Deliberately lazy: the transporter is built on first use, not at import, so
 * the API can boot and accept inquiries with no mail credentials configured.
 * Mail is a side effect of an inquiry, never a precondition for one.
 */

let transporter = null;

function getTransporter() {
  if (!env.mail.configured) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.mail.user, pass: env.mail.pass },
    // Keep a hung SMTP handshake from holding a request open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

/** Confirms the credentials actually authenticate. Used by the health check. */
export async function verifyTransport() {
  const tx = getTransporter();
  if (!tx) return { configured: false, ok: false, reason: "not configured" };
  try {
    await tx.verify();
    return { configured: true, ok: true };
  } catch (error) {
    return { configured: true, ok: false, reason: error.message };
  }
}

/**
 * Sends one message and resolves to a result object — it never rejects.
 *
 * Callers treat mail as best-effort, so a failure has to be a value they can
 * record, not an exception that unwinds a request which has already committed
 * an inquiry to the database.
 */
async function send(message, { tag }) {
  const tx = getTransporter();

  if (!tx) {
    console.warn(`[mail] ${tag}: skipped — EMAIL_USER / EMAIL_APP_PASSWORD not configured.`);
    return { status: "skipped" };
  }

  try {
    const info = await tx.sendMail(message);
    console.log(`[mail] ${tag}: sent (${info.messageId})`);
    return { status: "sent", messageId: info.messageId };
  } catch (error) {
    // Log the reason for operators; the visitor is never told about it.
    console.error(`[mail] ${tag}: FAILED — ${error.message}`);
    return { status: "failed", reason: error.message };
  }
}

const from = () => `"TechnoSpirit" <${env.mail.user}>`;

export function sendCustomerConfirmation(inquiry) {
  const { subject, html, text } = customerConfirmation(inquiry);
  return send(
    { from: from(), to: inquiry.email, subject, html, text },
    { tag: "customer-confirmation" },
  );
}

export function sendInternalNotification(inquiry) {
  const { subject, html, text } = internalNotification(inquiry);
  return send(
    {
      from: from(),
      to: env.mail.receiver,
      subject: cleanHeader(subject),
      html,
      text,
      /**
       * The whole point of the internal mail: pressing Reply in Gmail must
       * address the visitor, not the TechnoSpirit account that sent it (which
       * is also the account receiving it — so without this, Reply would be a
       * mail to itself).
       */
      replyTo: `"${cleanHeader(inquiry.name, { maxLength: 80 })}" <${inquiry.email}>`,
    },
    { tag: "internal-notification" },
  );
}

/**
 * Both messages, in parallel, with neither able to fail the other or the
 * request. Returns the per-message outcome for persisting on the inquiry.
 */
export async function sendInquiryMail(inquiry) {
  const [customer, internal] = await Promise.all([
    sendCustomerConfirmation(inquiry),
    sendInternalNotification(inquiry),
  ]);
  return { customer: customer.status, internal: internal.status };
}

/* — call bookings ————————————————————————————————————
 *
 * Same transport, same `send()`, same never-rejects contract. There is exactly
 * one mail provider in this project and a booking does not get a second one —
 * only two more templates.
 */

export function sendBookingConfirmation(booking) {
  const { subject, html, text } = bookingConfirmation(booking);
  return send(
    { from: from(), to: booking.email, subject, html, text },
    { tag: "booking-confirmation" },
  );
}

export function sendBookingNotification(booking) {
  const { subject, html, text } = bookingNotification(booking);
  return send(
    {
      from: from(),
      /**
       * CONTACT_RECEIVER, read from the environment exactly like the inquiry
       * notification — never a literal address in code. It stays server-side;
       * nothing in the browser bundle knows where these land.
       */
      to: env.mail.receiver,
      subject: cleanHeader(subject),
      html,
      text,
      // Reply addresses the client, not the account that sent it.
      replyTo: `"${cleanHeader(booking.name, { maxLength: 80 })}" <${booking.email}>`,
    },
    { tag: "booking-notification" },
  );
}

/** Both booking messages, in parallel, neither able to fail the other. */
export async function sendBookingMail(booking) {
  const [customer, internal] = await Promise.all([
    sendBookingConfirmation(booking),
    sendBookingNotification(booking),
  ]);
  return { customer: customer.status, internal: internal.status };
}

export default { sendInquiryMail, sendBookingMail, verifyTransport };
