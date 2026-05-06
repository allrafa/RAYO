import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success } from "../../utils/response.js";
import { searchAll } from "./service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    const data = await searchAll(q);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
