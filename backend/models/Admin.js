import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      // Deliberately NOT an email-format check: the bootstrap identity is
      // `admin@technospirit`, which has no TLD and is a username, not a mailbox.
      minlength: [3, "Admin email is too short."],
      maxlength: [254, "Admin email is too long."],
    },

    /**
     * The bcrypt hash. `select: false` means every ordinary query — including
     * the one behind `GET /api/auth/me` — comes back without it, so it cannot
     * be leaked by a controller that forgets to strip it. The login path asks
     * for it explicitly with `.select("+passwordHash")`.
     */
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    name: { type: String, trim: true, default: "Admin" },

    lastLoginAt: { type: Date, default: null },

    /**
     * Set when the account was created from ADMIN_INITIAL_PASSWORD. It is a
     * marker for "this password came from an env var and should be rotated",
     * not a permission — nothing reads it to decide access.
     */
    mustChangePassword: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

/** Hash on the way in, so no call site can persist a plaintext password. */
adminSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

adminSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model("Admin", adminSchema);
