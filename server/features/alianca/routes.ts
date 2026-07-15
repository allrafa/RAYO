// Aliança (Modo Casal) — ALIANCA_PLAN.md §3.
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  getAliancaState,
  createInvite,
  revokeInvite,
  acceptInvite,
  prayForPartner,
  unpair,
  getCoupleDevotional,
  completeCoupleDevotional,
} from "./service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const state = await getAliancaState(req.user!.id);
    success(res, state);
  } catch (err) {
    next(err);
  }
});

router.post("/invite", async (req, res, next) => {
  try {
    const result = await createInvite(req.user!.id);
    if ("error" in result) {
      sendError(res, "Você já está em uma aliança", "ALREADY_PAIRED", 409);
      return;
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/invite/revoke", async (req, res, next) => {
  try {
    success(res, await revokeInvite(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post("/accept", async (req, res, next) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!code.trim()) {
      sendError(res, "Código inválido", "INVALID_CODE", 400);
      return;
    }
    const result = await acceptInvite(req.user!.id, code);
    if ("error" in result) {
      switch (result.error) {
        case "INVALID_CODE":
          sendError(res, "Convite não encontrado", "INVALID_CODE", 404);
          return;
        case "INVITE_EXPIRED":
          sendError(res, "Este convite expirou ou foi revogado", "INVITE_EXPIRED", 410);
          return;
        case "OWN_CODE":
          sendError(res, "Este é o seu próprio convite", "OWN_CODE", 400);
          return;
        case "ALREADY_PAIRED":
          sendError(res, "Um de vocês já está em uma aliança", "ALREADY_PAIRED", 409);
          return;
      }
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/pray", async (req, res, next) => {
  try {
    const result = await prayForPartner(req.user!.id);
    if ("error" in result) {
      sendError(res, "Você não está em uma aliança", "NOT_PAIRED", 409);
      return;
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.delete("/", async (req, res, next) => {
  try {
    success(res, await unpair(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// RITMO_PLAN.md F1 — Devocional do casal.
router.get("/devocional", async (req, res, next) => {
  try {
    success(res, await getCoupleDevotional(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post("/devocional/complete", async (req, res, next) => {
  try {
    const result = await completeCoupleDevotional(req.user!.id);
    if ("error" in result) {
      sendError(res, "Você não está em uma aliança", "NOT_PAIRED", 409);
      return;
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
