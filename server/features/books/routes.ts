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

// ────────────────────────────────────────────────────────────────────────────
// Task #255 — Highlights & Notes
// ────────────────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = new Set(["yellow", "green", "blue", "pink"]);

function parseBigId(raw: string): string | null {
  if (!/^\d+$/.test(raw)) return null;
  // BIGSERIAL — string-safe pra evitar perda de precisão em IDs grandes.
  return raw;
}

interface RectIn { x: unknown; y: unknown; w: unknown; h: unknown }
function sanitizeRects(raw: unknown): { x: number; y: number; w: number; h: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (const r of raw as RectIn[]) {
    if (!r || typeof r !== "object") continue;
    const x = Number(r.x), y = Number(r.y), w = Number(r.w), h = Number(r.h);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) continue;
    // Clamp 0..1 — rects normalizados.
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const px = clamp01(x), py = clamp01(y);
    const pw = Math.max(0, Math.min(1 - px, w));
    const ph = Math.max(0, Math.min(1 - py, h));
    if (pw <= 0 || ph <= 0) continue;
    out.push({ x: px, y: py, w: pw, h: ph });
    if (out.length >= 200) break; // hard cap por highlight
  }
  return out;
}

interface HighlightRow {
  id: string; page: number; text: string; color: string; rects: unknown; created_at: Date;
}
interface NoteRow {
  id: string; page: number; selected_text: string; content: string; created_at: Date; updated_at: Date;
}

// GET /api/books/:contentId/annotations — devolve highlights + notes.
router.get("/:contentId/annotations", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    if (!contentId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const livro = await loadLivro(contentId);
    if (!livro) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const [hs, ns] = await Promise.all([
      query<HighlightRow>(
        `SELECT id::text, page, text, color, rects, created_at
           FROM book_highlights WHERE user_id = $1 AND content_id = $2
          ORDER BY page ASC, created_at ASC`,
        [req.user!.id, contentId],
      ),
      query<NoteRow>(
        `SELECT id::text, page, selected_text, content, created_at, updated_at
           FROM book_notes WHERE user_id = $1 AND content_id = $2
          ORDER BY page ASC, created_at ASC`,
        [req.user!.id, contentId],
      ),
    ]);

    success(res, {
      highlights: hs.rows.map((r) => ({
        id: r.id, page: r.page, text: r.text, color: r.color,
        rects: r.rects, createdAt: r.created_at,
      })),
      notes: ns.rows.map((r) => ({
        id: r.id, page: r.page, selectedText: r.selected_text,
        content: r.content, createdAt: r.created_at, updatedAt: r.updated_at,
      })),
    });
  } catch (err) { next(err); }
});

// POST /api/books/:contentId/highlights — cria. Body: {page,text,color,rects[]}.
router.post("/:contentId/highlights", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    if (!contentId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const livro = await loadLivro(contentId);
    if (!livro) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const body = (req.body ?? {}) as { page?: unknown; text?: unknown; color?: unknown; rects?: unknown };
    const pageNum = typeof body.page === "number" ? body.page : parseInt(String(body.page ?? ""), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) { sendError(res, "page inválido", "INVALID_PAGE", 400); return; }
    const max = livro.pages && livro.pages > 0 ? livro.pages : pageNum;
    const page = Math.max(1, Math.min(Math.floor(pageNum), max));

    const text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
    const color = typeof body.color === "string" && HIGHLIGHT_COLORS.has(body.color) ? body.color : "yellow";
    const rects = sanitizeRects(body.rects);
    if (rects.length === 0) { sendError(res, "rects vazios", "INVALID_RECTS", 400); return; }

    const { rows } = await query<HighlightRow>(
      `INSERT INTO book_highlights (user_id, content_id, page, text, color, rects)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id::text, page, text, color, rects, created_at`,
      [req.user!.id, contentId, page, text, color, JSON.stringify(rects)],
    );
    const r = rows[0];
    success(res, { highlight: { id: r.id, page: r.page, text: r.text, color: r.color, rects: r.rects, createdAt: r.created_at } }, 201);
  } catch (err) { next(err); }
});

// DELETE /api/books/:contentId/highlights/:id
router.delete("/:contentId/highlights/:id", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    const hlId = parseBigId(req.params.id);
    if (!contentId || !hlId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const { rowCount } = await query(
      `DELETE FROM book_highlights WHERE id = $1 AND user_id = $2 AND content_id = $3`,
      [hlId, req.user!.id, contentId],
    );
    if (!rowCount) { sendError(res, "Destaque não encontrado", "NOT_FOUND", 404); return; }
    success(res, { ok: true });
  } catch (err) { next(err); }
});

// POST /api/books/:contentId/notes — cria. Body: {page,selectedText?,content}.
router.post("/:contentId/notes", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    if (!contentId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const livro = await loadLivro(contentId);
    if (!livro) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const body = (req.body ?? {}) as { page?: unknown; selectedText?: unknown; content?: unknown };
    const pageNum = typeof body.page === "number" ? body.page : parseInt(String(body.page ?? ""), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) { sendError(res, "page inválido", "INVALID_PAGE", 400); return; }
    const max = livro.pages && livro.pages > 0 ? livro.pages : pageNum;
    const page = Math.max(1, Math.min(Math.floor(pageNum), max));

    const selectedText = typeof body.selectedText === "string" ? body.selectedText.slice(0, 4000) : "";
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 4000) : "";
    if (!content) { sendError(res, "Conteúdo da anotação obrigatório", "INVALID_CONTENT", 400); return; }

    const { rows } = await query<NoteRow>(
      `INSERT INTO book_notes (user_id, content_id, page, selected_text, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text, page, selected_text, content, created_at, updated_at`,
      [req.user!.id, contentId, page, selectedText, content],
    );
    const r = rows[0];
    success(res, { note: { id: r.id, page: r.page, selectedText: r.selected_text, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at } }, 201);
  } catch (err) { next(err); }
});

// PATCH /api/books/:contentId/notes/:id — edita conteúdo.
router.patch("/:contentId/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    const noteId = parseBigId(req.params.id);
    if (!contentId || !noteId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const body = (req.body ?? {}) as { content?: unknown };
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 4000) : "";
    if (!content) { sendError(res, "Conteúdo obrigatório", "INVALID_CONTENT", 400); return; }
    const { rows } = await query<NoteRow>(
      `UPDATE book_notes SET content = $1, updated_at = NOW()
        WHERE id = $2 AND user_id = $3 AND content_id = $4
       RETURNING id::text, page, selected_text, content, created_at, updated_at`,
      [content, noteId, req.user!.id, contentId],
    );
    const r = rows[0];
    if (!r) { sendError(res, "Anotação não encontrada", "NOT_FOUND", 404); return; }
    success(res, { note: { id: r.id, page: r.page, selectedText: r.selected_text, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at } });
  } catch (err) { next(err); }
});

// DELETE /api/books/:contentId/notes/:id
router.delete("/:contentId/notes/:id", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    const noteId = parseBigId(req.params.id);
    if (!contentId || !noteId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const { rowCount } = await query(
      `DELETE FROM book_notes WHERE id = $1 AND user_id = $2 AND content_id = $3`,
      [noteId, req.user!.id, contentId],
    );
    if (!rowCount) { sendError(res, "Anotação não encontrada", "NOT_FOUND", 404); return; }
    success(res, { ok: true });
  } catch (err) { next(err); }
});

export default router;
