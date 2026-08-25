import Inquiry, { INQUIRY_STATUSES } from "../models/Inquiry.js";
import AppError from "../utils/AppError.js";
import { cleanLine, escapeRegex } from "../utils/sanitize.js";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
/** Enough to fill two lines in the list without shipping a 5000-char body per row. */
const PREVIEW_LENGTH = 180;

/**
 * GET /api/admin/inquiries
 *   ?page=1&limit=20&status=new&search=sarah
 *
 * Never returns an unbounded collection: `limit` is clamped to MAX_LIMIT and
 * the message body is projected down to a preview, so the response size is
 * bounded regardless of how large the collection or an individual message is.
 */
export async function listInquiries(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT),
    );

    const filter = {};

    const status = cleanLine(req.query.status, { maxLength: 20 });
    if (status && status !== "all") {
      if (!INQUIRY_STATUSES.includes(status)) {
        throw AppError.badRequest(`Unknown status "${status}".`);
      }
      filter.status = status;
    }

    const search = cleanLine(req.query.search, { maxLength: 80 });
    if (search) {
      // escapeRegex, because an unescaped "(" from the search box is a crash
      // and "(a+)+" is a catastrophic-backtracking DoS.
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: rx }, { email: rx }, { purpose: rx }, { message: rx }];
    }

    const [rows, total] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("name email purpose status message createdAt updatedAt")
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    const inquiries = rows.map(({ message, ...rest }) => ({
      ...rest,
      id: rest._id,
      preview:
        message.length > PREVIEW_LENGTH ? `${message.slice(0, PREVIEW_LENGTH).trimEnd()}…` : message,
    }));

    res.json({
      ok: true,
      inquiries,
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

/** GET /api/admin/inquiries/:id — the full record, message body included. */
export async function getInquiry(req, res, next) {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) throw AppError.notFound("That inquiry does not exist.");
    res.json({ ok: true, inquiry });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/inquiries/:id/status — the one mutable field. */
export async function updateInquiryStatus(req, res, next) {
  try {
    const status = cleanLine(req.body?.status, { maxLength: 20 });

    if (!INQUIRY_STATUSES.includes(status)) {
      throw AppError.badRequest(
        `Status must be one of: ${INQUIRY_STATUSES.join(", ")}.`,
        { code: "BAD_STATUS" },
      );
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true },
    );

    if (!inquiry) throw AppError.notFound("That inquiry does not exist.");

    res.json({ ok: true, inquiry });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/stats
 *
 * Every number is counted in Mongo. Nothing here is estimated, sampled or
 * invented — an overview that shows a made-up figure is worse than no overview.
 */
export async function getStats(_req, res, next) {
  try {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    // Monday-based week: getDay() is 0 for Sunday, so Sunday counts as day 7.
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

    const [total, byStatus, thisWeek, latest] = await Promise.all([
      Inquiry.countDocuments({}),
      Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Inquiry.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Inquiry.findOne({}).sort({ createdAt: -1 }).select("createdAt").lean(),
    ]);

    // Start from zero for every status so the dashboard renders a complete set
    // of tiles even when a status has no rows yet.
    const counts = Object.fromEntries(INQUIRY_STATUSES.map((s) => [s, 0]));
    for (const { _id, count } of byStatus) {
      if (_id in counts) counts[_id] = count;
    }

    res.json({
      ok: true,
      stats: {
        total,
        new: counts.new,
        contacted: counts.contacted,
        inProgress: counts["in-progress"],
        closed: counts.closed,
        thisWeek,
        weekStart: startOfWeek,
        latestAt: latest?.createdAt ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
}
