import CallBooking, { BOOKING_STATUSES } from "../models/CallBooking.js";
import AppError from "../utils/AppError.js";
import { cleanLine, escapeRegex } from "../utils/sanitize.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * Larger than any real interval between now and a booking, in milliseconds.
 * Used to push every past call behind every upcoming one in a single sort key
 * — see `rankStage` below.
 */
const PAST_OFFSET = 1e15;

/** The named views the segmented control offers, and what each one means. */
const SEGMENTS = new Set(["all", "upcoming", "today", "past"]);

/**
 * The operational sort: next call first.
 *
 * Mongo cannot sort one field ascending for some documents and descending for
 * others, so the two orders are folded into one computed key. An upcoming call
 * ranks by how soon it is; a past call ranks by how recent it is, shifted past
 * every possible upcoming value. Sorting that key ascending therefore gives
 * "nearest upcoming → … → furthest upcoming → most recent past → …", which is
 * the order an operator actually reads this list in.
 */
function rankStage(now) {
  return {
    $addFields: {
      _rank: {
        $cond: [
          { $gte: ["$scheduledAt", now] },
          { $subtract: ["$scheduledAt", now] },
          { $add: [PAST_OFFSET, { $subtract: [now, "$scheduledAt"] }] },
        ],
      },
    },
  };
}

/** Start and end of the operator's "today", in the business/server timezone. */
function todayBounds(now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * GET /api/admin/bookings
 *   ?page=1&limit=20&segment=upcoming&status=scheduled&search=miller
 *
 * Same contract as the inquiry list: a bounded page, a clamped limit, and a
 * pagination block the dashboard's existing pager renders unchanged.
 */
export async function listBookings(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT),
    );

    const now = new Date();
    const filter = {};

    const segment = cleanLine(req.query.segment, { maxLength: 20 }).toLowerCase() || "all";
    if (!SEGMENTS.has(segment)) {
      throw AppError.badRequest(`Unknown segment "${segment}".`);
    }
    if (segment === "upcoming") filter.scheduledAt = { $gte: now };
    if (segment === "past") filter.scheduledAt = { $lt: now };
    if (segment === "today") {
      const { start, end } = todayBounds(now);
      filter.scheduledAt = { $gte: start, $lt: end };
    }

    const status = cleanLine(req.query.status, { maxLength: 20 });
    if (status && status !== "all") {
      if (!BOOKING_STATUSES.includes(status)) {
        throw AppError.badRequest(`Unknown status "${status}".`);
      }
      filter.status = status;
    }

    const search = cleanLine(req.query.search, { maxLength: 80 });
    if (search) {
      // escapeRegex for the same reason the inquiry search does it: an
      // unescaped "(" is a crash and "(a+)+" is a backtracking DoS.
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { name: rx },
        { email: rx },
        { phone: rx },
        { company: rx },
        { country: rx },
        { discussion: rx },
      ];
    }

    const [rows, total] = await Promise.all([
      CallBooking.aggregate([
        { $match: filter },
        rankStage(now),
        { $sort: { _rank: 1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            name: 1,
            email: 1,
            phone: 1,
            country: 1,
            countryCode: 1,
            company: 1,
            discussion: 1,
            scheduledAt: 1,
            timezone: 1,
            status: 1,
            tags: 1,
            createdAt: 1,
          },
        },
      ]),
      CallBooking.countDocuments(filter),
    ]);

    res.json({
      ok: true,
      bookings: rows.map((row) => ({ ...row, id: row._id })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/bookings/:id — the full record. */
export async function getBooking(req, res, next) {
  try {
    const booking = await CallBooking.findById(req.params.id);
    if (!booking) throw AppError.notFound("That booking does not exist.");
    res.json({ ok: true, booking });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/bookings/:id/status — the one mutable field.
 *
 * Moving a call out of `scheduled` also releases its slot, because the unique
 * index only covers scheduled rows. That is the intended behaviour: a
 * cancelled 11:30 should be bookable again.
 */
export async function updateBookingStatus(req, res, next) {
  try {
    const status = cleanLine(req.body?.status, { maxLength: 20 });

    if (!BOOKING_STATUSES.includes(status)) {
      throw AppError.badRequest(`Status must be one of: ${BOOKING_STATUSES.join(", ")}.`, {
        code: "BAD_STATUS",
      });
    }

    let booking;
    try {
      booking = await CallBooking.findByIdAndUpdate(
        req.params.id,
        { $set: { status } },
        { new: true, runValidators: true },
      );
    } catch (error) {
      /**
       * Re-scheduling a call whose slot was taken while it sat cancelled. The
       * index is doing exactly its job; the operator needs to be told why,
       * not shown a duplicate-key error.
       */
      if (error?.code === 11000) {
        throw new AppError(409, "Another booking now holds that time slot.", {
          code: "SLOT_TAKEN",
        });
      }
      throw error;
    }

    if (!booking) throw AppError.notFound("That booking does not exist.");

    res.json({ ok: true, booking });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/bookings/stats
 *
 * Counted in Mongo, like every other number on the dashboard. Nothing here is
 * estimated — someone plans a day around these.
 */
export async function getBookingStats(_req, res, next) {
  try {
    const now = new Date();
    const { start, end } = todayBounds(now);

    const [total, upcoming, today, byStatus, next_] = await Promise.all([
      CallBooking.countDocuments({}),
      CallBooking.countDocuments({ scheduledAt: { $gte: now }, status: "scheduled" }),
      CallBooking.countDocuments({ scheduledAt: { $gte: start, $lt: end } }),
      CallBooking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      CallBooking.findOne({ scheduledAt: { $gte: now }, status: "scheduled" })
        .sort({ scheduledAt: 1 })
        .select("name scheduledAt timezone")
        .lean(),
    ]);

    const counts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
    for (const { _id, count } of byStatus) {
      if (_id in counts) counts[_id] = count;
    }

    res.json({
      ok: true,
      stats: {
        total,
        upcoming,
        today,
        scheduled: counts.scheduled,
        completed: counts.completed,
        cancelled: counts.cancelled,
        noShow: counts["no-show"],
        next: next_ ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default { listBookings, getBooking, updateBookingStatus, getBookingStats };
