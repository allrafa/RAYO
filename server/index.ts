import express from "express";
import cookieParser from "cookie-parser";
import { securityMiddleware, corsMiddleware, rateLimiter } from "./middleware/security.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeSchema } from "./db/schema.js";
import { logger } from "./utils/logger.js";
import { error as sendError } from "./utils/response.js";
import healthRoutes from "./features/health/routes.js";
import authRoutes from "./features/auth/routes.js";
import userRoutes from "./features/users/routes.js";
import gamificationRoutes from "./features/gamification/routes.js";
import academiaRoutes from "./features/academia/routes.js";
import communityRoutes from "./features/community/routes.js";
import dashboardRoutes from "./features/dashboard/routes.js";
import homeRoutes from "./features/home/routes.js";
import searchRoutes from "./features/search/routes.js";
import lgpdRoutes from "./features/lgpd/routes.js";
import messagesRoutes from "./features/messages/routes.js";
import adminRoutes from "./features/admin/routes.js";
import { bootstrapAdminsFromEnv } from "./features/admin/bootstrap.js";
import { adminCmsRouter, publicCmsRouter } from "./features/cms/routes.js";
import { adminHomeFeedRouter, publicHomeFeedRouter } from "./features/home-feed/routes.js";
import bundlesRoutes from "./features/bundles/routes.js";
import { UPLOAD_ROOT } from "./features/cms/upload.js";
import {
  signLegacyUploadUrlIfPresent,
  streamLocalUpload,
  backfillLocalUploads,
} from "./lib/objectStorageBridge.js";
import { optionalAuth } from "./middleware/auth.js";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const isDev = process.env.NODE_ENV !== "production";

if (!process.env.DATABASE_URL) {
  logger.error("Server", "DATABASE_URL environment variable is required.");
  process.exit(1);
}

app.use(securityMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", corsMiddleware);
app.use("/api/health", healthRoutes);
app.use("/api/auth", rateLimiter(20, 15 * 60 * 1000), authRoutes);
app.use("/api/users", rateLimiter(30, 15 * 60 * 1000), userRoutes);
app.use("/api/gamification", rateLimiter(60, 15 * 60 * 1000), gamificationRoutes);
app.use("/api/courses", rateLimiter(60, 15 * 60 * 1000), academiaRoutes);
app.use("/api/community", rateLimiter(60, 15 * 60 * 1000), optionalAuth, communityRoutes);
app.use("/api/dashboard", rateLimiter(60, 15 * 60 * 1000), dashboardRoutes);
app.use("/api/home", rateLimiter(120, 15 * 60 * 1000), homeRoutes);
app.use("/api/search", rateLimiter(120, 15 * 60 * 1000), searchRoutes);
app.use("/api/users", rateLimiter(10, 15 * 60 * 1000), lgpdRoutes);
// Higher cap because the DM UI polls (messages every 10s, conversations every 30s,
// unread-count every 20s); each authenticated user must comfortably fit a 15-min
// active session without hitting 429.
app.use("/api/messages", rateLimiter(600, 15 * 60 * 1000), messagesRoutes);
app.use("/api/admin", rateLimiter(120, 15 * 60 * 1000), adminRoutes);
app.use("/api/admin/cms", rateLimiter(300, 15 * 60 * 1000), adminCmsRouter);
app.use("/api/content", rateLimiter(120, 15 * 60 * 1000), publicCmsRouter);
app.use("/api/admin/home-feed", rateLimiter(300, 15 * 60 * 1000), adminHomeFeedRouter);
app.use("/api/home-feed", rateLimiter(120, 15 * 60 * 1000), publicHomeFeedRouter);
app.use("/api/bundles", rateLimiter(120, 15 * 60 * 1000), bundlesRoutes);

// Task #48 — `/uploads/*` is now backed by Replit Object Storage. The
// URL contract is unchanged so `users.avatar_url` /
// `media_assets.public_url` rows keep resolving. Falls back to the old
// on-disk uploads/ tree for any file the boot-time backfill hasn't
// migrated yet (e.g. running locally with a fresh bucket).
app.get("/uploads/*splat", async (req, res, next) => {
  try {
    const key = decodeURIComponent(
      req.path.replace(/^\/uploads\//, ""),
    );
    if (!key || key.includes("..")) {
      res.status(404).end();
      return;
    }
    // Task #48 — prefer external signed URL: redirects clients to the
    // bucket directly so static assets are served via the storage CDN
    // rather than proxied through the app server.
    const signed = await signLegacyUploadUrlIfPresent(key);
    if (signed) {
      res.redirect(302, signed);
      return;
    }
    if (streamLocalUpload(key, UPLOAD_ROOT, res)) return;
    res.status(404).end();
  } catch (err) {
    next(err);
  }
});

app.all("/api/{*path}", (req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found`, "NOT_FOUND", 404);
});

async function start() {
  try {
    logger.info("Server", "Initializing database schema...");
    await initializeSchema();
    logger.info("Server", "Database schema ready.");

    await bootstrapAdminsFromEnv();

    // Task #48 — fire-and-forget backfill of any pre-existing on-disk
    // uploads to object storage. Idempotent (skips files already
    // present), so safe to run on every boot. Non-blocking so a slow or
    // huge media tree doesn't delay the listen() call.
    void backfillLocalUploads(UPLOAD_ROOT);

    if (isDev) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      logger.info("Server", "Vite dev middleware attached.");
    } else {
      const buildPath = path.resolve(__dirname, "..", "build");
      app.use(express.static(buildPath));
      // SPA fallback: in Express 5 the legacy `app.get("*")` throws at
      // startup ("Missing parameter name") because path-to-regexp v8 no
      // longer accepts bare "*" as a wildcard. A trailing middleware is
      // the version-agnostic equivalent and only fires for unmatched
      // non-/api requests.
      app.use((_req, res) => {
        res.sendFile(path.join(buildPath, "index.html"));
      });
      logger.info("Server", "Serving static build.");
    }

    app.use(errorHandler);

    app.listen(PORT, "0.0.0.0", () => {
      logger.info("Server", `RAIO server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Server", "Failed to start server:", err);
    process.exit(1);
  }
}

start();
