import mongoose from "mongoose";

/** The only values `status` may hold. Exported so routes validate against it. */
export const BOOKING_STATUSES = ["scheduled", "completed", "cancelled", "no-show"];

/** Same rule the inquiry schema uses, restated rather than shared so neither
 *  collection can be loosened by a change made for the other. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * A booked call.
 *
 * TechnoSpirit phones the visitor, which decides the shape of this document:
 * `phone` is required and is the single most important field on it, and
 * `scheduledAt` is stored as a UTC instant with the visitor's IANA zone beside
 * it. Storing a wall-clock string plus a zone would make every read a parse;
 * storing the instant alone would lose the answer to "what time did they think
 * they were booking", which is what both emails have to say back to them.
 */
const callBookingSchema = new mongoose.Schema(
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

    /** Full international number, normalised to +<digits>. The dial code is
     *  kept separately as well, because "which country did they pick" is a
     *  different question from "what do we dial". */
    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      maxlength: [24, "Phone number is too long."],
      match: [/^\+[1-9]\d{6,17}$/, "Phone number is not valid."],
    },

    dialCode: {
      type: String,
      trim: true,
      maxlength: [8, "Dial code is too long."],
      default: "",
    },

    country: {
      type: String,
      required: [true, "Country is required."],
      trim: true,
      maxlength: [80, "Country is too long."],
    },

    /** ISO 3166-1 alpha-2. Optional: the country NAME is the required fact. */
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [2, "Country code is too long."],
      default: "",
    },

    company: {
      type: String,
      trim: true,
      maxlength: [140, "Company is too long."],
      default: "",
    },

    discussion: {
      type: String,
      trim: true,
      maxlength: [2000, "That is longer than this field takes."],
      default: "",
    },

    /** The call, as a UTC instant. Indexed because every list this collection
     *  serves is ordered by it. */
    scheduledAt: {
      type: Date,
      required: [true, "A time is required."],
      index: true,
    },

    /** The visitor's IANA zone, e.g. "Asia/Kolkata". What makes the stored
     *  instant renderable as the time they actually chose. */
    timezone: {
      type: String,
      required: [true, "A timezone is required."],
      trim: true,
      maxlength: [64, "Timezone is too long."],
    },

    /** TechnoSpirit's own zone at the moment of booking, so a later change to
     *  the schedule cannot retroactively reinterpret an old row. */
    businessTimezone: {
      type: String,
      trim: true,
      maxlength: [64, "Timezone is too long."],
      default: "",
    },

    status: {
      type: String,
      enum: { values: BOOKING_STATUSES, message: "`{VALUE}` is not a valid status." },
      default: "scheduled",
      index: true,
    },

    /** Country and interest badges, decided once at creation — see
     *  services/booking/tags.js for why the time-based ones are not here. */
    tags: {
      type: [String],
      default: [],
    },

    /** Delivery outcome, recorded but never a precondition — same contract as
     *  Inquiry. The booking is the source of truth; mail may fail. */
    mail: {
      customer: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
      internal: { type: String, enum: ["pending", "sent", "failed", "skipped"], default: "pending" },
    },

    /** Request metadata, for abuse triage. Never shown to the visitor. */
    meta: {
      ip: { type: String, select: false },
      userAgent: { type: String, select: false, maxlength: 512 },
    },
  },
  {
    timestamps: true,
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
 * THE double-booking guard.
 *
 * Not a findOne-then-create check — two requests can both pass that in the
 * window between the read and the write, and both would succeed. A unique
 * index is evaluated by the database at write time, so of two simultaneous
 * bookings for 11:30 exactly one commits and the other comes back as a
 * duplicate-key error, which the controller turns into "that time was just
 * booked".
 *
 * It is PARTIAL, on `status: "scheduled"`, so cancelling a call releases its
 * slot for someone else instead of poisoning it forever.
 */
callBookingSchema.index(
  { scheduledAt: 1 },
  {
    unique: true,
    name: "uniq_scheduled_slot",
    partialFilterExpression: { status: "scheduled" },
  },
);

/** The dashboard's two access patterns: the operational list (by time) and the
 *  filtered one (by status, then time). */
callBookingSchema.index({ scheduledAt: -1 });
callBookingSchema.index({ status: 1, scheduledAt: 1 });

export default mongoose.model("CallBooking", callBookingSchema);
