import { forwardRef, useCallback, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Matches MAX_INPUT_CHARS in backend/services/chat/chatService.js. The server
 *  is the real gate; this stops a visitor from typing a message that will only
 *  be rejected after they press send. */
const MAX_CHARS = 1000;

/**
 * The composer.
 *
 * A textarea rather than an input, because Shift+Enter has to produce a
 * newline — and because a long brief pasted into a single-line field is
 * unreadable while you are writing it.
 */
const AIChatInput = forwardRef(function AIChatInput({ onSend, disabled }, ref) {
  const [value, setValue] = useState("");
  const innerRef = useRef(null);
  const textarea = ref ?? innerRef;

  /** Grows with the content up to the CSS max-height, then scrolls. Written
   *  directly rather than through state — this runs on every keystroke and has
   *  no business causing a React render. */
  const autoGrow = useCallback(
    (el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [],
  );

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    // Reset the grown height with the value, or the box keeps the old size.
    const el = textarea.current;
    if (el) {
      el.style.height = "auto";
      el.focus();
    }
  }, [value, disabled, onSend, textarea]);

  const onKeyDown = useCallback(
    (event) => {
      // Enter sends, Shift+Enter is a newline. `isComposing` guards IME input:
      // without it, Enter to confirm a candidate in a Japanese or Chinese IME
      // would send a half-typed message.
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const empty = !value.trim();

  return (
    <form
      className="ts-ai-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="ts-ai-input">
        Ask TechnoSpirit AI a question
      </label>
      <textarea
        id="ts-ai-input"
        ref={textarea}
        rows={1}
        className="ts-ai-input ts-body text-[0.9rem]"
        placeholder="Ask TechnoSpirit..."
        value={value}
        maxLength={MAX_CHARS}
        onChange={(event) => {
          setValue(event.target.value);
          autoGrow(event.target);
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="submit"
        className="ts-ai-send"
        /* Disabled while empty and while a reply is in flight — the two ways a
           second submit could produce a duplicate or an empty turn. */
        disabled={empty || disabled}
        aria-label="Send message"
      >
        <ArrowUp size={16} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </form>
  );
});

export default AIChatInput;
