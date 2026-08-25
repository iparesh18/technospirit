import { Router } from "express";
import contactRoutes from "./contactRoutes.js";
import authRoutes from "./authRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = Router();

router.use(contactRoutes); // POST /contact, GET /health
router.use(authRoutes); //    POST /auth/login, GET /auth/me, POST /auth/logout
router.use(adminRoutes); //   GET /admin/*  (all behind requireAuth)

export default router;
