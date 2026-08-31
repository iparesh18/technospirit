import env, { KNOWN_AI_PROVIDERS } from "../../config/env.js";
import AppError from "../../utils/AppError.js";
import groqProvider from "./groq.js";
import openrouterProvider from "./openrouter.js";

/**
 * The provider line.
 *
 * Everything above this file — the system instruction, the TechnoSpirit
 * knowledge base, history trimming, the length ceiling, the grounding and
 * refusal rules — is written once in services/chat/ and knows nothing about
 * which vendor answers. Everything below it is one vendor's SDK and nothing
 * else.
 *
 * A provider is an object:
 *
 *   {
 *     id: string,
 *     model(): string,
 *     generate({ system, messages, signal }): Promise<{ text: string }>
 *   }
 *
 * `messages` is always `[{ role: "user" | "assistant", text }]` in
 * chronological order. `system` is one already-assembled string. A provider
 * translates those two into whatever shape its SDK wants and translates the
 * answer back to plain text — it does not add instructions, does not touch the
 * knowledge base, and does not decide what the assistant is allowed to say.
 *
 * That is what makes swapping providers a config change: implement `generate`,
 * add a line to the registry, set AI_PROVIDER.
 */

const REGISTRY = {
  groq: groqProvider,
  openrouter: openrouterProvider,
};

/**
 * The active provider, or an AppError describing why there isn't one.
 *
 * Throwing an AppError (rather than returning null) means the controller can
 * let it fall through to the shared error handler and the visitor gets the
 * contact fallback, with no vendor detail attached.
 */
export function getProvider() {
  const id = env.ai.provider;

  if (!KNOWN_AI_PROVIDERS.includes(id)) {
    throw new AppError(503, "The assistant is temporarily unavailable.", {
      code: "AI_PROVIDER_UNKNOWN",
    });
  }

  if (!env.ai.configured) {
    throw new AppError(503, "The assistant is temporarily unavailable.", {
      code: "AI_NOT_CONFIGURED",
    });
  }

  return REGISTRY[id];
}

/** True when the active provider has everything it needs to answer. */
export function isProviderReady() {
  return KNOWN_AI_PROVIDERS.includes(env.ai.provider) && env.ai.configured;
}

/** For the boot log and the health probe — never sent to the browser. */
export function describeProvider() {
  const id = env.ai.provider;
  const provider = REGISTRY[id];
  return {
    provider: id,
    model: provider ? provider.model() : null,
    ready: isProviderReady(),
  };
}
