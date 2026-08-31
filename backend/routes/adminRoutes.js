import { Router } from "express";
import {
  getInquiry,
  getStats,
  listInquiries,
  updateInquiryStatus,
} from "../controllers/adminInquiryController.js";
import {
  getBooking,
  getBookingStats,
  listBookings,
  updateBookingStatus,
} from "../controllers/adminBookingController.js";
import requireAuth from "../middleware/requireAuth.js";
import { adminApiLimiter } from "../middleware/rateLimiters.js";

const router = Router();

/**
 * Everything under /api/admin requires a valid session cookie.
 *
 * Applied to the whole router rather than per-route, so a route added later
 * is protected by default. Forgetting a guard should not be possible here.
 */
router.use("/admin", adminApiLimiter, requireAuth);

router.get("/admin/stats", getStats);
router.get("/admin/inquiries", listInquiries);
router.get("/admin/inquiries/:id", getInquiry);
router.patch("/admin/inquiries/:id/status", updateInquiryStatus);

/**
 * Booked calls. Same shape as the inquiry routes above and behind the same
 * router-level guard, so nothing about the new module widens the API surface.
 * `/stats` is declared before `/:id` — otherwise Express matches "stats" as an
 * id and every request answers 404 from a CastError.
 */
router.get("/admin/bookings/stats", getBookingStats);
router.get("/admin/bookings", listBookings);
router.get("/admin/bookings/:id", getBooking);
router.patch("/admin/bookings/:id/status", updateBookingStatus);

export default router;
