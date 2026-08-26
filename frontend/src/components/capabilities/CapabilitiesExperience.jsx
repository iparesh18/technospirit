import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { useSmoothScroll } from "@/components/layout/SmoothScroll";
import { StageContext, createStageStore } from "@/components/capabilities/capabilitiesStage";
import OpeningScene from "@/components/capabilities/OpeningScene";
import HandsScene from "@/components/capabilities/HandsScene";
import SneakerScene from "@/components/capabilities/SneakerScene";
import AircraftScene from "@/components/capabilities/AircraftScene";
import CapabilitiesOutro from "@/components/capabilities/CapabilitiesOutro";
import {
  HAND_HUMAN,
  HAND_ROBOT,
  REVEAL_BG,
  LOAD_STAGES,
  TRAVEL,
  CONTACT_FY,
} from "@/components/capabilities/capabilitiesAssets";

// Imported here rather than from index.css so it lands in THIS chunk. A phone
// never renders this component, so it never downloads this stylesheet.
import "@/styles/capabilities.css";

/**
 * /capabilities — the whole piece.
 *
 * ARCHITECTURE, and the three rules it is built on.
 *
 * 1. TWO STAGES, NOT SEVEN SECTIONS. Act one holds the opening, the hands,
 *    the contact, the aperture and the sneaker in ONE sticky stage, with the
 *    beats stacked as layers inside it. That is what makes the aperture
 *    spatial rather than a page turn: the sneaker world is genuinely already
 *    there, painted, underneath the hands, and the circle only decides how
 *    much of it is showing. Act two holds the statement and the aircraft, and
 *    opens on the same near-black the sneaker beat closes on, so the seam
 *    between the two sticky stages falls on two identical grounds and cannot
 *    be seen.
 *
 * 2. ONE CLOCK, TWO NUMBERS. Lenis is driven by GSAP's ticker in
 *    <SmoothScroll>; Lenis updates ScrollTrigger; two ScrollTriggers write
 *    `act1` and `act2` into the store; every scene reads them. No component on
 *    this page starts a requestAnimationFrame loop of its own, and no scene
 *    derives a scroll position independently.
 *
 * 3. NOTHING RUNS THAT IS NOT ON SCREEN. The four `active` flags below are
 *    React state that changes about eight times across the entire page, and
 *    they gate the expensive things absolutely: the pointer lenses remove
 *    their listeners and their ticker callbacks, the videos pause, and
 *    `will-change` is written and cleared rather than left on.
 *
 * The pin is CSS `position: sticky`, not ScrollTrigger.pin — the same call
 * /lab made, and for the same reasons: no pin-spacer to re-measure on every
 * resize and route return, and the site's one real pin stays spent on the
 * horizontal act on Home. ScrollTrigger is left doing the one thing it is
 * exact at, which is reporting progress.
 */

/** Hard ceiling on the prepare state. It exists so the page can never sit
    behind its own loader, not as a duration to fill. */
const PREPARE_CAP = 2500;

