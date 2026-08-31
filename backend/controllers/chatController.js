import env from "../config/env.js";
import AppError from "../utils/AppError.js";
import { answer, normaliseRequest } from "../services/chat/chatService.js";
import { isProviderReady } from "../services/ai/index.js";

/**
 * POST /api/chat
 *
 * One question in, one short answer out. The endpoint is deliberately
 * stateless: the browser holds the transcript and sends the recent turns with
 * each request, and chatService rebuilds that history from scratch rather than
 * trusting it. Nothing about a conversation is persisted — there is no chat
 * collection, no visitor record, and no message ever reaches MongoDB.
 */
export async function chat(req, res, next) {
  try {
    /**
     * The unconfigured case is answered before anything else, and answered
     * with the contact number rather than an error the visitor can do nothing
     * with. This is the state the site ships in until a key is added, so it
     * has to be a good experience, not a broken one.
     */
    if (!isProviderReady()) {
      return res.status(503).json({
        ok: false,
        code: "AI_NOT_CONFIGURED",
        error: `The assistant is temporarily unavailable. You can still contact our team at ${env.contact.phone}.`,
      });
    }

    const { message, history } = normaliseRequest(req.body);
    const result = await answer({ message, history });

    res.json({ ok: true, message: result.text });
  } catch (error) {
    // A 502/504 from the provider carries the fallback contact line, because
    // "try again" is not the only useful thing to tell someone whose question
    // just failed.
    if (
      error instanceof AppError &&
      (error.statusCode === 502 || error.statusCode === 503 || error.statusCode === 504)
    ) {
      return res.status(error.statusCode).json({
        ok: false,
        code: error.code,
        error: error.message,
        fallback:
          error.statusCode === 503
            ? `You can still contact our team at ${env.contact.phone}.`
            : `You can also contact our team at ${env.contact.phone}.`,
      });
    }
    next(error);
  }
}

export default { chat };
