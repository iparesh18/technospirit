import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import HoverImageReveal from "@/components/contact/HoverImageReveal";
import ContactForm from "@/components/contact/ContactForm";
import BookCallCta from "@/components/contact/BookCallCta";
import { SystemLabel } from "@/components/ui/SystemLabel";
import usePageMeta from "@/hooks/usePageMeta";
import { siteGraph, webPage, breadcrumbList } from "@/lib/structuredData";

const NAME = "Contact — TechnoSpirit";
const DESCRIPTION =
  "Say the word. Three fields, one brief, and a reply from the people who would actually build it.";

const JSON_LD = [
  ...siteGraph,
  {
    ...webPage({ path: "/contact", name: NAME, description: DESCRIPTION, breadcrumb: true }),
    "@type": "ContactPage",
  },
  breadcrumbList({ path: "/contact", name: "Contact" }),
];

/**
 * The booking popup is a dynamic import behind the button, for the same reason
 * the chat panel is: a visitor who only sends a brief downloads none of it —
 * not the calendar, not the country table, not the popup's stylesheet.
 */
const BookCallModal = lazy(() => import("@/components/booking/BookCallModal"));

/** Matches the exit keyframes in styles/booking.css. The modal stays mounted
 *  this long after close is requested so the exit can actually play. */
const BOOKING_EXIT_MS = 190;

/**
 * How long /contact#book-call waits before opening the popup.
 *
 * The route wipe clears at about 1.1s and the entrance timeline is still
 * printing the statement underneath it. Opening on mount would pop the dialog
 * over a black panel; opening here lets the page arrive first, so the deep
 * link reads as "the page loaded, then it offered you the popup" rather than
 * as a jump. Nothing about the entrance timeline is touched either way — this
 * is a timer beside it, not a step inside it.
 */
const DEEP_LINK_DELAY_MS = 1300;
const DEEP_LINK_DELAY_REDUCED_MS = 320;

/**
 * The five ways in.
 *
 * BUILD / AUTOMATE / SCALE are the home hero's three words, handed back to the
 * visitor — the site opens by stating them and ends by showing them again as
 * the things it does. This list is read, not operated: hovering reveals the
 * plate, and the brief on the right is what actually gets sent.
 *
 * `src` is the only thing to change when the artwork changes — drop a file in
 * `public/intent/` and point at it here. Any format the browser can paint
 * works; the plate crops to 4:5 with object-fit.
 */
const INTENTS = [
  { key: "build", word: "Build", src: "/intent/img1.avif" },
  { key: "automate", word: "Automate", src: "/intent/img2.avif" },
  { key: "scale", word: "Scale", src: "/intent/img3.avif" },
  { key: "collaborate", word: "Collaborate", src: "/intent/img4.avif" },
  { key: "else", word: "Something else", src: "/intent/img5.avif" },
];

