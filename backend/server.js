import createApp from "./app.js";
import env, { assertEnv } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";
import bootstrapAdmin from "./utils/bootstrapAdmin.js";
import { verifyTransport } from "./services/mailer.js";

/**
 * Boot order matters: environment, then database, then the admin bootstrap
 * (which needs the database), and only then does the port open. Nothing can
 * reach a route before its dependencies exist.
 */
async function start() {
  assertEnv();

  await connectDb();
  await bootstrapAdmin();

  // Reported at boot so "email is not configured" is visible in the log rather
  // than discovered later as a silently skipped send. Never fatal.
  const mail = await verifyTransport();
  if (!mail.configured) {
    console.warn("[mail] not configured — inquiries will save without sending email.");
  } else if (!mail.ok) {
    console.warn(`[mail] credentials present but SMTP verify failed: ${mail.reason}`);
  } else {
    console.log(`[mail] SMTP verified → ${env.mail.user} (receiver: ${env.mail.receiver})`);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] listening on http://127.0.0.1:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} — shutting down.`);
    server.close(async () => {
      await disconnectDb().catch(() => {});
      process.exit(0);
    });
    // Do not let a hung connection hold the process open forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[api] failed to start:", error.message);
  process.exit(1);
});
