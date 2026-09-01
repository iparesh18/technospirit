import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import CutoutHeading from "@/components/motion/CutoutHeading";
import { SystemLabel } from "@/components/ui/SystemLabel";

/**
 * The handoff out of the sequence.
 *
 * The cinematic ends on the reassembled structure with the core still lit, in
 * a white room. Cutting straight from that to an ordinary black section would
 * be a hard edit, so the last frame comes with us: the statement here is
 * literally cut out of it. The words are a window onto the picture the reader
 * was looking at one scroll earlier, which is the point being made — the
 * interface is a shape cut out of the system, not the system.
 *
 * The red core survives the cut too, as the square beside the label. It is the
 * only red on the section, and it is the same red that was burning in the
 * middle of the frame above it.
 */
export default function LabHandoff() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      gsap
        .timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: root.current, start: "top 78%" },
        })
        .fromTo(
          q("[data-h-rule]"),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1, transformOrigin: "left center" },
          0,
        )
        .fromTo(q("[data-h-meta]"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 }, 0.1)
        .fromTo(
          q("[data-h-cut]"),
          { opacity: 0, y: 34 },
          { opacity: 1, y: 0, duration: 1.2 },
          0.16,
        )
        .fromTo(
          q("[data-h-body]"),
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.08,
            // The tween leaves an identity matrix behind, which keeps the
            // paragraph on its own composited layer and switches its text
            // off grayscale antialiasing — visible as colour fringing on
            // body copy. Clearing the transform hands it back to the page.
            clearProps: "transform",
          },
          0.5,
        );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-zone="ink"
      aria-label="What the sequence was about"
      className="ts-lab-handoff ts-act relative bg-black text-white"
    >
      <div className="ts-shell relative">
        <div className="flex items-center justify-between gap-4">
          <span data-h-meta className="inline-flex items-center gap-3">
            {/* the core, kept */}
            <span aria-hidden="true" className="ts-lab-core-mark" />
            <SystemLabel className="text-white/55">SEQUENCE 01 / RESOLVED</SystemLabel>
          </span>
          <span data-h-meta>
            <SystemLabel className="hidden text-white/40 sm:inline-flex">
              STILL / 9.13s
            </SystemLabel>
          </span>
        </div>

        <span
          data-h-rule
          aria-hidden="true"
          className="mt-5 block h-px w-full bg-white/20"
          style={{ transform: "scaleX(0)" }}
        />

        <div data-h-cut className="mt-10 sm:mt-14">
          {/*
            `as="h1"`, not the component's default h2.

            /lab had no h1 at all: the restricted screen owns one, but the
            desktop experience — the version a crawler actually renders — began
            at h2 and left the document with a heading outline hanging off
            nothing. This line is the page's primary statement, so it is the
            heading that should carry the rank.

            Purely semantic. `h1` and `h2` are declared together in index.css
            (font-weight: 800; text-wrap: balance) and every visual property
            here comes from .ts-lab-cut and the component's own classes, so
            nothing about the cutout changes.
          */}
          <CutoutHeading
            as="h1"
            lines={["The interface", "is the", "thin part."]}
            src="/lab/handoff.webp"
            className="ts-lab-cut"
          />
        </div>

        <div className="ts-grid mt-12 sm:mt-16">
          <p data-h-body className="ts-body col-span-12 text-lg text-white/70 md:col-span-6 lg:col-span-5">
            Everything a visitor touches is a surface. What decides, repeats and
            keeps working when nobody is watching sits behind it — and that is
            the part that determines whether the surface was worth building.
          </p>
          <p
            data-h-body
            className="ts-body col-span-12 text-lg text-white/70 md:col-span-6 lg:col-span-5 lg:col-start-8"
          >
            TechnoSpirit builds both halves, in that order. The site is what you
            see of it.
          </p>
        </div>
      </div>
    </section>
  );
}
