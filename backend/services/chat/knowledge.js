import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import env from "../../config/env.js";

/**
 * The TechnoSpirit knowledge base.
 *
 * Read once at import time and rendered once into a compact block of text. The
 * file is ~7 kB of JSON; re-serialising it per request would be pure waste, and
 * sending it as raw JSON would spend tokens on punctuation and key names the
 * model does not need.
 *
 * Deliberately NOT a vector store. At this size the entire corpus fits in the
 * system instruction with room to spare, and retrieval would add an index to
 * keep in sync, an embedding call per request and a class of "the right chunk
 * wasn't retrieved" bug — to solve a problem this site does not have.
 *
 * The seam for a later RAG swap is `buildKnowledgeContext(question)`: today it
 * ignores the question and returns everything. A retrieval version changes this
 * one function's body and nothing else — not the prompt, not the service, not
 * the route, not the UI.
 */

const KNOWLEDGE_PATH = fileURLToPath(new URL("../../knowledge/technospirit.json", import.meta.url));

/** Fail loudly at boot if the file is missing or malformed — a silently empty
 *  knowledge base is an assistant that confidently knows nothing. */
function load() {
  try {
    return JSON.parse(readFileSync(KNOWLEDGE_PATH, "utf8"));
  } catch (error) {
    throw new Error(`Could not load knowledge/technospirit.json: ${error.message}`);
  }
}

const knowledge = load();

/* — rendering ————————————————————————————————————————— */

const line = (label, value) => (value ? `${label}: ${value}` : null);

function renderServiceGroup(key, group) {
  const entries = group.entries.map((e) => {
    const includes = e.includes?.length ? ` [${e.includes.join(", ")}]` : "";
    return `  - ${e.name}: ${e.body}${includes}`;
  });
  return [`${key.toUpperCase()} — ${group.lead}`, ...entries].join("\n");
}

function render(k) {
  const sections = [];

  sections.push(
    [
      "## COMPANY",
      line("Name", k.company.name),
      line("What it is", k.company.what_we_are),
      line("What it builds", k.company.what_we_build),
      line("Mission", k.company.mission),
      line("Vision", k.company.vision),
      line("Working style", k.positioning.working_style),
      line("Positioning", k.positioning.statement),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  sections.push(
    ["## DISCIPLINES", ...k.company.disciplines.map((d) => `  - ${d.name}: ${d.body}`)].join("\n"),
  );

  sections.push(
    [
      "## SERVICES",
      ...Object.entries(k.services).map(([key, group]) => renderServiceGroup(key, group)),
    ].join("\n"),
  );

  sections.push(
    ["## PROCESS", ...k.process.map((p) => `  ${p.step}. ${p.name} — ${p.body}`)].join("\n"),
  );

  sections.push(
    ["## WHY TECHNOSPIRIT", ...k.why_us.map((r) => `  - ${r.title}: ${r.body}`)].join("\n"),
  );

  sections.push(
    ["## PRINCIPLES", ...k.principles.map((p) => `  - ${p.title} ${p.body}`)].join("\n"),
  );

  sections.push(
    [
      "## WHAT TECHNOSPIRIT REFUSES TO DO",
      ...k.positioning.refusals.map((r) => `  - ${r.title}: ${r.body}`),
    ].join("\n"),
  );

  sections.push(["## SITE PAGES", ...k.pages.map((p) => `  - ${p.path} — ${p.purpose}`)].join("\n"));

  sections.push(
    [
      "## NOT PUBLISHED — NO VALUE EXISTS FOR ANY OF THESE",
      k.not_known.note,
      ...k.not_known.topics.map((t) => `  - ${t}`),
    ].join("\n"),
  );

  return sections.join("\n\n");
}

/** Rendered once. The contact block is appended per request instead, because
 *  it comes from env and must not be baked into a module-level constant that
 *  a config reload would not reach. */
const RENDERED = render(knowledge);

/**
 * The knowledge context for one question.
 *
 * `question` is accepted and ignored: it is the parameter a retrieval
 * implementation needs, declared now so introducing one later does not change
 * this function's signature or any call site.
 */
// eslint-disable-next-line no-unused-vars -- reserved for a later retrieval step
export function buildKnowledgeContext(question) {
  return [
    RENDERED,
    "",
    "## CONTACT — the only contact details that exist. Quote them exactly.",
    `  Phone: ${env.contact.phone}`,
    `  Email: ${env.contact.email}`,
    "  Contact page: /contact (name, email, and what they need)",
    "",
    /**
     * The booking flow, described so the assistant can point at it.
     *
     * It says what exists and nothing more — no hours, no slot times, no
     * "usually within 24 hours". Those are real values the schedule owns and
     * the popup shows; stating them here would be a second source of truth
     * that goes stale the first time the working week changes.
     */
    "## BOOKING A CALL",
    "  A visitor can book a call and TechnoSpirit will phone them at the time they pick.",
    "  It happens in a popup on the /contact page — they choose a day and a time from the",
    "  slots that are actually free, leave a phone number with its country code, and get a",
    "  confirmation email. The UI shows a BOOK A CALL button alongside your answer whenever",
    "  someone asks to speak to, call, or schedule time with the team, so you do not need to",
    "  paste a link — say the call can be booked and stop.",
    "  Never state which days or times are available, how long the call is, or who takes it.",
  ].join("\n");
}

/** Exposed for the health probe and tests. */
export const knowledgeMeta = {
  services: Object.fromEntries(
    Object.entries(knowledge.services).map(([k, v]) => [k, v.entries.length]),
  ),
  bytes: Buffer.byteLength(RENDERED, "utf8"),
};

export default knowledge;
