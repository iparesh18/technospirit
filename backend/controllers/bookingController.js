import CallBooking from "../models/CallBooking.js";
import AppError from "../utils/AppError.js";
import { cleanLine, cleanText } from "../utils/sanitize.js";
import { sendBookingMail } from "../services/mailer.js";
import { generateSlots, isBookableSlot, businessTimezone } from "../services/booking/slots.js";
import { buildTags } from "../services/booking/tags.js";
import availability from "../config/availability.js";

/**
 * Public booking endpoints.
 *
 * The server is authoritative about three things the browser is not allowed to
 * decide: which slots exist, which are still free, and whether a submitted
 * time is one of them. A crafted request cannot book 3am on a Sunday, cannot
 * book yesterday, and cannot take a slot someone else already holds.
 */

/** An IANA zone the platform recognises. Anything else is not stored. */
function usableTimeZone(candidate) {
  const value = cleanLine(candidate, { maxLength: 64 });
  if (!value) return "";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "";
  }
}

/**
 * GET /api/bookings/availability
 *
 * Every slot in the horizon as a UTC instant, each marked taken or free. The
 * browser groups them into days in the VISITOR's timezone — which is why no
 * day boundary is decided here: "Tuesday" is a different set of instants in
 * Mumbai than in New York, and only the browser knows which one is reading.
 */
export async function getAvailability(_req, res, next) {
  try {
    const slots = generateSlots();

    if (slots.length === 0) {
      return res.json({
        ok: true,
        businessTimezone,
        slotMinutes: availability.slotMinutes,
        slots: [],
      });
    }

    /**
     * One query for the whole window, not one per slot. Only `scheduled` rows
     * hold a slot — a cancelled call releases its time, which is the same rule
     * the unique index enforces on write.
     */
    const taken = await CallBooking.find({
      status: "scheduled",
      scheduledAt: { $gte: new Date(slots[0]), $lte: new Date(slots[slots.length - 1]) },
    })
      .select("scheduledAt")
      .lean();

    const busy = new Set(taken.map((row) => row.scheduledAt.getTime()));

    res.json({
      ok: true,
      businessTimezone,
      slotMinutes: availability.slotMinutes,
      slots: slots.map((at) => ({ at: new Date(at).toISOString(), taken: busy.has(at) })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/bookings
 *
 * Ordering mirrors `createInquiry`, and for the same reason:
 *
 *   1. validate the slot against the schedule
 *   2. write the booking — the unique index is what settles a race
 *   3. respond to the visitor
 *   4. send mail, recording the outcome on the row already saved
 *
 * Mail is NOT awaited before responding and a mail failure never rolls back
 * the write. That is what makes the retry safe: a visitor who tries again
 * after a delivery problem cannot create a second booking, because there was
 * never a failed booking to retry — the row exists and its slot is taken.
 */
export async function createBooking(req, res, next) {
  try {
    const {
      name,
      email,
      phone,
      dialCode,
      country,
      countryCode,
      company,
      discussion,
      slot,
      timezone,
      website,
    } = req.body ?? {};

    // Honeypot, same contract as the contact form: answer with the ordinary
    // success shape so a bot learns nothing, and write nothing.
    if (typeof website === "string" && website.trim() !== "") {
      console.warn(`[booking] honeypot tripped from ${req.ip}`);
      return res.status(201).json({ ok: true, message: "Booking received." });
    }

    const scheduledAt = new Date(slot);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw AppError.badRequest("Choose a time for the call.", { code: "SLOT_INVALID" });
    }

    /**
     * The gate. `isBookableSlot` regenerates the schedule and checks
     * membership, so the only times that can reach the database are times the
     * popup could legitimately have offered.
     */
    if (!isBookableSlot(scheduledAt)) {
      throw AppError.badRequest(
        "That time is no longer available. Please choose another available time.",
        { code: "SLOT_INVALID" },
      );
    }

    const cleanPhone = cleanLine(phone, { maxLength: 24 }).replace(/[^\d+]/g, "");
    const cleanCountry = cleanLine(country, { maxLength: 80 });
    const cleanDiscussion = cleanText(discussion, { maxLength: 2000 });

    const doc = {
      name: cleanLine(name, { maxLength: 120 }),
      email: cleanLine(email, { maxLength: 254 }).toLowerCase(),
      phone: cleanPhone,
      dialCode: cleanLine(dialCode, { maxLength: 8 }).replace(/[^\d+]/g, ""),
      country: cleanCountry,
      countryCode: cleanLine(countryCode, { maxLength: 2 }).toUpperCase(),
      company: cleanLine(company, { maxLength: 140 }),
      discussion: cleanDiscussion,
      scheduledAt,
      // A missing or unrecognised zone falls back to the business one rather
      // than being stored as a string nothing can format.
      timezone: usableTimeZone(timezone) || businessTimezone,
      businessTimezone,
      tags: buildTags({ country: cleanCountry, discussion: cleanDiscussion }),
      meta: {
        ip: req.ip,
        userAgent: cleanLine(req.get("user-agent") ?? "", { maxLength: 512 }),
      },
    };

    let booking;
    try {
      booking = await CallBooking.create(doc);
    } catch (error) {
      /**
       * 11000 is the unique index refusing a second booking for the same
       * instant. It is the expected outcome of two people picking 11:30 at the
       * same moment, not a fault — so it gets its own message and a 409, and
       * the visitor is told to pick again rather than shown a database error.
       */
      if (error?.code === 11000) {
        throw new AppError(
          409,
          "That time was just booked. Please choose another available time.",
          { code: "SLOT_TAKEN" },
        );
      }
      throw error;
    }

    // The visitor is done. Nothing below can change this answer.
    res.status(201).json({
      ok: true,
      message: "Booking confirmed.",
      booking: {
        id: booking._id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        scheduledAt: booking.scheduledAt,
        timezone: booking.timezone,
        status: booking.status,
      },
    });

    // Mail, after the response, failing quietly into the document.
    sendBookingMail({
      id: booking._id,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      country: booking.country,
      company: booking.company,
      discussion: booking.discussion,
      scheduledAt: booking.scheduledAt,
      timezone: booking.timezone,
      businessTimezone: booking.businessTimezone,
      createdAt: booking.createdAt,
    })
      .then((mail) =>
        CallBooking.updateOne({ _id: booking._id }, { $set: { mail } }).catch((error) =>
          console.error(`[booking] could not record mail status: ${error.message}`),
        ),
      )
      .catch((error) => console.error(`[booking] mail dispatch error: ${error.message}`));
  } catch (error) {
    if (res.headersSent) {
      console.error(`[booking] post-response failure: ${error.message}`);
      return;
    }
    next(error);
  }
}

export default { getAvailability, createBooking };
