import { Fragment, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import LivingBlob from "./LivingBlob";
import AIChatMessage from "./AIChatMessage";
import AIChatInput from "./AIChatInput";
import AIThinkingIndicator from "./AIThinkingIndicator";

/**
 * The chat panel.
 *
 * Lazy-loaded: nothing in this file, and none of what it imports, is in the
 * bundle until someone actually clicks the blob.
 *
 * All of its motion is CSS (see styles/ai-chat.css). That is not a stylistic
 * preference — it is motion rule 5 on this project. The mobile menu sheet was
 * a GSAP timeline keyed on an `open` prop and it never ran once, because the
 * portal's children do not exist on the frame the flag flips. A CSS animation
 * attached to a data-attribute cannot lose that race.
 */

/** Four openings, matching the three service groups plus the thing most
 *  visitors are actually here to do. Shown only before the first message. */
const QUICK_ACTIONS = [
  { label: "Web", prompt: "What web services does TechnoSpirit offer?" },
  { label: "AI", prompt: "What AI services does TechnoSpirit offer?" },
  { label: "Growth", prompt: "What growth services does TechnoSpirit offer?" },
  { label: "Work With Us", prompt: "How do I start a project with TechnoSpirit?" },
];

export default function AIChatPanel({ state, messages, thinking, onSend, onClose }) {
  const panel = useRef(null);
  const log = useRef(null);
  const input = useRef(null);
  /** False once the visitor scrolls up — see the scroll logic below. */
  const stick = useRef(true);

  /* — focus ————————————————————————————————————————
   * Focus moves into the panel on open. useLayoutEffect so it lands before
   * paint and a screen reader announces the panel rather than the page behind
   * it. Returning focus to the launcher is the launcher's job, because this
   * component is unmounted by the time the close finishes.
   */
  useLayoutEffect(() => {
    if (state !== "open") return;
    // The composer, not the dialog: the visitor opened this to type.
    input.current?.focus();
  }, [state]);

  /* — escape ———————————————————————————————————————— */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* — focus trap ————————————————————————————————————
   * Small and hand-rolled rather than a dependency: the panel has a known,
   * short set of focusables and Radix's FocusScope would pull in a dialog
   * primitive for one behaviour.
   */
  const onKeyDownCapture = useCallback((event) => {
    if (event.key !== "Tab" || !panel.current) return;
    const focusable = panel.current.querySelectorAll(
      'button:not(:disabled), textarea, a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  /* — scrolling —————————————————————————————————————
   * Follow the conversation, but never yank the view away from someone who
   * has scrolled up to re-read an earlier answer. `stick` is set by the
   * visitor's own scrolling and is the only thing that authorises an
   * auto-scroll.
   */
  const onScroll = useCallback(() => {
    const el = log.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distanceFromBottom < 60;
  }, []);

  useEffect(() => {
    const el = log.current;
    if (!el || !stick.current) return;
    el.scrollTo({
      top: el.scrollHeight,
      // Smooth would fight Lenis and would lag behind a fast exchange.
      behavior: "auto",
    });
  }, [messages, thinking]);

  const showQuickActions = messages.length === 0;

  return (
    <div className="ts-ai-panel-root" data-state={state}>
      {/* Mobile only (CSS): on desktop the panel is a small object in the
          corner and does not claim the page. */}
      <div className="ts-ai-scrim" onClick={onClose} aria-hidden="true" />

      <div
        ref={panel}
        className="ts-ai-panel"
        data-zone="ink"
        role="dialog"
        aria-modal="false"
        aria-label="TechnoSpirit AI"
        /*
          Mute the site cursor inside the panel — the same escape hatch
          <HoverImageReveal> uses, for the same reason. The follower arms a
          58px interactive square over anything button-shaped, and in here that
          means a red block parked on the send button and over the composer,
          where what you actually want is a text caret. The launcher keeps its
          "open" label; this is a dense reading-and-typing surface and the
          cursor should get out of its way.
        */
        data-cursor-mute=""
        onKeyDownCapture={onKeyDownCapture}
      >
        <header className="ts-ai-head">
          <div className="flex items-center gap-2.5">
            <LivingBlob size={26} />
            <span className="ts-label text-white">TechnoSpirit AI</span>
          </div>
          <button type="button" className="ts-ai-close" onClick={onClose} aria-label="Close chat">
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div
          ref={log}
          className="ts-ai-log"
          onScroll={onScroll}
          /* The transcript is a log, not a live region shouting every token —
             the thinking indicator already carries aria-live. */
          role="log"
          aria-label="Conversation"
        >
          <div className="ts-ai-msg ts-ai-msg--ai">
            <p className="ts-body text-[0.925rem] leading-[1.6] text-white/88">
              Hi. I&rsquo;m TechnoSpirit AI.
              <br />
              What would you like to know?
            </p>
          </div>

          {/* The openings are scaffolding: they exist to get the first
              question asked, and they are gone the moment there is one. */}
          {showQuickActions && (
            <div className="ts-ai-chips">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="ts-ai-chip ts-label"
                  onClick={() => onSend(action.prompt)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {messages.map((message) => (
            <Fragment key={message.id}>
              <AIChatMessage role={message.role} text={message.text} />

              {/*
                The assistant's one route into the booking flow.

                A router <Link> to /contact#book-call, and nothing more — the
                Contact page opens the SAME popup its own CTA opens. There is
                no scheduling UI in the chat, no second form, and no second
                availability call; this is a deep link with a slab around it.
                The panel closes on the way, because the popup is about to
                become the thing on screen.
              */}
              {message.action === "book-call" && (
                <Link to="/contact#book-call" className="ts-ai-book" onClick={onClose}>
                  <span className="ts-label">BOOK A CALL</span>
                  <ArrowUpRight size={14} strokeWidth={1.9} aria-hidden="true" />
                </Link>
              )}
            </Fragment>
          ))}

          {thinking && <AIThinkingIndicator />}
        </div>

        <AIChatInput ref={input} onSend={onSend} disabled={thinking} />
      </div>
    </div>
  );
}
