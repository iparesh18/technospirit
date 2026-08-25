/**
 * Development-only seed: writes sample inquiries straight to Mongo so the
 * dashboard has something to page, filter and search through.
 *
 * Deliberately bypasses POST /api/contact — that path sends two real emails
 * per inquiry, and seeding twelve rows through it would put twelve pairs of
 * messages in a live inbox.
 *
 *   node utils/seedDev.js          add the sample rows
 *   node utils/seedDev.js --reset  delete every inquiry first
 *
 * Refuses to run against NODE_ENV=production.
 */
import mongoose from "mongoose";
import env from "../config/env.js";
import { connectDb, disconnectDb } from "../config/db.js";
import Inquiry from "../models/Inquiry.js";

const SAMPLES = [
  ["Sarah Miller", "sarah.miller@northwindlogistics.com", "AI Automation",
    "We run a logistics desk and re-key the same shipment data into three systems every morning. Two people, roughly three hours a day between them. I want to know what it takes to make that path automatic end to end.", "new", 0.2],
  ["John Smith", "j.smith@bureauhaus.co", "Website Development",
    "Our site was built in 2019 and every content change goes through a developer. Looking for something we can actually run ourselves without it turning into a rebuild every two years.", "contacted", 1.4],
  ["Amara Okafor", "amara@fieldnotes.studio", "Digital Growth",
    "We have a good product and almost no inbound. Not looking for a growth-hacking package — looking for someone who can tell me honestly whether our positioning is the problem before we spend on ads.", "in-progress", 2.1],
  ["Daniel Reyes", "d.reyes@meridianclinic.health", "Website Development",
    "Clinic site, needs to handle appointment intake and be genuinely accessible. We have had two agencies tell us accessibility is a phase two thing and I would rather work with people who do not say that.", "new", 3.5],
  ["Priya Nair", "priya.nair@stackforge.io", "AI Automation",
    "Support team answers the same forty questions constantly. Interested in something that drafts replies from our own docs rather than a generic bot that makes things up.", "closed", 6.2],
  ["Tomas Lindqvist", "tomas@nordkraft.se", "Global Positioning",
    "We are expanding from Sweden into three more markets next year and our current site does not handle language or region at all. Want to get the structure right before the content multiplies.", "new", 8.8],
  ["Rachel Kim", "rachel@bright-ledger.com", "Digital Growth",
    "Fintech, series A, our conversion from trial to paid is well below where it should be. I think it is an onboarding problem rather than a marketing one but I want a second opinion from people who build the thing.", "contacted", 12.5],
  ["Marcus Bell", "marcus.bell@atlasfoundry.co.uk", "Something Else",
    "Honestly not sure what I need yet. We have a manufacturing business, a lot of process that lives in spreadsheets and one person's head, and a feeling that it should be better. Happy to be told what the real problem is.", "new", 26.0],
  ["Yuki Tanaka", "y.tanaka@kaido-design.jp", "Collaborate",
    "Design studio in Osaka. We take on projects that need engineering we do not have in house and are looking for a partner rather than a vendor. Would like to talk about how that might work.", "in-progress", 38.0],
  ["Elena Novak", "elena@vireo-labs.eu", "AI Automation",
    "Research group, drowning in unstructured PDFs. Want a system that extracts and indexes them so people can actually ask questions of the archive instead of grepping it.", "closed", 52.0],
  ["Chris Alvarez", "chris@harborlight.media", "Website Development",
    "Media company, twelve thousand articles, current CMS falls over on anything more complex than a text post. Need a migration plan that does not lose fifteen years of URLs.", "new", 70.0],
  ["Fatima Haddad", "fatima@souq-collective.ae", "Global Positioning",
    "Marketplace operating across the Gulf. Site is English-first and it shows. Looking for a genuine bilingual build with RTL done properly, not bolted on.", "contacted", 95.0],
];

async function run() {
  if (env.isProd) {
    console.error("[seed] refusing to run with NODE_ENV=production.");
    process.exit(1);
  }

  await connectDb();

  if (process.argv.includes("--reset")) {
    const { deletedCount } = await Inquiry.deleteMany({});
    console.log(`[seed] cleared ${deletedCount} inquiries.`);
  }

  const now = Date.now();
  const docs = SAMPLES.map(([name, email, purpose, message, status, hoursAgo]) => {
    const at = new Date(now - hoursAgo * 60 * 60 * 1000);
    return {
      name,
      email,
      purpose,
      message,
      status,
      createdAt: at,
      updatedAt: at,
      // These rows never went through the mailer.
      mail: { customer: "skipped", internal: "skipped" },
    };
  });

  // insertMany with timestamps off, so the backdated createdAt values survive.
  const inserted = await Inquiry.insertMany(docs, { timestamps: false });
  console.log(`[seed] inserted ${inserted.length} inquiries.`);

  const total = await Inquiry.countDocuments({});
  console.log(`[seed] collection now holds ${total}.`);

  await disconnectDb();
  await mongoose.disconnect().catch(() => {});
}

run().catch((error) => {
  console.error("[seed] failed:", error.message);
  process.exit(1);
});
