import { Router } from "express";
import { query } from "../../db/index.js";
import { success, error as sendError } from "../../utils/response.js";

const VALID_SEGMENTS = new Set(["solteiro", "namoro", "noivos", "casados", "pais"]);

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const segment = typeof req.query.segment === "string" ? req.query.segment : undefined;
    if (segment && !VALID_SEGMENTS.has(segment)) {
      sendError(res, "Segmento inválido", "INVALID_SEGMENT", 400);
      return;
    }

    let sql = `SELECT id, slug, title, subtitle, description, segment, cover_url,
                      accent_color, item_count, sort_order
                 FROM marketplace_bundles
                WHERE is_active = true`;
    const params: unknown[] = [];
    if (segment) {
      sql += ` AND segment = $1`;
      params.push(segment);
    }
    sql += ` ORDER BY segment, sort_order, id`;

    const { rows } = await query(sql, params);
    success(res, { bundles: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
