/**
 * The badges a booking carries into the dashboard.
 *
 * Two kinds, kept apart on purpose:
 *
 *   STORED   — country and interest. Facts about the booking that were true
 *              when it was made and stay true, so they are written once.
 *   DERIVED  — TODAY / UPCOMING / PAST. These are statements about the clock,
 *              not about the booking, and storing them would mean a row that
 *              silently lies the next morning. The dashboard computes them.
 *
 * Deliberately not AI classification. A keyword hit on a field the visitor
 * chose the words for is honest; a model guessing "probably automation" from
 * two sentences is a fabricated fact, which this project does not ship.
 */

/** Countries whose common short form reads better than their formal name. */
const COUNTRY_SHORTHAND = {
  "United States": "USA",
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "Saudi Arabia": "KSA",
};

/**
 * Interest tags, in priority order. The most specific patterns come first, so
 * "AI voice agent" tags VOICE AGENT rather than the broader AI.
 */
const INTEREST_RULES = [
  { tag: "VOICE AGENT", pattern: /\bvoice\s*(agent|ai|bot)?\b|\bcall\s*agent\b|\bivr\b/i },
  { tag: "CHATBOT", pattern: /\bchat\s*bot\b|\bchatbot\b|\bassistant\b|\blive\s*chat\b/i },
  { tag: "AUTOMATION", pattern: /\bautomat\w*\b|\bworkflow\w*\b|\bintegrat\w*\b|\bzapier\b|\bn8n\b/i },
  { tag: "WEB", pattern: /\bweb\s*site\b|\bwebsite\b|\bweb\s*app\b|\blanding\s*page\b|\becommerce\b|\be-commerce\b|\bshopify\b/i },
  { tag: "SOFTWARE", pattern: /\bcustom\s*software\b|\bsaas\b|\bplatform\b|\bdashboard\b|\bmobile\s*app\b|\bcrm\b/i },
  { tag: "GROWTH", pattern: /\bseo\b|\bmarketing\b|\bgrowth\b|\bads?\b|\bcampaign\b|\bbrand\w*\b/i },
  { tag: "AI", pattern: /\bai\b|\bartificial\s*intelligence\b|\bmachine\s*learning\b|\bllm\b|\bagent\w*\b/i },
];

/** At most this many interest tags — a row of eight badges is not a signal. */
const MAX_INTEREST_TAGS = 2;

export function countryTag(country) {
  const name = String(country ?? "").trim();
  if (!name) return null;
  return (COUNTRY_SHORTHAND[name] ?? name).toUpperCase();
}

export function interestTags(discussion) {
  const text = String(discussion ?? "");
  if (!text.trim()) return [];

  const found = [];
  for (const { tag, pattern } of INTEREST_RULES) {
    if (found.length >= MAX_INTEREST_TAGS) break;
    if (pattern.test(text)) found.push(tag);
  }
  return found;
}

/** The stored set: country first, then whatever the brief obviously names. */
export function buildTags({ country, discussion }) {
  const tags = [];
  const country_ = countryTag(country);
  if (country_) tags.push(country_);
  tags.push(...interestTags(discussion));
  return [...new Set(tags)];
}

export default buildTags;
