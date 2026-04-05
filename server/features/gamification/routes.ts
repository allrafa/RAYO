import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import {
  getGamificationProfile,
  getUserBadges,
  getUserMissions,
  updateStreak,
  claimMissionReward,
} from "./service.js";

const router = Router();

router.use(requireAuth);

router.get("/profile", async (req, res, next) => {
  try {
    const profile = await getGamificationProfile(req.user!.id);
    success(res, { profile });
  } catch (err) {
    next(err);
  }
});

router.get("/badges", async (req, res, next) => {
  try {
    const badges = await getUserBadges(req.user!.id);
    success(res, { badges });
  } catch (err) {
    next(err);
  }
});

router.get("/missions", async (req, res, next) => {
  try {
    const missions = await getUserMissions(req.user!.id);
    success(res, { missions });
  } catch (err) {
    next(err);
  }
});

router.post("/streak", async (req, res, next) => {
  try {
    const result = await updateStreak(req.user!.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
});

router.post("/missions/:missionId/claim", async (req, res, next) => {
  try {
    const missionId = parseInt(req.params.missionId, 10);
    if (isNaN(missionId)) {
      sendError(res, "ID de missão inválido", "INVALID_MISSION_ID");
      return;
    }
    const result = await claimMissionReward(req.user!.id, missionId);
    if (!result.success) {
      sendError(res, "Recompensa não disponível", "REWARD_NOT_AVAILABLE");
      return;
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
