import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error } from "../../utils/response.js";
import { exportUserData, deleteUserData } from "./service.js";
import { trackEvent } from "../analytics/service.js";
import type { Request, Response } from "express";

const router = Router();

router.post("/data-export", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = await exportUserData(userId);

    await trackEvent(userId, "lgpd_data_export", {});

    success(res, {
      message: "Seus dados foram exportados com sucesso.",
      export: data,
    });
  } catch (err) {
    console.error("[LGPD] Export error:", err);
    error(res, "Erro ao exportar dados", "EXPORT_FAILED", 500);
  }
});

router.post("/data-deletion", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await trackEvent(userId, "lgpd_data_deletion_requested", {});
    await deleteUserData(userId);

    res.clearCookie("session_token");

    success(res, {
      message: "Sua conta e dados pessoais foram removidos conforme a LGPD.",
    });
  } catch (err) {
    console.error("[LGPD] Deletion error:", err);
    error(res, "Erro ao deletar dados", "DELETION_FAILED", 500);
  }
});

export default router;
