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

    const { rows: bundleRows } = await query<{
      id: number; slug: string; title: string; subtitle: string | null;
      description: string | null; segment: string; cover_url: string | null;
      accent_color: string | null; item_count: number; sort_order: number;
    }>(sql, params);

    const bundleIds = bundleRows.map((b) => b.id);
    let itemsByBundle: Record<number, Array<{
      id: number; title: string; thumbnail: string | null;
      duration: string | null; level: string | null; instructor: string | null;
    }>> = {};
    if (bundleIds.length > 0) {
      const { rows: itemRows } = await query<{
        bundle_id: number; id: number; title: string; thumbnail: string | null;
        duration: string | null; level: string | null; instructor: string | null;
      }>(
        `SELECT mbi.bundle_id, c.id, c.title, c.thumbnail, c.duration, c.level, c.instructor
           FROM marketplace_bundle_items mbi
           JOIN courses c ON c.id = mbi.course_id AND c.is_active = true
          WHERE mbi.bundle_id = ANY($1::int[])
          ORDER BY mbi.bundle_id, mbi.sort_order, c.id`,
        [bundleIds]
      );
      itemsByBundle = itemRows.reduce((acc, r) => {
        const { bundle_id, ...course } = r;
        (acc[bundle_id] ||= []).push(course);
        return acc;
      }, {} as typeof itemsByBundle);
    }

    const bundles = bundleRows.map((b) => ({
      ...b,
      items: itemsByBundle[b.id] || [],
    }));
    success(res, { bundles });
  } catch (err) {
    next(err);
  }
});

export default router;