export default function Contact() {
  usePageMeta({ title: NAME, description: DESCRIPTION, jsonLd: JSON_LD });

  const root = useRef(null);

  /**
   * The popup's open state — "closed" | "open" | "closing".
   *
   * Three states rather than a boolean, because the exit needs a frame of its
   * own: unmounting on the click would make the panel vanish instead of
   * leaving. Same shape as <AIChatLauncher>, for the same reason.
   *
   * This is the ONLY state this page gained. The entrance timeline below is
   * untouched, and nothing in it reads or writes any of it.
   */
  const [booking, setBooking] = useState("closed");
  const bookingTrigger = useRef(null);
  const exitTimer = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const openBooking = useCallback(() => {
    clearTimeout(exitTimer.current);
    setBooking("open");
  }, []);

  const closeBooking = useCallback(() => {
    setBooking((current) => (current === "open" ? "closing" : current));
    // Focus returns to the button it came from, on the close request rather
    // than after the exit — otherwise a keyboard user is stranded on a
    // detached element for the length of the animation.
    bookingTrigger.current?.focus();
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setBooking("closed"), BOOKING_EXIT_MS);
  }, []);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  /**
   * /contact#book-call — the deep link the assistant hands out.
   *
   * Keyed on the hash rather than on mount, so it works both ways: arriving
   * from another route (the page mounts with the hash) and clicking the same
   * link while already on /contact (only the hash changes, and this page does
   * not remount). The hash is cleared once it has been used, which is what
   * lets the assistant offer the button a second time after the popup has
   * been closed — an unchanged location fires no effect.
   */
  useEffect(() => {
    if (location.hash !== "#book-call") return undefined;

    const delay = prefersReducedMotion() ? DEEP_LINK_DELAY_REDUCED_MS : DEEP_LINK_DELAY_MS;
    const timer = setTimeout(() => {
      openBooking();
      // Replaces the URL without a navigation. RouteTransition keys its wipe
      // on pathname only, so this cannot trigger one.
      navigate(location.pathname, { replace: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [location.hash, location.pathname, navigate, openBooking]);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) return;

      /**
       * Same grammar as <PageOpener>, same easing, roughly the same clock —
       * structure draws, metadata lands, the statement prints, then the
       * instrument assembles under it. Timed to be read *through* the route
       * wipe: the panel clears at about 1.1s, which is when the headline is
       * still rising and the words have only just begun.
       */
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .fromTo(
          q("[data-c-rule]"),
          { scaleY: 0 },
          { scaleY: 1, duration: 1, stagger: 0.06, transformOrigin: "top center" },
        )
        .fromTo(
          q("[data-c-meta]"),
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 },
          "-=0.75",
        )
        .fromTo(
          q("[data-c-word]"),
          { yPercent: 112 },
          { yPercent: 0, duration: 1.1, stagger: 0.08 },
          "-=0.5",
        )
        .fromTo(
          q("[data-c-lead]"),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.07 },
          "-=0.72",
        )
        .fromTo(
          q("[data-c-seam]"),
          { scaleY: 0 },
          { scaleY: 1, duration: 0.9, transformOrigin: "top center" },
          "-=0.62",
        )
        .fromTo(
          q("[data-c-rowword]"),
          { yPercent: 110 },
          { yPercent: 0, duration: 0.85, stagger: 0.06 },
          "-=0.8",
        )
        .fromTo(
          q("[data-c-field]"),
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 },
          "-=0.72",
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="paper"
      aria-label="Contact TechnoSpirit"
      className="ts-act-open relative overflow-hidden bg-white text-black"
    >
      <div className="ts-rules [--rule-count:3] md:[--rule-count:6]" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-c-rule
            className={`h-full origin-top border-r border-hair ${i > 2 ? "hidden md:block" : ""}`}
            style={{ transform: "scaleY(0)" }}
          />
        ))}
      </div>

      <div className="ts-shell relative">
        {/* ── metadata rail ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 border-b border-hair pb-4">
          <span data-c-meta>
            <SystemLabel>CONTACT / START HERE</SystemLabel>
          </span>
          <span data-c-meta>
            <SystemLabel className="hidden sm:inline-flex">TECHNOSPIRIT / GLOBAL</SystemLabel>
          </span>
        </div>

        {/* ── the statement ─────────────────────────────────────────── */}
        {/* Deliberately smaller than the openers on the other four routes.
            This page's subject is the instrument below it, and at the site's
            usual 13vw the statement was 2.3× the intent words and read as the
            main event — which pushed the thing people actually came here to
            use most of a viewport below the fold. */}
        <h1 className="mt-8 sm:mt-10" aria-label="Say the word.">
          {["Say the", "word."].map((line, i) => (
            <span key={line} className="ts-mask block" aria-hidden="true">
              <span
                data-c-word
                className={`ts-display-tight block text-[clamp(2.4rem,8.2vw,7rem)] will-change-transform ${
                  i === 1 ? "text-signal" : ""
                }`}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        {/* The lead sits in the form's column, not under the headline. It
            fills what was a dead quarter of the page, and it starts the
            vertical axis that the seam then carries all the way down: giant
            type on the left of it, quiet type on the right. */}
        <div className="ts-grid mt-9 sm:mt-11">
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            <p
              data-c-lead
              className="ts-body max-w-lg border-t-2 border-ink pt-5 text-base text-ash sm:text-lg"
            >
              Tell us what you're trying to do — three fields, then a reply from the people
              who would actually build it.
            </p>
          </div>
        </div>

        {/* ── the split ─────────────────────────────────────────────── */}
        <div className="ts-grid ts-contact-split mt-11 sm:mt-14">
          <div className="col-span-12 lg:col-span-7">
            <HoverImageReveal items={INTENTS} />
          </div>

          <div className="ts-contact-formcol relative col-span-12 mt-14 lg:col-span-5 lg:col-start-8 lg:mt-0">
            {/* the seam. A hairline, not a border, so it can be drawn. */}
            <span
              data-c-seam
              aria-hidden="true"
              className="ts-contact-seam"
              style={{ transform: "scaleY(0)" }}
            />

            <ContactForm />

            {/* The secondary way in. `data-c-field` is the page's existing
                entrance hook, reused rather than extended: the timeline's
                stagger is from-start, so the three fields above keep their
                exact original delays and this simply lands one step after
                them. Not one line of the timeline changed to accommodate it. */}
            <div data-c-field>
              <BookCallCta onOpen={openBooking} buttonRef={bookingTrigger} />
            </div>
          </div>
        </div>
      </div>

      {/*
        The popup renders into document.body through a portal, so it is a
        sibling of this section rather than a descendant — outside its
        `overflow-hidden`, outside its GSAP scope, and unable to affect its
        layout or its timeline. No fallback: the chunk is a few kilobytes on
        the same origin, and a spinner that flashes for one frame is worse
        than nothing.
      */}
      {booking !== "closed" && (
        <Suspense fallback={null}>
          <BookCallModal state={booking} onClose={closeBooking} />
        </Suspense>
      )}
    </section>
  );
}
