import Inquiry from "../models/Inquiry.js";
import AppError from "../utils/AppError.js";
import { cleanLine, cleanText } from "../utils/sanitize.js";
import { sendInquiryMail } from "../services/mailer.js";

/**
 * POST /api/contact
 *
 * The ordering here is the whole design, and it is deliberate:
 *
 *   1. save the inquiry
 *   2. respond to the visitor
 *   3. send mail, and record the outcome on the row already saved
 *
 * Mail is NOT awaited before responding, and a mail failure never rolls back
 * or re-runs the write. That is what stops the failure mode the brief calls
 * out: if delivery were awaited and threw, a client retry would create a
 * second inquiry for one real message. The database is the source of truth;
 * mail is a side effect that is allowed to fail, and its failure is recorded
 * on the document (`mail.customer` / `mail.internal`) rather than surfaced to
 * the visitor, who did nothing wrong and can do nothing about it.
 */
export async function createInquiry(req, res, next) {
  try {
    const { name, email, purpose, message, website } = req.body ?? {};

    /**
     * Honeypot. `website` is rendered off-screen and left empty by humans;
     * bots that fill every input they find populate it. Answer 200 with the
     * ordinary success shape — telling a bot it was detected just teaches the
     * next attempt to leave the field alone.
     */
    if (typeof website === "string" && website.trim() !== "") {
      console.warn(`[contact] honeypot tripped from ${req.ip}`);
      return res.status(201).json({ ok: true, message: "Inquiry received." });
    }

    const doc = {
      name: cleanLine(name, { maxLength: 120 }),
      email: cleanLine(email, { maxLength: 254 }).toLowerCase(),
      message: cleanText(message, { maxLength: 5000 }),
      meta: {
        ip: req.ip,
        userAgent: cleanLine(req.get("user-agent") ?? "", { maxLength: 512 }),
      },
    };

    // Only set purpose when one was actually sent; otherwise the schema
    // default ("General Inquiry") applies. The live form has no purpose field.
    const cleanPurpose = cleanLine(purpose, { maxLength: 120 });
    if (cleanPurpose) doc.purpose = cleanPurpose;

    // 1 — the write. Schema validators run here and are the real gate.
    const inquiry = await Inquiry.create(doc);

    // 2 — the visitor is done. Nothing below can change this answer.
    res.status(201).json({
      ok: true,
      message: "Inquiry received.",
      inquiry: { id: inquiry._id, name: inquiry.name, email: inquiry.email },
    });

    // 3 — mail, after the response, failing quietly into the document.
    sendInquiryMail({
      id: inquiry._id,
      name: inquiry.name,
      email: inquiry.email,
      purpose: inquiry.purpose,
      message: inquiry.message,
      createdAt: inquiry.createdAt,
    })
      .then((mail) =>
        Inquiry.updateOne({ _id: inquiry._id }, { $set: { mail } }).catch((error) =>
          console.error(`[contact] could not record mail status: ${error.message}`),
        ),
      )
      .catch((error) => console.error(`[contact] mail dispatch error: ${error.message}`));
  } catch (error) {
    // A write that failed means no inquiry exists — this one the visitor does
    // need to know about, because retrying is the correct thing to do.
    if (res.headersSent) {
      console.error(`[contact] post-response failure: ${error.message}`);
      return;
    }
    next(error);
  }
}

/** Small readiness probe used by the dev/test harness. */
export async function health(_req, res, next) {
  try {
    const total = await Inquiry.estimatedDocumentCount();
    res.json({ ok: true, service: "technospirit-api", inquiries: total });
  } catch (error) {
    next(AppError.badRequest(`Health check failed: ${error.message}`));
  }
}
