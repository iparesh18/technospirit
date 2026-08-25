import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env.js";
import routes from "./routes/index.js";
import AppError from "./utils/AppError.js";
import errorHandler, { notFound } from "./middleware/errorHandler.js";

/**
 * TechnoSpirit API — application wiring.
 */
export default function createApp() {
  const app = express();

  /**
   * The rate limiters key on `req.ip`. Behind a proxy every request would
   * otherwise carry the proxy's address and share one bucket, so one visitor
   * could exhaust the contact limit for everyone. `1` trusts exactly one hop.
   */
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  /**
   * Helmet's defaults, minus the CSP.
   *
   * This process serves JSON, not HTML — the React app is served by Vite in
   * development and by static hosting in production, and each of those owns
   * its own CSP. A CSP on an API response protects nothing and would be a
   * second, contradictory policy to keep in step.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  /**
   * CORS with an explicit allowlist and `credentials: true`.
   *
   * `credentials: true` forbids a wildcard origin by specification, which is
   * exactly the property wanted: the auth cookie can only ever be sent from an
   * origin named in CLIENT_ORIGIN. Same-origin and tool requests (curl, health
   * probes) arrive with no Origin header and are allowed through — they carry
   * no browser cookie jar, so they are not the CSRF surface CORS guards.
   */
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
        /**
         * An AppError, not a bare Error. A bare one falls through to the
         * "unexpected" branch of the error handler and becomes an opaque 500
         * reading "Something went wrong on our end." — which is exactly the
         * wrong thing to tell an operator whose real problem is a missing
         * entry in CLIENT_ORIGIN. This says what happened.
         */
        callback(
          AppError.forbidden(`Origin ${origin} is not allowed by CORS.`, {
            code: "CORS_ORIGIN_DENIED",
          }),
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
    }),
  );

  // A contact message is capped at 5000 characters by the schema; 32kb is
  // generous for that and small enough that a large body is rejected early.
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
