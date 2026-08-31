import LivingBlob from "./LivingBlob";

/**
 * The thinking state.
 *
 * Deliberately the same entity as the launcher, smaller: the blob the visitor
 * clicked is what is now working. The three points use the same red and the
 * same reorganising motion as the lines inside it, so the loading state reads
 * as the assistant concentrating rather than as a generic spinner bolted on.
 *
 * `aria-live="polite"` and a text label keep it announced without stealing
 * focus; the dots themselves are decorative.
 */
export default function AIThinkingIndicator() {
  return (
    <div className="ts-ai-think" role="status" aria-live="polite">
      <LivingBlob size={22} />
      <span className="flex items-center gap-[5px]" aria-hidden="true">
        <span className="ts-ai-think-dot" />
        <span className="ts-ai-think-dot" />
        <span className="ts-ai-think-dot" />
      </span>
      <span className="sr-only">TechnoSpirit AI is thinking</span>
    </div>
  );
}
