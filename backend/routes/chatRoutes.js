import { Router } from "express";
import { body } from "express-validator";
import { chat } from "../controllers/chatController.js";
import { chatLimiter } from "../middleware/rateLimiters.js";
import validate from "../middleware/validate.js";
import { MAX_INPUT_CHARS, MAX_HISTORY_TURNS } from "../services/chat/chatService.js";

const router = Router();

/**
 * Shape validation only — meaning and truncation belong to chatService, which
 * is where the same rules apply however the request arrived.
 *
 * `history` is capped here as well as trimmed there: a body carrying ten
 * thousand turns should be rejected at the edge rather than sliced down after
 * express has already parsed it.
 */
const rules = [
  body("message")
    .isString()
    .withMessage("Message must be text.")
    .bail()
    .trim()
    .isLength({ min: 1, max: MAX_INPUT_CHARS })
    .withMessage(`Message must be between 1 and ${MAX_INPUT_CHARS} characters.`),

  body("history")
    .optional()
    .isArray({ max: MAX_HISTORY_TURNS * 4 })
    .withMessage("Conversation history is too long."),
];

router.post("/chat", chatLimiter, rules, validate, chat);

export default router;
