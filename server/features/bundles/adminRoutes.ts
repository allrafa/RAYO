import { Router } from "express";
import { query, getClient } from "../../db/index.js";
import { requireRole } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";

// Task #264 — Admin CRUD das trilhas curadas (marketplace_bundles) e dos seus
// marcos. Diferente das "Trilhas pagas" (Stripe / tabela `trails`), estas são
// os bundles exibidos na Academia. Uma trilha pode conter cursos E conteúdos
// não-curso (livros/áudios/vídeos/séries).

const VALID_SEGMENTS = new Set(["solteiro", "namoro", "noivos", "casados", "pais"]);

const router = Router();

// Gate global: só admin gerencia trilhas curadas.
router.use(requireRole("admin"));

interface BundleBody {
  slug?: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  segment?: string;
  cover_url?: string | null;
  accent_color?: string | null;
  sort_order?: number;
  is_active?: boolean;
  course_ids?: number[];
  content_item_ids?: number[];
}

function validateBundleBody(body: BundleBody): string | null {
  if (!body.slug || !body.slug.trim()) return "Slug é obrigatório";
  if (!body.title || !body.title.trim()) return "Título é obrigatório";
  if (!body.segment || !VALID_SEGMENTS.has(body.segment)) return "Segmento inválido";
  return null;
}

// Substitui todos os marcos de uma trilha. Cursos primeiro, depois conteúdos,
// com sort_order sequencial global. Dedupe defensivo de ids.
async function replaceItems(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  bundleId: number,
  courseIds: number[],
  contentItemIds: number[],
): Promise<number> {
  await client.query(`DELETE FROM marketplace_bundle_items WHERE bundle_id = $1`, [bundleId]);
  let order = 0;
  const uniqCourses = [...new Set(courseIds.filter((n) => Number.isInteger(n) && n > 0))];
  const uniqContent = [...new Set(contentItemIds.filter((n) => Number.isInteger(n) && n > 0))];
  for (const cid of uniqCourses) {
    await client.query(
      `INSERT INTO marketplace_bundle_items (bundle_id, course_id, sort_order) VALUES ($1, $2, $3)`,
      [bundleId, cid, order++],
    );
  }
  for (const ciId of uniqContent) {
    await client.query(
      `INSERT INTO marketplace_bundle_items (bundle_id, content_item_id, sort_order) VALUES ($1, $2, $3)`,
      [bundleId, ciId, order++],
    );
  }
  return order;
}

// GET / — lista todas as trilhas (ativas e inativas) com seus marcos resolvidos.
router.get("/", async (_req, res, next) => {
  try {
    const { rows: bundleRows } = await query<{
      id: number; slug: string; title: string; subtitle: string | null;
      description: string | null; segment: string; cover_url: string | null;
      accent_color: string | null; item_count: number; sort_order: number;
      is_active: boolean;
    }>(
      `SELECT id, slug, title, subtitle, description, segment, cover_url,
              accent_color, item_count, sort_order, is_active
         FROM marketplace_bundles
        ORDER BY segment, sort_order, id`,
    );

    const bundleIds = bundleRows.map((b) => b.id);
    let itemsByBundle: Record<number, Array<{
      ref_id: number; ref_type: "course" | "content"; kind: string; title: string;
    }>> = {};
    if (bundleIds.length > 0) {
      const { rows: itemRows } = await query<{
        bundle_id: number; ref_id: number; ref_type: "course" | "content";
        kind: string; title: string;
      }>(
        `SELECT mbi.bundle_id,
                COALESCE(mbi.course_id, mbi.content_item_id) AS ref_id,
                CASE WHEN mbi.course_id IS NOT NULL THEN 'course' ELSE 'content' END AS ref_type,
                CASE WHEN mbi.course_id IS NOT NULL THEN 'curso' ELSE ci.kind END AS kind,
                COALESCE(c.title, ci.title) AS title
           FROM marketplace_bundle_items mbi
           LEFT JOIN courses c ON c.id = mbi.course_id
           LEFT JOIN content_items ci ON ci.id = mbi.content_item_id
          WHERE mbi.bundle_id = ANY($1::int[])
          ORDER BY mbi.bundle_id, mbi.sort_order, mbi.id`,
        [bundleIds],
      );
      itemsByBundle = itemRows.reduce((acc, r) => {
        const { bundle_id, ...item } = r;
        (acc[bundle_id] ||= []).push(item);
        return acc;
      }, {} as typeof itemsByBundle);
    }

    const bundles = bundleRows.map((b) => {
      const items = itemsByBundle[b.id] || [];
      return {
        ...b,
        items,
        course_ids: items.filter((i) => i.ref_type === "course").map((i) => i.ref_id),
        content_item_ids: items.filter((i) => i.ref_type === "content").map((i) => i.ref_id),
      };
    });
    success(res, { bundles });
  } catch (err) {
    next(err);
  }
});

