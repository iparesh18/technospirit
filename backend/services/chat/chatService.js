import AppError from "../../utils/AppError.js";
import { cleanText } from "../../utils/sanitize.js";
import { getProvider } from "../ai/index.js";
import { buildSystemInstruction } from "./prompt.js";

/**
 * The assistant, above the provider line.
 *
 * Everything here is vendor-neutral: it runs unchanged against Groq,
 * OpenRouter or anything else that can turn (system, messages) into text.
 */

/* — limits ————————————————————————————————————————————
 * Each of these exists because a prompt alone cannot enforce it. A model can
 * be talked out of an instruction; it cannot be talked out of a slice().
 */

/** One message. Long enough for a real brief, short enough that a pasted
 *  document cannot become the context. */
export const MAX_INPUT_CHARS = 1000;

/** Turns kept from the conversation, newest first. Six is three exchanges —
 *  enough for "what about the AI one?" to resolve, and a hard ceiling on how
 *  much a visitor can accumulate in front of the system instruction. */
export const MAX_HISTORY_TURNS = 6;

/** Characters kept per historical turn. A long earlier answer is context, not
 *  scripture, and truncating it keeps the payload flat across a long chat. */
const MAX_HISTORY_CHARS = 600;

/** Output ceiling. The prompt asks for 2–3 sentences; this is the backstop
 *  that stops a runaway generation from becoming a wall of text or a bill. */
const MAX_OUTPUT_TOKENS = 300;

/** Hard stop on ONE provider attempt. Past this the visitor is better served by
 *  an honest failure than by a spinner. Sized for a two-sentence answer from a
 *  fast model, not for a long generation — with the retry below, the worst case
 *  a visitor waits is roughly two of these plus the backoff. */
const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Retry policy.
 *
 * Exactly one retry, and only for failures where a second attempt is a
 * different roll of the dice: rate limiting, an overloaded or 5xx upstream, a
 * dropped connection. A bad key, a bad model name or a malformed request fail
 * identically every time — retrying those just doubles the latency before the
 * same error, and doubles the quota spent getting there.
 *
 * The timeout is deliberately NOT retried. If the provider took longer than
 * 12s once, the visitor has already waited long enough.
 */
const RETRY_STATUSES = new Set([408, 409, 429, 500, 502, 503, 504]);
const RETRY_BACKOFF_MS = 450;

/**
 * The longest we will sit and wait before a retry.
 *
 * When a provider says "try again in 18s" — which is exactly what Groq's
 * free-tier tokens-per-minute limit says — retrying after a fixed 450ms burns a
 * second call into a window that is still closed: the visitor waits longer, the
 * quota drains faster, and the answer is the same error. Past this threshold
 * the honest move is to stop and hand over the contact details.
 */
const MAX_RETRY_WAIT_MS = 2_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** True when a second attempt is worth making. A missing status means a
 *  network-level failure — fetch rejecting before any response — which is the
 *  transient case worth one more try. */
function isTransient(error) {
  if (error?.name === "AbortError") return false;
  const status = error?.status;
  if (typeof status !== "number") return true;
  return RETRY_STATUSES.has(status);
}

/** Final defence on response size, applied after generation. */
const MAX_RESPONSE_CHARS = 900;

/* — input ————————————————————————————————————————————— */

/**
 * Validates and normalises what arrived on the wire.
 *
 * Throws AppError for anything a caller can fix, so the shared error handler
 * turns it into the same JSON shape the rest of the API uses.
 */
export function normaliseRequest(body) {
  const rawMessage = body?.message;

  if (typeof rawMessage !== "string" || !rawMessage.trim()) {
    throw AppError.badRequest("Message is required.", { code: "MESSAGE_REQUIRED" });
  }

  const message = cleanText(rawMessage, { maxLength: MAX_INPUT_CHARS });

  if (!message) {
    throw AppError.badRequest("Message is required.", { code: "MESSAGE_REQUIRED" });
  }

  // Length is checked against the RAW value: silently answering the first
  // 1000 characters of a 50 000-character paste is worse than saying no.
  if (rawMessage.length > MAX_INPUT_CHARS) {
    throw AppError.badRequest(
      `That message is too long. Please keep it under ${MAX_INPUT_CHARS} characters.`,
      { code: "MESSAGE_TOO_LONG" },
    );
  }

  const history = Array.isArray(body?.history) ? body.history : [];

  /**
   * The history is rebuilt from scratch rather than trusted.
   *
   * It arrives from the browser, so it is attacker-controlled: a crafted
   * `history` could otherwise carry a forged assistant turn ("Sure, our
   * websites start at $500") and the model would treat it as something it had
   * already said. Roles are forced to the two legal values, content is
   * sanitised and truncated, and only the last few turns survive.
   */
  const trimmed = history
    .filter((turn) => turn && typeof turn.text === "string")
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      text: cleanText(turn.text, { maxLength: MAX_HISTORY_CHARS }),
    }))
    .filter((turn) => turn.text);

  return { message, history: trimmed };
}

