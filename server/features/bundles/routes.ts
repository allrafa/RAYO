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
      id: number; kind: string; title: string; thumbnail: string | null;
      duration: string | null; level: string | null; instructor: string | null;
    }>> = {};
    if (bundleIds.length > 0) {
      // Task #264 — uma trilha agora agrega cursos E conteúdos não-curso
      // (livro/áudio/vídeo/série/reels). Resolvemos cada linha pelo lado que
      // está preenchido (course_id XOR content_item_id) e devolvemos um `kind`
      // por marco pra que o frontend roteie pro destino certo (curso → detalhe
      // de curso, livro → leitor, vídeo/áudio → player). Linhas cujo conteúdo
      // foi despublicado/arquivado/inativado caem fora do resultado.
      const { rows: itemRows } = await query<{
        bundle_id: number; id: number; kind: string; title: string;
        thumbnail: string | null; duration: string | null;
        level: string | null; instructor: string | null;
      }>(
        `SELECT mbi.bundle_id,
                COALESCE(c.id, ci.id)                       AS id,
                CASE WHEN c.id IS NOT NULL THEN 'curso' ELSE ci.kind END AS kind,
                COALESCE(c.title, ci.title)                 AS title,
                COALESCE(c.thumbnail, ci.cover_url)         AS thumbnail,
                c.duration                                  AS duration,
                c.level                                     AS level,
                COALESCE(c.instructor, ci.author)           AS instructor
           FROM marketplace_bundle_items mbi
           LEFT JOIN courses c
                  ON c.id = mbi.course_id AND c.is_active = true
           LEFT JOIN content_items ci
                  ON ci.id = mbi.content_item_id AND ci.status = 'published'
          WHERE mbi.bundle_id = ANY($1::int[])
            AND (c.id IS NOT NULL OR ci.id IS NOT NULL)
          ORDER BY mbi.bundle_id, mbi.sort_order, mbi.id`,
        [bundleIds]
      );
      itemsByBundle = itemRows.reduce((acc, r) => {
        const { bundle_id, ...item } = r;
        (acc[bundle_id] ||= []).push(item);
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
