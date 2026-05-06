import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  getTodayItem,
  completeTodayItem,
  getContinueItems,
  getXPHistory,
  getStreakCalendar,
} from "./service.js";

const router = Router();

router.use(requireAuth);

router.get("/today", async (req, res, next) => {
  try {
    const item = await getTodayItem(req.user!.id);
    success(res, { item });
  } catch (err) {
    next(err);
  }
});

router.post("/today/complete", async (req, res, next) => {
  try {
    const itemId = Number(req.body?.itemId);
    if (!Number.isFinite(itemId) || itemId <= 0) {
      sendError(res, "itemId inválido", "INVALID_ITEM_ID", 400);
      return;
    }
    const result = await completeTodayItem(req.user!.id, itemId);
    if ("error" in result) {
      if (result.error === "ITEM_NOT_FOUND") {
        sendError(res, "Conteúdo não encontrado", "ITEM_NOT_FOUND", 404);
        return;
      }
      if (result.error === "INVALID_TODAY_ITEM") {
        sendError(
          res,
          "Este não é o item de hoje. Atualize a tela.",
          "INVALID_TODAY_ITEM",
          409,
        );
        return;
      }
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

// Task #44 — "Continue de onde parou" unificado.
router.get("/continue", async (req, res, next) => {
  try {
    const items = await getContinueItems(req.user!.id);
    success(res, { items });
  } catch (err) {
    next(err);
  }
});

// Task #44 — Histórico de XP (modal que abre ao tocar no card XP semanal).
router.get("/xp-history", async (req, res, next) => {
  try {
    const weeks = Math.max(1, Math.min(12, Number(req.query.weeks) || 6));
    const data = await getXPHistory(req.user!.id, weeks);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

// Task #44 — Calendário de hábitos (modal que abre ao tocar em Sequência).
router.get("/streak-calendar", async (req, res, next) => {
  try {
    const days = Math.max(7, Math.min(60, Number(req.query.days) || 30));
    const data = await getStreakCalendar(req.user!.id, days);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
