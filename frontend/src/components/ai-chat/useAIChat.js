import { useCallback, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";

/**
 * Conversation state for the assistant.
 *
 * The transcript lives here and nowhere else — there is no store, no context
 * and no persistence. Closing the panel keeps the conversation for the session
 * (the hook lives in the launcher, which never unmounts) and a reload starts
 * clean, which is the right default for a widget nobody signed into.
 */

/** Turns sent back to the server as context. The server trims to its own limit
 *  and rebuilds the roles regardless — this just avoids posting a transcript
 *  that will only be thrown away. */
const HISTORY_TURNS = 6;

/**
 * "This person wants to be called."
 *
 * Matched against what the VISITOR typed, not against what the model replied —
 * a regex over the question is deterministic and testable, while a regex over a
 * generated answer would attach a call-to-action to whatever wording the model
 * happened to choose that day. It gates one button; nothing else in the
 * conversation changes.
 *
 * The button is the ONLY booking path the assistant has. It deep-links to
 * /contact#book-call and the Contact page opens the same popup the page's own
 * CTA opens — there is no second booking implementation in the chat.
 */
const BOOKING_INTENT =
  /\b(book|schedule|arrange|set\s?up|reserve)\b[^.?!]{0,40}\b(call|meeting|chat|time|slot|appointment)\b|\b(call|ring|phone)\s+me\b|\b(can|could|would)\s+(someone|somebody|anyone|you|your team)\s+(call|phone|ring)\b|\b(speak|talk)\s+(to|with)\s+(someone|somebody|anyone|a\s+human|a\s+person|your\s+team|the\s+team|you)\b|\bdiscuss\s+my\s+(project|idea|requirement)/i;

let nextId = 0;
const makeId = () => `m${nextId++}`;

export default function useAIChat() {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);

  /** Guards double submits. A ref, not state: the check has to be correct
   *  synchronously inside the same tick as the submit event. */
  const inFlight = useRef(false);
  const controller = useRef(null);

  const send = useCallback(async (raw) => {
    const text = raw.trim();
    if (!text || inFlight.current) return;

    inFlight.current = true;
    setThinking(true);

    // Snapshot the history BEFORE the optimistic append, so the message being
    // asked is not also present in the history that accompanies it.
    let history = [];
    setMessages((prev) => {
      history = prev
        .filter((m) => m.role === "user" || m.role === "ai")
        .slice(-HISTORY_TURNS)
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", text: m.text }));
      return [...prev, { id: makeId(), role: "user", text }];
    });

    // Decided from the question, before the answer exists — see BOOKING_INTENT.
    const wantsCall = BOOKING_INTENT.test(text);

    controller.current = new AbortController();

    try {
      const reply = await sendChatMessage(
        { message: text, history },
        controller.current.signal,
      );
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "ai", text: reply.message, action: wantsCall ? "book-call" : null },
      ]);
    } catch (error) {
      if (error?.name === "AbortError") return;
      /**
       * Every failure path renders as an assistant turn rather than as a
       * banner, so the transcript stays a single readable column and the
       * visitor can just ask again. `error.message` is the server's own
       * visitor-facing sentence — the API never sends internals — and
       * `fallback` carries the contact line when one applies.
       */
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "error",
          text: [error?.message, error?.fallback].filter(Boolean).join(" "),
          // Still the right offer: the assistant failed, the request did not.
          action: wantsCall ? "book-call" : null,
        },
      ]);
    } finally {
      inFlight.current = false;
      controller.current = null;
      setThinking(false);
    }
  }, []);

  /** Abort an in-flight request when the panel closes — the answer is no
   *  longer wanted and the socket should not stay open for it. */
  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    inFlight.current = false;
    setThinking(false);
  }, []);

  return { messages, thinking, send, cancel, started: messages.length > 0 };
}
