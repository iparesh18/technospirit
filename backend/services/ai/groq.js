import Groq from "groq-sdk";
import env from "../../config/env.js";

/**
 * Groq, via the official `groq-sdk`.
 *
 * This file is one of exactly two places in the codebase that import a vendor
 * SDK or know a vendor's request shape. It contains no TechnoSpirit rules: the
 * system instruction, the knowledge base, the length ceiling and the grounding
 * rules all arrive as arguments and are passed straight through. Swapping the
 * active provider changes which of these files runs and nothing else.
 */

/** Created once, lazily. Constructing it at import time would run before
 *  dotenv in a test harness and bake in an empty key. */
let client = null;
function getClient() {
  if (!client) {
    client = new Groq({
      apiKey: env.ai.groq.apiKey,
      // The SDK's own retry is turned off because chatService owns retry
      // policy: it knows which failures are transient and which are permanent,
      // and two independent retry layers would multiply into four upstream
      // calls for one visitor question.
      maxRetries: 0,
    });
  }
  return client;
}

/**
 * Groq speaks the OpenAI chat-completions shape: the system instruction is the
 * first message rather than its own field. That mapping is a provider concern,
 * which is why it lives here and not in chatService.
 */
function toMessages(system, messages) {
  return [
    { role: "system", content: system },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    })),
  ];
}

export default {
  id: "groq",

  model() {
    return env.ai.groq.model;
  },

  async generate({ system, messages, signal, maxOutputTokens }) {
    try {
      const completion = await getClient().chat.completions.create(
        {
          model: env.ai.groq.model,
          messages: toMessages(system, messages),
          // Low temperature on purpose. This assistant answers factual
          // questions from a fixed knowledge base; creativity here surfaces as
          // invented pricing, which is the one thing it must never do.
          temperature: 0.3,
          top_p: 0.9,
          max_completion_tokens: maxOutputTokens,
          stream: false,
        },
        // The SDK forwards this to fetch, so the abort chatService raises on
        // timeout actually cancels the request rather than merely abandoning
        // a socket that is still open and still being billed.
        { signal },
      );

      const text = completion?.choices?.[0]?.message?.content;
      return { text: typeof text === "string" ? text : "" };
    } catch (error) {
      /**
       * Normalise the HTTP status onto the error before it leaves this file.
       *
       * `groq-sdk` throws APIError subclasses carrying `.status`, so usually
       * there is nothing to do — but a bare fetch failure has none, and the
       * regex covers the case where the SDK surfaces the body as text instead.
       * Doing this here is what lets chatService tell "rate limited, retrying
       * will help" from "bad key, retrying will not" without ever learning
       * what a Groq error looks like.
       */
      if (typeof error?.status !== "number") {
        const match = /"?status"?\s*[:=]\s*(\d{3})/.exec(String(error?.message ?? ""));
        if (match) error.status = Number(match[1]);
      }

      /**
       * How long the provider says to wait, in ms.
       *
       * On a 429 Groq is specific — "Please try again in 18.39s" — and the
       * caller needs that number to decide whether a retry is worth making
       * at all. Reading it here keeps the parsing with the vendor whose
       * format it is; chatService only ever sees `retryAfterMs`.
       */
      const header =
        error?.headers?.["retry-after"] ?? error?.headers?.get?.("retry-after");
      const seconds = Number(header);
      if (Number.isFinite(seconds) && seconds > 0) {
        error.retryAfterMs = seconds * 1000;
      } else {
        const again = /try again in ([0-9.]+)s/i.exec(String(error?.message ?? ""));
        if (again) error.retryAfterMs = Math.round(Number(again[1]) * 1000);
      }

      throw error;
    }
  },
};
