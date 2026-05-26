// ============================================================================
// 📚 RAYO — Books: Reading Progress (Task #252)
// Endpoints per-user de progresso de leitura pra conteúdo kind='livro'.
// Mounted em /api/books pelo app.ts.
// ============================================================================

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { success, error as sendError } from "../../utils/response.js";
import { query } from "../../db/index.js";

const router = Router();

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function loadLivro(contentId: number): Promise<{ id: number; pages: number | null } | null> {
  const { rows } = await query<{ id: number; pages: number | null; kind: string }>(
    `SELECT id, pages, kind FROM content_items WHERE id = $1 LIMIT 1`,
    [contentId],
  );
  const row = rows[0];
  if (!row || row.kind !== "livro") return null;
  return { id: row.id, pages: row.pages };
}

// GET /api/books/:contentId/progress — devolve { currentPage, updatedAt } ou null.
router.get("/:contentId/progress", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentId = parseId(req.params.contentId);
    if (!contentId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }

    const livro = await loadLivro(contentId);
    if (!livro) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const { rows } = await query<{ current_page: number; updated_at: Date }>(
      `SELECT current_page, updated_at FROM book_progress
        WHERE user_id = $1 AND content_id = $2 LIMIT 1`,
      [req.user!.id, contentId],
    );
    const row = rows[0];
    success(res, {
      progress: row
        ? { currentPage: row.current_page, updatedAt: row.updated_at }
        : null,
    });
  } catch (err) { next(err); }
});

// PUT /api/books/:contentId/progress — upsert. Body: { currentPage:number }.
// `current_page` é clamped pra [1, livro.pages] quando o livro tem páginas.
router.put("/:contentId/progress", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentId = parseId(req.params.contentId);
    if (!contentId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }

    const raw = (req.body as { currentPage?: unknown })?.currentPage;
    const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n) || n < 1) {
      sendError(res, "currentPage inválido", "INVALID_PAGE", 400);
      return;
    }

    const livro = await loadLivro(contentId);
    if (!livro) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const max = livro.pages && livro.pages > 0 ? livro.pages : n;
    const currentPage = Math.max(1, Math.min(Math.floor(n), max));

    // Last-write-wins: "onde o usuário parou" — se ele voltou pra rever um
    // capítulo e fechou, a próxima abertura deve retomar lá, não no máximo
    // já alcançado. Ordering out-of-order é tratado no cliente (debounce
    // + cancelamento de timer pendente garante 1 PUT por pausa de leitura).
    const { rows } = await query<{ current_page: number; updated_at: Date }>(
      `INSERT INTO book_progress (user_id, content_id, current_page, updated_at)
            VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, content_id) DO UPDATE
          SET current_page = EXCLUDED.current_page,
              updated_at   = NOW()
       RETURNING current_page, updated_at`,
      [req.user!.id, contentId, currentPage],
    );
    const row = rows[0];
    success(res, {
      progress: { currentPage: row.current_page, updatedAt: row.updated_at },
    });
  } catch (err) { next(err); }
});

export default router;
