import { Router } from "express";
import type { Response, NextFunction } from "express";
import { requireRole, optionalAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  listAdminHomeFeed,
  listPublicHomeFeed,
  createHomeFeedItem,
  updateHomeFeedItem,
  deleteHomeFeedItem,
  reorderHomeFeed,
  HomeFeedError,
  VALID_SECTIONS,
} from "./service.js";

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof HomeFeedError) {
    sendError(res, err.message, err.code, err.statusCode);
    return;
  }
  next(err);
}

function parseId(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Public router (mounted at /api/home-feed) ───────────────────────
export const publicHomeFeedRouter = Router();
publicHomeFeedRouter.use(optionalAuth);

publicHomeFeedRouter.get("/", async (_req, res, next) => {
  try {
    const result = await listPublicHomeFeed();
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

// ── Admin router (mounted at /api/admin/home-feed) ──────────────────
export const adminHomeFeedRouter = Router();
adminHomeFeedRouter.use(requireRole("producer"));

adminHomeFeedRouter.get("/sections", (_req, res) => {
  success(res, { sections: VALID_SECTIONS });
});

adminHomeFeedRouter.get("/", async (req, res, next) => {
  try {
    const section = typeof req.query.section === "string" ? req.query.section : undefined;
    const result = await listAdminHomeFeed({ section });
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminHomeFeedRouter.post("/", async (req, res, next) => {
  try {
    const item = await createHomeFeedItem(req.user!, req.body);
    success(res, { item }, 201);
  } catch (err) { handle(err, res, next); }
});

adminHomeFeedRouter.post("/reorder", async (req, res, next) => {
  try {
    const { section, ordered_ids } = req.body ?? {};
    const result = await reorderHomeFeed(req.user!, section, ordered_ids ?? []);
    success(res, result);
  } catch (err) { handle(err, res, next); }
});

adminHomeFeedRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const item = await updateHomeFeedItem(req.user!, id, req.body);
    success(res, { item });
  } catch (err) { handle(err, res, next); }
});

adminHomeFeedRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const result = await deleteHomeFeedItem(req.user!, id);
    success(res, result);
  } catch (err) { handle(err, res, next); }
});
