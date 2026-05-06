import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import { getTodayItem, completeTodayItem } from "./service.js";

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
        // Frontend should refetch /api/home/today and retry — this
        // typically happens when the user crosses midnight with the tab
        // open and the deterministic pick has rotated.
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

export default router;
