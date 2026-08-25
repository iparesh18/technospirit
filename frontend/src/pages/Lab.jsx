import { useState } from "react";
import ScrollVideoStage from "@/components/lab/ScrollVideoStage";
import LabBeats from "@/components/lab/LabBeats";
import LabRead from "@/components/lab/LabRead";
import LabHud from "@/components/lab/LabHud";
import LabHandoff from "@/components/lab/LabHandoff";
import LabSeam from "@/components/lab/LabSeam";
import { LabProgressContext, createProgressStore } from "@/components/lab/labProgress";
import usePageMeta from "@/hooks/usePageMeta";

/**
 * /lab — the sequence.
 *
 * Three movements, and they are deliberately not the same temperature:
 *
 *   01  the cinematic. One pinned stage, one piece of footage, five
 *       statements and one explorable moment. Nothing scrolls past it.
 *   02  the handoff. The last frame follows the reader out of the sequence,
 *       cut into the shape of the sentence the sequence was making.
 *   03  the seam. The monolith's gesture at page scale, and the way out.
 *
 * The sequence position lives in a store rather than in state — see
 * `labProgress.js`. React renders this tree once; every frame after that is
 * imperative.
 */
export default function Lab() {
  usePageMeta({
    title: "Lab — TechnoSpirit",
    description:
      "A scroll-controlled sequence: a closed system opens, the core lights, and what runs behind the interface becomes the point.",
  });

  
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
