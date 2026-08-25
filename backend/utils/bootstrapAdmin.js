import Admin from "../models/Admin.js";
import env from "../config/env.js";

/**
 * Creates the initial admin on first boot, from ADMIN_EMAIL /
 * ADMIN_INITIAL_PASSWORD.
 *
 * Runs on every start and is idempotent: if an admin with that email already
 * exists it is left completely alone. That matters — it means changing
 * ADMIN_INITIAL_PASSWORD in `.env` does NOT silently reset a password that
 * someone has since rotated, and it means an attacker who can write `.env`
 * still cannot use this path to take over an existing account.
 *
 * To genuinely reset: delete the admin document, then restart.
 *   mongosh technospirit --eval 'db.admins.deleteMany({})'
 */
export default async function bootstrapAdmin() {
  const { adminEmail, adminInitialPassword } = env;

  if (!adminEmail || !adminInitialPassword) {
    console.warn("[auth] no ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD — skipping admin bootstrap.");
    return null;
  }

  const existing = await Admin.findOne({ email: adminEmail });
  if (existing) {
    console.log(`[auth] admin present → ${existing.email}`);
    return existing;
  }

  const passwordHash = await Admin.hashPassword(adminInitialPassword);
  const admin = await Admin.create({
    email: adminEmail,
    passwordHash,
    name: "TechnoSpirit Admin",
    mustChangePassword: true,
  });

  console.log(`[auth] bootstrapped admin → ${admin.email} (password came from env; rotate it)`);
  return admin;
}
