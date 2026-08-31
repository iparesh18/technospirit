import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import LivingBlob from "./LivingBlob";
import CircularText from "@/components/CircularText";
import useAIChat from "./useAIChat";
import useLauncherTheme from "./useLauncherTheme";
import "@/styles/ai-chat.css";

/**
 * The assistant's entry point, and the only part of it that ships in the main
 * bundle.
 *
 * The panel is a dynamic import, so a visitor who never clicks the blob
 * downloads the launcher and nothing else — no panel markup, no composer, no
 * conversation code. There is no AI SDK on the client at all: the browser
 * knows one endpoint, POST /api/chat, and the key never leaves the server.
 *
 * The conversation state lives HERE rather than in the panel, so closing and
 * reopening keeps the transcript — the panel unmounts, the hook does not.
 */
const AIChatPanel = lazy(() => import("./AIChatPanel"));

/** Matches the exit animation in ai-chat.css. The panel stays mounted for this
 *  long after close is requested so the exit can actually play — unmounting on
 *  the click would make it vanish. */
const EXIT_MS = 180;

/**
 * The ring.
 *
 * Two bullets rather than one, set opposite each other, so the ring has
 * rotational symmetry and never looks like a sentence that happens to be bent —
 * the separator reads as ornament at every angle instead of as a full stop
 * that swings past once a revolution. The trailing space is a real slot: it is
 * what keeps the gap after the last bullet equal to the others.
 */
const RING_TEXT = "CUSTOMER • SUPPORT • ";

/** Seconds per revolution. Inside the 12–18s brief, at the calm end: this turns
 *  in the corner of every page on the site, and anything brisker starts asking
 *  to be looked at. */
const RING_SPIN = 16;

/** Hover rate. 1.2 is 20% faster — present when you are pointing at it, not a
 *  trick. Ramped over ~320ms by <CircularText>, never snapped. */
const RING_HOVER_RATE = 1.2;

/** Distance from centre to the characters' baseline. The blob is 56px, so its
 *  edge is at 28 — this leaves a 14px gap that the ring never crosses, which is
 *  the whole reason the blob needed no change to accommodate the text. */
const RING_RADIUS = 42;

export default function AIChatLauncher() {
  /** "closed" | "open" | "closing" — three states, not a boolean, because the
   *  exit needs a frame of its own. */
  const [state, setState] = useState("closed");
  const launcher = useRef(null);
  const exitTimer = useRef(null);
  const { messages, thinking, send, cancel } = useAIChat();

  const open = useCallback(() => {
    clearTimeout(exitTimer.current);
    setState("open");
  }, []);

  const close = useCallback(() => {
    setState((current) => (current === "open" ? "closing" : current));
    cancel();
    // Focus returns to the launcher, which is where it came from. Done on the
    // close request rather than after the exit so a keyboard user is never
    // stranded on a detached element mid-animation.
    launcher.current?.focus();
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setState("closed"), EXIT_MS);
  }, [cancel]);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  /**
   * The blob leans toward the cursor.
   *
   * Written straight to a custom property on every pointermove — never through
   * setState. A React render per pointer frame would re-render the launcher
   * (and re-run the blob's GSAP effect) sixty times a second, which is exactly
   * the "do not re-render the whole site because the blob animates" failure.
   * The CSS transition on that property does the smoothing, so there is no rAF
   * loop either.
   */
  useEffect(() => {
    const el = launcher.current;
    if (!el) return undefined;
    // Pointer reaction is a fine-pointer affordance; on touch it would only
    // ever fire as a jump after a tap.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const REACH = 110; // px at which the blob starts noticing
    const PULL = 0.12; // fraction of the distance it actually travels

    const onMove = (event) => {
      const box = el.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy);

      if (distance > REACH) {
        el.style.setProperty("--ts-ai-x", "0px");
        el.style.setProperty("--ts-ai-y", "0px");
        return;
      }
      el.style.setProperty("--ts-ai-x", `${dx * PULL}px`);
      el.style.setProperty("--ts-ai-y", `${dy * PULL}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.style.removeProperty("--ts-ai-x");
      el.style.removeProperty("--ts-ai-y");
    };
  }, []);

  const isOpen = state !== "closed";

  /**
   /**
   * Whether the launcher is over the site's one red section. Read only by the
   * circular text, which is brand red everywhere else.
   */
  const theme = useLauncherTheme(launcher);

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className="ts-ai-launcher"
        data-hidden={isOpen}
        /* Hidden from the tab order while the panel is up, so Tab cycles the
           conversation rather than escaping to a button behind it. */
        tabIndex={isOpen ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Open TechnoSpirit customer support"
        /* Read by the stylesheet to colour the ring, and only the ring. */
        data-launcher-theme={theme}
        /* The site's cursor follower reads this attribute. */
        data-cursor="open"
        onClick={open}
      >
        {/*
          The ring is a sibling of the blob, not a parent — which is what
          guarantees the blob does not rotate with it. Both are placed in the
          same grid cell so they share a centre.

          `hoverTarget` is this button rather than the ring itself: the two are
          siblings, so binding hover to the ring would fire mouseleave the
          instant the pointer crossed onto the blob in the middle of it.
        */}
        <CircularText
          className="ts-ai-ring"
          text={RING_TEXT}
          spinDuration={RING_SPIN}
          onHover={RING_HOVER_RATE}
          radius={RING_RADIUS}
          hoverTarget={launcher}
        />

        {/* Untouched. */}
        <LivingBlob size={56} />
      </button>

      {isOpen && (
        /* No fallback: the chunk is a few kilobytes on the same origin, and a
           spinner that flashes for one frame is worse than nothing. */
        <Suspense fallback={null}>
          <AIChatPanel
            state={state}
            messages={messages}
            thinking={thinking}
            onSend={send}
            onClose={close}
          />
        </Suspense>
      )}
    </>
  );
}