// POST / — cria trilha + marcos.
router.post("/", async (req, res, next) => {
  const client = await getClient();
  try {
    const body = req.body as BundleBody;
    const invalid = validateBundleBody(body);
    if (invalid) {
      sendError(res, invalid, "INVALID_BUNDLE", 400);
      return;
    }
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO marketplace_bundles
         (slug, title, subtitle, description, segment, cover_url, accent_color, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        body.slug!.trim(),
        body.title!.trim(),
        body.subtitle || null,
        body.description || null,
        body.segment,
        body.cover_url || null,
        body.accent_color || null,
        Number(body.sort_order) || 0,
        body.is_active ?? true,
      ],
    );
    const bundleId = (rows[0] as { id: number }).id;
    const count = await replaceItems(
      client,
      bundleId,
      body.course_ids || [],
      body.content_item_ids || [],
    );
    await client.query(`UPDATE marketplace_bundles SET item_count = $1, updated_at = NOW() WHERE id = $2`, [
      count,
      bundleId,
    ]);
    await client.query("COMMIT");
    success(res, { id: bundleId }, 201);
  } catch (err: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    if ((err as { code?: string }).code === "23505") {
      sendError(res, "Já existe uma trilha com esse slug", "DUPLICATE_SLUG", 409);
      return;
    }
    next(err);
  } finally {
    client.release();
  }
});

// PUT /:id — atualiza trilha + substitui marcos.
router.put("/:id", async (req, res, next) => {
  const client = await getClient();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      sendError(res, "ID inválido", "INVALID_ID", 400);
      return;
    }
    const body = req.body as BundleBody;
    const invalid = validateBundleBody(body);
    if (invalid) {
      sendError(res, invalid, "INVALID_BUNDLE", 400);
      return;
    }
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `UPDATE marketplace_bundles
          SET slug = $1, title = $2, subtitle = $3, description = $4, segment = $5,
              cover_url = $6, accent_color = $7, sort_order = $8, is_active = $9, updated_at = NOW()
        WHERE id = $10`,
      [
        body.slug!.trim(),
        body.title!.trim(),
        body.subtitle || null,
        body.description || null,
        body.segment,
        body.cover_url || null,
        body.accent_color || null,
        Number(body.sort_order) || 0,
        body.is_active ?? true,
        id,
      ],
    );
    if (rowCount === 0) {
      await client.query("ROLLBACK");
      sendError(res, "Trilha não encontrada", "BUNDLE_NOT_FOUND", 404);
      return;
    }
    const count = await replaceItems(
      client,
      id,
      body.course_ids || [],
      body.content_item_ids || [],
    );
    await client.query(`UPDATE marketplace_bundles SET item_count = $1 WHERE id = $2`, [count, id]);
    await client.query("COMMIT");
    success(res, { id });
  } catch (err: unknown) {
    await client.query("ROLLBACK").catch(() => {});
    if ((err as { code?: string }).code === "23505") {
      sendError(res, "Já existe uma trilha com esse slug", "DUPLICATE_SLUG", 409);
      return;
    }
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /:id — soft delete (is_active = false), alinhado com a política de
// soft deletes do projeto.
router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      sendError(res, "ID inválido", "INVALID_ID", 400);
      return;
    }
    const { rowCount } = await query(
      `UPDATE marketplace_bundles SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id],
    );
    if (rowCount === 0) {
      sendError(res, "Trilha não encontrada", "BUNDLE_NOT_FOUND", 404);
      return;
    }
    success(res, { id });
  } catch (err) {
    next(err);
  }
});

export default router;
