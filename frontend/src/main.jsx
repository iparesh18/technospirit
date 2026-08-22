import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// "JS is live" — the switch that arms every CSS resting state in the motion
// primitives block of index.css. It is set here, once, before the first render
// rather than from an effect inside <SmoothScroll>, because an effect lands
// *after* the layout effects that initialise the animations. That ordering made
// the very first mount read `transform: none` while every client-side remount
// read the seeded transform, so a component could animate correctly on load and
// incorrectly on navigation. One condition for both.
document.documentElement.classList.add("ts-motion");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
