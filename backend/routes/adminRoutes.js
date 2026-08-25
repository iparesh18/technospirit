import { Router } from "express";
import {
  getInquiry,
  getStats,
  listInquiries,
  updateInquiryStatus,
} from "../controllers/adminInquiryController.js";
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

export default router;
