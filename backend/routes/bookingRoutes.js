import { Router } from "express";
import { body } from "express-validator";
import { createBooking, getAvailability } from "../controllers/bookingController.js";
import { bookingLimiter, availabilityLimiter } from "../middleware/rateLimiters.js";
import validate from "../middleware/validate.js";

const router = Router();

/**
 * Server-side validation, stated independently of the popup.
 *
 * The React form validates so the visitor gets an answer without a round trip;
 * these rules are the actual gate, and they assume nothing about how the
 * request was produced. Field names match the popup's, so a per-field message
 * from here renders in the right place under the right input.
 */
const rules = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Name must be between 2 and 120 characters."),

  body("email")
    .trim()
    .isEmail()
    .withMessage("That does not look like a valid email address.")
    .isLength({ max: 254 })
    .withMessage("Email is too long.")
    .normalizeEmail({ gmail_remove_dots: false }),

  /**
   * The most important field on the form — TechnoSpirit calls this number.
   *
   * E.164: a leading +, a non-zero country digit, then 7 to 17 more. Deliberately
   * a shape check rather than a carrier lookup: a real per-country validator is a
   * dependency and a maintenance surface, and this rejects everything that could
   * not possibly be dialled while accepting every country's real numbers.
   */
  body("phone")
    .trim()
    .customSanitizer((value) => String(value ?? "").replace(/[^\d+]/g, ""))
    .matches(/^\+[1-9]\d{6,17}$/)
    .withMessage("Enter a valid phone number including the country code."),

  body("country")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Select the country you are calling from."),

  body("countryCode").optional({ values: "falsy" }).trim().isLength({ max: 2 }),
  body("dialCode").optional({ values: "falsy" }).trim().isLength({ max: 8 }),

  body("company").optional({ values: "falsy" }).trim().isLength({ max: 140 })
    .withMessage("Company name is too long."),

  body("discussion").optional({ values: "falsy" }).trim().isLength({ max: 2000 })
    .withMessage("That is longer than this field takes."),

  body("slot")
    .isISO8601()
    .withMessage("Choose a time for the call."),

  body("timezone").optional({ values: "falsy" }).trim().isLength({ max: 64 }),

  // The honeypot. A rule so a bot cannot bypass the check by sending a
  // non-string type; the controller does the detection.
  body("website").optional().isString(),
];

router.get("/bookings/availability", availabilityLimiter, getAvailability);
router.post("/bookings", bookingLimiter, rules, validate, createBooking);

export default router;
