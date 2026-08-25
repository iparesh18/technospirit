import mongoose from "mongoose";

/** The only values `status` may hold. Exported so routes can validate against it. */
export const INQUIRY_STATUSES = ["new", "contacted", "in-progress", "closed"];

/**
 * Same shape the frontend validates, restated here because frontend validation
 * is a convenience for the visitor and this is the actual gate. A request that
 * never touched the form still has to satisfy it.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: [2, "Name is too short."],
      maxlength: [120, "Name is too long."],
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email is too long."],
      match: [EMAIL_RE, "Email is not a valid address."],
    },

    /**
     * What the inquiry is about.
     *
     * The live contact form collects three fields — name, email, message — and
     * has no purpose selector (an earlier one was deliberately removed; the
     * intent list on /contact is read, not operated). So this is optional with
     * a default, and the API accepts it when a caller does send one. Adding a
     * purpose control to the form later needs no schema change.
     */
    purpose: {
      type: String,
      trim: true,
      maxlength: [120, "Purpose is too long."],
      default: "General Inquiry",
    },

    message: {
      type: String,
      required: [true, "Message is required."],
      trim: true,
      minlength: [12, "Message is too short."],
      maxlength: [5000, "Message is too long."],
    },

    status: {
      type: String,
      enum: { values: INQUIRY_STATUSES, message: "`{VALUE}` is not a valid status." },
      default: "new",
      index: true,
    },

    /**
     * Delivery is recorded but never gates the write — see
     * `controllers/contactController.js`. The database is the source of truth
     * for an inquiry; mail is a side effect that is allowed to fail.
     */
    mail: {
      customer: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
      internal: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    },

    /** Request metadata, for spam triage. Never shown to the visitor. */
    meta: {
      ip: { type: String, select: false },
      userAgent: { type: String, select: false, maxlength: 512 },
    },
  },
  {
    timestamps: true,
    // Drop `__v` and `meta` from anything that gets serialised to the client.
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        delete ret.meta;
        return ret;
      },
    },
  },
);

/**
 * The admin list is always "newest first, optionally filtered by status", and
 * the search path scans name/email/purpose/message. These two cover both.
 */
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Inquiry", inquirySchema);
