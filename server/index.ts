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

app.all("/api/{*path}", (req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found`, "NOT_FOUND", 404);
});

async function start() {
  try {
    logger.info("Server", "Initializing database schema...");
    await initializeSchema();
    logger.info("Server", "Database schema ready.");

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
      app.get("*", (_req, res) => {
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
