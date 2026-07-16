// Momento RAYO (DIFERENCIAL_PLAN.md D3).
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import { getMomentoState, attendMomento } from "./service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    success(res, await getMomentoState(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post("/attend", async (req, res, next) => {
  try {
    const result = await attendMomento(req.user!.id);
    if ("error" in result) {
      sendError(res, "O Momento ainda não está aberto — hoje às 21h 🕯️", "CLOSED", 409);
      return;
    }
    success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
