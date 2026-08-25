import { Router } from "express";
import { body } from "express-validator";
import { createInquiry, health } from "../controllers/contactController.js";
import { contactLimiter } from "../middleware/rateLimiters.js";
import validate from "../middleware/validate.js";

const router = Router();

/**
 * Server-side validation, stated independently of the form.
 *
 * These are not a mirror of the React rules for tidiness — they are the actual
 * gate. The form's copy ("TELL US WHO YOU ARE") is written for a person mid-
 * task; these messages are written for whatever reaches the endpoint, which
 * may never have rendered the form at all.
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

  body("message")
    .trim()
    .isLength({ min: 12, max: 5000 })
    .withMessage("Message must be between 12 and 5000 characters."),

  // Optional: the live form does not send it, the schema defaults it.
  body("purpose").optional({ values: "falsy" }).trim().isLength({ max: 120 })
    .withMessage("Purpose is too long."),

  // The honeypot. Must exist as a rule so a bot cannot bypass the check by
  // sending a non-string type; the controller does the actual detection.
  body("website").optional().isString(),
];

router.post("/contact", contactLimiter, rules, validate, createInquiry);
router.get("/health", health);

export default router;
