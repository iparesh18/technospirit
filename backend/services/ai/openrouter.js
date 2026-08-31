import env from "../../config/env.js";

/**
 * OpenRouter, over its OpenAI-compatible chat-completions endpoint.
 *
 * Implemented now so the abstraction is real rather than theoretical: switching
 * the whole assistant to OpenRouter is `AI_PROVIDER=openrouter` plus a key, and
 * nothing in the UI, the routes, the knowledge base or the prompt changes.
 *
 * Uses `fetch` rather than an SDK on purpose — the API is a single POST, and a
 * dependency that exists to format one JSON body is a dependency to keep
 * patched for no benefit.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * OpenRouter takes the system instruction as the first message rather than as
 * its own field rather than as a separate parameter, and that mapping is the
 * kind of thing that is a provider concern rather than a caller concern.
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
  id: "openrouter",

  model() {
    return env.ai.openrouter.model;
  },

  async generate({ system, messages, signal, maxOutputTokens }) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${env.ai.openrouter.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.ai.openrouter.model,
        messages: toMessages(system, messages),
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: maxOutputTokens,
      }),
    });

    if (!response.ok) {
      // Read the body for the server log, but throw a bare message — the
      // caller turns any provider failure into the same visitor-facing
      // sentence, and OpenRouter's error text can name the model and the key.
      const detail = await response.text().catch(() => "");
      console.error(`[ai] openrouter ${response.status}: ${detail.slice(0, 500)}`);
      const failure = new Error(`openrouter_http_${response.status}`);
      failure.status = response.status;
      throw failure;
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    return { text: typeof text === "string" ? text : "" };
  },
};