/* — output ————————————————————————————————————————————— */

/**
 * Strips the markdown the prompt asked the model not to produce.
 *
 * The UI renders plain text nodes, so leftover `**bold**` would be visible as
 * literal asterisks. This is a formatting guard, not a security boundary —
 * React does the escaping.
 */
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\W)\*(?!\s)([^*\n]+?)\*(?=\W|$)/g, "$1$2")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Truncates at a sentence boundary rather than mid-word. */
function capLength(text) {
  if (text.length <= MAX_RESPONSE_CHARS) return text;
  const slice = text.slice(0, MAX_RESPONSE_CHARS);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  return lastStop > MAX_RESPONSE_CHARS * 0.5 ? slice.slice(0, lastStop + 1) : `${slice.trimEnd()}…`;
}

/* — the call ——————————————————————————————————————————— */

/**
 * Answers one message.
 *
 * The timeout is enforced with an AbortController the provider is handed, so a
 * hung upstream request is actually cancelled rather than merely abandoned —
 * an abandoned socket still holds a connection and still gets billed.
 */
export async function answer({ message, history }) {
  const provider = getProvider();

  // Built once, not per attempt: the prompt is ~12 kB of knowledge base and
  // re-rendering it for a retry would be pure waste.
  const system = buildSystemInstruction({ question: message });
  const messages = [...history, { role: "user", text: message }];

  /** One attempt, with its own timeout and its own abort controller — a reused
   *  controller stays aborted, so the retry would fail instantly. */
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await provider.generate({
        system,
        messages,
        signal: controller.signal,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
    } catch (error) {
      // Mark a timeout as such before the signal goes out of scope, so the
      // handler below can tell it apart from an upstream failure.
      if (controller.signal.aborted) error.timedOut = true;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  let result;
  try {
    try {
      result = await attempt();
    } catch (error) {
      if (!isTransient(error) || error.timedOut) throw error;

      // Respect the provider's own timing when it gave one. A retry is only
      // worth making if the window it lands in is actually open.
      const wait = error.retryAfterMs ?? RETRY_BACKOFF_MS;
      if (wait > MAX_RETRY_WAIT_MS) {
        console.warn(
          `[chat] ${provider.id} asked for ${Math.round(wait / 1000)}s before retrying — not retrying.`,
        );
        throw error;
      }

      console.warn(
        `[chat] ${provider.id} transient failure (status ${error?.status ?? "none"}) — retrying once in ${wait}ms.`,
      );
      await sleep(wait);
      result = await attempt();
    }
  } catch (error) {
    // Everything from here is logged in full server-side and reduced to one
    // sentence for the visitor. A provider error can name the model, quote the
    // prompt back, or carry the key in a URL — none of which leaves this
    // process.
    const aborted = error?.timedOut === true || error?.name === "AbortError";
    console.error(
      `[chat] ${provider.id} ${aborted ? "timed out" : "failed"}: ${error?.message ?? error}`,
    );

    if (aborted) {
      throw new AppError(504, "Something went wrong on my side. Please try again.", {
        code: "AI_TIMEOUT",
      });
    }

    /**
     * Quota exhaustion and upstream outage are not transient faults, and
     * "please try again" is actively wrong advice for them — the next attempt
     * fails identically. These get the unavailable message, which sends the
     * visitor to a phone number that does work.
     */
    const status = error?.status;
    if (status === 429 || status === 503 || status === 500 || status === 502) {
      throw new AppError(503, "The assistant is temporarily unavailable.", {
        code: status === 429 ? "AI_QUOTA" : "AI_UPSTREAM",
      });
    }

    throw new AppError(502, "Something went wrong on my side. Please try again.", {
      code: "AI_FAILED",
    });
  }

  const text = capLength(stripMarkdown(String(result?.text ?? "")));

  if (!text) {
    // An empty candidate is a failure, not an answer. Without this the widget
    // would render a blank assistant bubble and look broken.
    console.error(`[chat] ${provider.id} returned an empty response.`);
    throw new AppError(502, "Something went wrong on my side. Please try again.", {
      code: "AI_EMPTY",
    });
  }

  return { text };
}

export default { answer, normaliseRequest, MAX_INPUT_CHARS, MAX_HISTORY_TURNS };