export default function CapabilitiesExperience() {
  const root = useRef(null);
  const act1 = useRef(null);
  const act2 = useRef(null);
  const stage1 = useRef(null);

  const [store] = useState(createStageStore);
  const [loadStage, setLoadStage] = useState(1);
  const [live, setLive] = useState({ opening: true, hands: false, sneaker: false, air: false });
  const [ready, setReady] = useState(prefersReducedMotion);
  const [prep, setPrep] = useState(0);

  const scroll = useSmoothScroll();
  const scrollApi = useRef(scroll);
  useLayoutEffect(() => {
    scrollApi.current = scroll;
  });

  /* ══ the prepare gate ═════════════════════════════════════════════════════
     The first required assets are the reveal image, the two hand plates and
     the webfonts — about 162 KB of AVIF plus whatever the font cache already
     holds. The reveal image is in this list rather than lazily loaded because
     it IS the first interaction: the lens opens onto it on the reader's first
     pointer movement, and an image that arrives on that frame is the one thing
     that would make the opening feel unprepared.

     It reports real resolved work rather than a timer pretending to be
     progress, and it is capped so it can never become the experience.

     Scroll is held with Lenis rather than by swallowing wheel events, so
     nothing fights the scroll system, and only ever at the very top of the
     page, so returning to /capabilities mid-scroll never freezes underneath
     anyone. ══════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let alive = true;
    let released = false;
    const locked = window.scrollY <= 8;
    if (locked) {
      scrollApi.current?.stop?.();
      document.documentElement.classList.add("cap-locked");
    }

    const release = () => {
      if (released) return;
      released = true;
      document.documentElement.classList.remove("cap-locked");
      scrollApi.current?.start?.();
      if (!alive) return;
      setPrep(1);
      setReady(true);
      // The stage may have been laid out while the page was held; make sure
      // both triggers measured against the final layout.
      ScrollTrigger.refresh();
    };

    const jobs = [
      loadImage(REVEAL_BG.avif),
      loadImage(HAND_HUMAN.avif),
      loadImage(HAND_ROBOT.avif),
      document.fonts?.ready ?? Promise.resolve(),
    ];

    let done = 0;
    for (const job of jobs) {
      job.then(() => {
        done += 1;
        if (alive && !released) setPrep(done / jobs.length);
      });
    }

    Promise.all(jobs).then(release);
    const cap = window.setTimeout(release, PREPARE_CAP);

    return () => {
      alive = false;
      window.clearTimeout(cap);
      document.documentElement.classList.remove("cap-locked");
      if (!released) scrollApi.current?.start?.();
    };
  }, []);

  /* ══ the two triggers ═════════════════════════════════════════════════ */
  useEffect(() => {
    if (prefersReducedMotion()) {
      store.set("act1", 1);
      store.set("act2", 1);
      setLive({ opening: true, hands: true, sneaker: true, air: true });
      setLoadStage(5);
      return undefined;
    }

    const triggers = [
      ScrollTrigger.create({
        trigger: act1.current,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => store.set("act1", self.progress),
        onRefresh: (self) => store.set("act1", self.progress),
      }),
      ScrollTrigger.create({
        trigger: act2.current,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => store.set("act2", self.progress),
        onRefresh: (self) => store.set("act2", self.progress),
      }),
    ];

    return () => {
      for (const t of triggers) t.kill();
    };
  }, [store]);

  /* ══ staged loading, and what is allowed to run ═══════════════════════════
     Both of these are React state on purpose, and both change a handful of
     times over the whole page rather than once a frame. `stage` moves `src`
     and `preload` attributes; `live` switches whole subsystems off. Anything
     that changes per frame is written imperatively by the scenes themselves
     and never comes through here. ═════════════════════════════════════════ */
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let lastStage = 1;
    let lastLive = "";

    return store.subscribe(({ act1: a1, act2: a2 }) => {
      let next = 1;
      for (const s of LOAD_STAGES) if (a1 >= s.at) next = s.stage;
      // Stages never go backwards. A reader who scrolls up has already paid
      // for the download, and re-deciding would only detach a `src` that the
      // browser has cached and is about to need again.
      if (next > lastStage) {
        lastStage = next;
        setLoadStage(next);
      }

      const l = {
        opening: a1 < 0.2,
        hands: a1 >= 0.1 && a1 < 0.7,
        sneaker: a1 >= 0.6 && a2 <= 0.001,
        air: a2 > 0.001 || a1 > 0.985,
      };
      const key = `${l.opening}${l.hands}${l.sneaker}${l.air}`;
      if (key !== lastLive) {
        lastLive = key;
        setLive(l);
      }
    });
  }, [store]);

  // Every gate change re-publishes the position, so a beat that has just been
  // switched on writes itself immediately instead of waiting for the next
  // scroll event that may never come. See `republish` in capabilitiesStage.
  useEffect(() => {
    store.republish();
  }, [store, live, loadStage, ready]);

  /* ══ stage metrics ════════════════════════════════════════════════════════
     The lens content is sized from these rather than from `100vw`/`100svh`.
     `100vw` includes the scrollbar and the stage does not, and a lens whose
     content is ~15px wider than the layer beneath it shows the seam as a
     visible jump in the revealed picture — which on the sneaker is the RAW and
     REFINED shoes sitting at different positions. ═════════════════════════ */
  useEffect(() => {
    const rootEl = root.current;
    const stageEl = stage1.current;
    if (!rootEl || !stageEl) return undefined;

    const measure = () => {
      rootEl.style.setProperty("--cap-stage-w", `${stageEl.clientWidth}px`);
      rootEl.style.setProperty("--cap-stage-h", `${stageEl.clientHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, []);

  const onAircraftPrepared = useCallback(() => {}, []);

  return (
    <StageContext.Provider value={store}>
      <div
        ref={root}
        className="cap-root"
        data-zone="ink"
        style={{ "--cap-contact-fy": CONTACT_FY }}
      >
        {/* ── ACT ONE ─────────────────────────────────────────────────────
            Opening, hands, contact, aperture, sneaker. One stage. */}
        <section
          ref={act1}
          className="cap-act"
          style={{ "--cap-travel": `${TRAVEL.act1}svh` }}
          aria-label="Human and machine"
        >
          <div ref={stage1} className="cap-stage">
            <HandsScene active={live.hands} />
            <SneakerScene active={live.sneaker} stage={loadStage} />
            {/* Last in source order so it paints above the two beats it hands
                over to — the paper is what the reader starts inside. */}
            <OpeningScene active={live.opening && ready} />
          </div>
        </section>

        {/* ── ACT TWO ─────────────────────────────────────────────────────
            The statement, and the engineering under it. */}
        <section
          ref={act2}
          className="cap-act"
          style={{ "--cap-travel": `${TRAVEL.act2}svh` }}
          aria-label="Under the surface"
        >
          <div className="cap-stage">
            <AircraftScene
              active={live.air}
              stage={loadStage}
              onPrepared={onAircraftPrepared}
            />
          </div>
        </section>

        <CapabilitiesOutro />

        {/* Real progress, three units of genuinely resolved work, and a cap so
            it can never become the experience. */}
        {!prefersReducedMotion() && (
          <div className="cap-prep" data-done={ready ? "" : undefined} aria-hidden={ready}>
            <div className="cap-prep-inner">
              <span className="cap-prep-word ts-display-tight">Capabilities</span>
              <span className="cap-prep-rail">
                <span
                  className="cap-prep-fill"
                  style={{ transform: `scaleX(${prep.toFixed(3)})` }}
                />
              </span>
            </div>
          </div>
        )}
      </div>
    </StageContext.Provider>
  );
}

/** Resolves when the bitmap is decoded, not merely downloaded — an image that
    has arrived but not been decoded still costs its decode on the frame it is
    first painted, which is the frame this gate exists to protect. */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().then(resolve, resolve) : resolve());
    img.onerror = resolve;
    img.src = src;
  });
}
