import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  BillingError,
  adminListTrails,
  adminGetTrail,
  adminUpsertTrail,
  adminDeleteTrail,
  adminListSubscribers,
} from "./service.js";

export const adminTrailsRouter = Router();

adminTrailsRouter.use(requireRole("admin"));

adminTrailsRouter.get("/", async (_req, res, next) => {
  try {
    const trails = await adminListTrails();
    success(res, { trails });
  } catch (err) {
    next(err);
  }
});

adminTrailsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, "ID inválido", "INVALID_ID", 400);
    const trail = await adminGetTrail(id);
    if (!trail) return sendError(res, "Trilha não encontrada", "TRAIL_NOT_FOUND", 404);
    success(res, { trail });
  } catch (err) {
    next(err);
  }
});

adminTrailsRouter.post("/", async (req, res, next) => {
  try {
    const trail = await adminUpsertTrail(req.body || {});
    success(res, { trail }, 201);
  } catch (err) {
    if (err instanceof BillingError) {
      return sendError(res, err.message, err.code, err.statusCode);
    }
    next(err);
  }
});

adminTrailsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, "ID inválido", "INVALID_ID", 400);
    const trail = await adminUpsertTrail({ ...(req.body || {}), id });
    success(res, { trail });
  } catch (err) {
    if (err instanceof BillingError) {
      return sendError(res, err.message, err.code, err.statusCode);
    }
    next(err);
  }
});

adminTrailsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, "ID inválido", "INVALID_ID", 400);
    await adminDeleteTrail(id);
    success(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

adminTrailsRouter.get("/:id/subscribers", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, "ID inválido", "INVALID_ID", 400);
    const subscribers = await adminListSubscribers(id);
    success(res, { subscribers });
  } catch (err) {
    next(err);
  }
});
