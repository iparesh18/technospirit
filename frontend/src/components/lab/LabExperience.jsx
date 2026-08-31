import { useState } from "react";
import ScrollVideoStage from "@/components/lab/ScrollVideoStage";
import LabBeats from "@/components/lab/LabBeats";
import LabRead from "@/components/lab/LabRead";
import LabHud from "@/components/lab/LabHud";
import LabHandoff from "@/components/lab/LabHandoff";
import LabSeam from "@/components/lab/LabSeam";
import { LabProgressContext, createProgressStore } from "@/components/lab/labProgress";

/**
 * The sequence itself.
 *
 * Three movements, and they are deliberately not the same temperature:
 *
 *   - the cinematic. One pinned stage, one piece of footage, five statements
 *     and one explorable moment. Nothing scrolls past it.
 *   - the handoff. The last frame follows the reader out of the sequence, cut
 *     into the shape of the sentence the sequence was making.
 *   - the seam. The monolith's gesture at page scale, and the way out.
 *
 * The sequence position lives in a store rather than in state — see
 * `labProgress.js`. React renders this tree once; every frame after that is
 * imperative.
 *
 * Split out of the route so the whole thing sits behind a dynamic import: a
 * phone that opens /lab never requests this module, and therefore never
 * requests the footage, the decode path or any of the GSAP wiring under it.
 */
export default function LabExperience() {
  // Created exactly once, by the state initialiser. A store rebuilt on render
  // would drop every subscriber the children set up in their own effects.
  const [store] = useState(createProgressStore);

  return (
    <LabProgressContext.Provider value={store}>
      <ScrollVideoStage store={store}>
        <LabHud />
        <LabBeats />
        <LabRead />
      </ScrollVideoStage>

      <LabHandoff />
      <LabSeam />
    </LabProgressContext.Provider>
  );
}
