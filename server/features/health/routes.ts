import { Router } from "express";
import { testConnection } from "../../db/index.js";
import { success, error } from "../../utils/response.js";
import { runtimeStatus } from "../../lib/runtimeStatus.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const dbConnected = await testConnection();
    const uptime = process.uptime();

    if (!dbConnected) {
      error(res, "Database is not available", "DB_UNAVAILABLE", 503);
      return;
    }

    success(res, {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      database: "connected",
      environment: process.env.NODE_ENV || "development",
      email: runtimeStatus.emailConfigured ? "configured" : "not_configured",
      billing: runtimeStatus.billingInitialized
        ? "initialized"
        : runtimeStatus.billingError
          ? "error"
          : "not_initialized",
    });
  } catch (err) {
    error(res, "Health check failed", "HEALTH_CHECK_ERROR", 503);
  }
});

export default router;
