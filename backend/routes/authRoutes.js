import { Router } from "express";
import { login, logout, me } from "../controllers/authController.js";
import requireAuth from "../middleware/requireAuth.js";
import { loginLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.post("/auth/login", loginLimiter, login);

// The only endpoint the React app uses to decide whether it is signed in.
router.get("/auth/me", requireAuth, me);

// Not behind requireAuth on purpose — an expired session must still be able
// to clear its own stale cookie instead of being refused with a 401.
router.post("/auth/logout", logout);

export default router;
