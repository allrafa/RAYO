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
import { AppError } from "../academia/service.js";
import { resolveStoredMediaUrl } from "../../lib/objectStorageBridge.js";

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
  id: string; page: number; text: string; color: string; rects: unknown;
  cfi_range: string | null; created_at: Date;
}
interface NoteRow {
  id: string; page: number; selected_text: string; content: string;
  cfi: string | null; created_at: Date; updated_at: Date;
}

// Task #261 — CFI (EPUB Canonical Fragment Identifier) é só uma string
// gerada pelo epubjs. Não tentamos validar a sintaxe — só limitamos
// tamanho e tipo. Quando o highlight vem de EPUB, `rects` fica vazio
// e `cfi_range` carrega o "endereço" do trecho.
function sanitizeCfi(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // CFIs realistas têm <500 chars; cap em 2000 por segurança.
  return trimmed.length > 2000 ? trimmed.slice(0, 2000) : trimmed;
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
        `SELECT id::text, page, text, color, rects, cfi_range, created_at
           FROM book_highlights WHERE user_id = $1 AND content_id = $2
          ORDER BY page ASC, created_at ASC`,
        [req.user!.id, contentId],
      ),
      query<NoteRow>(
        `SELECT id::text, page, selected_text, content, cfi, created_at, updated_at
           FROM book_notes WHERE user_id = $1 AND content_id = $2
          ORDER BY page ASC, created_at ASC`,
        [req.user!.id, contentId],
      ),
    ]);

    success(res, {
      highlights: hs.rows.map((r) => ({
        id: r.id, page: r.page, text: r.text, color: r.color,
        rects: r.rects, cfiRange: r.cfi_range, createdAt: r.created_at,
      })),
      notes: ns.rows.map((r) => ({
        id: r.id, page: r.page, selectedText: r.selected_text,
        content: r.content, cfi: r.cfi,
        createdAt: r.created_at, updatedAt: r.updated_at,
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

    const body = (req.body ?? {}) as {
      page?: unknown; text?: unknown; color?: unknown;
      rects?: unknown; cfiRange?: unknown;
    };
    const pageNum = typeof body.page === "number" ? body.page : parseInt(String(body.page ?? ""), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) { sendError(res, "page inválido", "INVALID_PAGE", 400); return; }
    // EPUB não tem "páginas" reais; clamp só faz sentido pra PDFs com
    // total de páginas conhecido. Quando `livro.pages` é null (EPUB),
    // qualquer page>=1 é aceita (cliente usa permil 1..1000 pra ordenar).
    const max = livro.pages && livro.pages > 0 ? livro.pages : pageNum;
    const page = Math.max(1, Math.min(Math.floor(pageNum), max));

    const text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
    const color = typeof body.color === "string" && HIGHLIGHT_COLORS.has(body.color) ? body.color : "yellow";
    const rects = sanitizeRects(body.rects);
    const cfiRange = sanitizeCfi(body.cfiRange);
    // Pelo menos um identificador de localização tem que vir: rects (PDF)
    // ou cfiRange (EPUB). Sem nenhum dos dois, não dá pra renderizar o
    // overlay nem voltar pro trecho.
    if (rects.length === 0 && !cfiRange) {
      sendError(res, "Localização do trecho ausente", "INVALID_LOCATION", 400);
      return;
    }

    const { rows } = await query<HighlightRow>(
      `INSERT INTO book_highlights (user_id, content_id, page, text, color, rects, cfi_range)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id::text, page, text, color, rects, cfi_range, created_at`,
      [req.user!.id, contentId, page, text, color, JSON.stringify(rects), cfiRange],
    );
    const r = rows[0];
    success(res, {
      highlight: {
        id: r.id, page: r.page, text: r.text, color: r.color,
        rects: r.rects, cfiRange: r.cfi_range, createdAt: r.created_at,
      },
    }, 201);
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

    const body = (req.body ?? {}) as {
      page?: unknown; selectedText?: unknown; content?: unknown; cfi?: unknown;
    };
    const pageNum = typeof body.page === "number" ? body.page : parseInt(String(body.page ?? ""), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) { sendError(res, "page inválido", "INVALID_PAGE", 400); return; }
    const max = livro.pages && livro.pages > 0 ? livro.pages : pageNum;
    const page = Math.max(1, Math.min(Math.floor(pageNum), max));

    const selectedText = typeof body.selectedText === "string" ? body.selectedText.slice(0, 4000) : "";
    const content = typeof body.content === "string" ? body.content.trim().slice(0, 4000) : "";
    if (!content) { sendError(res, "Conteúdo da anotação obrigatório", "INVALID_CONTENT", 400); return; }
    const cfi = sanitizeCfi(body.cfi);

    const { rows } = await query<NoteRow>(
      `INSERT INTO book_notes (user_id, content_id, page, selected_text, content, cfi)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id::text, page, selected_text, content, cfi, created_at, updated_at`,
      [req.user!.id, contentId, page, selectedText, content, cfi],
    );
    const r = rows[0];
    success(res, {
      note: {
        id: r.id, page: r.page, selectedText: r.selected_text,
        content: r.content, cfi: r.cfi,
        createdAt: r.created_at, updatedAt: r.updated_at,
      },
    }, 201);
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
       RETURNING id::text, page, selected_text, content, cfi, created_at, updated_at`,
      [content, noteId, req.user!.id, contentId],
    );
    const r = rows[0];
    if (!r) { sendError(res, "Anotação não encontrada", "NOT_FOUND", 404); return; }
    success(res, {
      note: {
        id: r.id, page: r.page, selectedText: r.selected_text,
        content: r.content, cfi: r.cfi,
        createdAt: r.created_at, updatedAt: r.updated_at,
      },
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// Task #256 — Compartilhar destaques/anotações na comunidade + carrossel
// "Trechos mais destacados" na página do livro.
// ────────────────────────────────────────────────────────────────────────────

interface BookMetaRow {
  title: string;
  author: string | null;
  slug: string | null;
  cover_url: string | null;
  pages: number | null;
}

async function loadBookMeta(contentId: number): Promise<BookMetaRow | null> {
  const { rows } = await query<BookMetaRow>(
    `SELECT title, author, slug, cover_url, pages FROM content_items
      WHERE id = $1 AND kind = 'livro' LIMIT 1`,
    [contentId],
  );
  return rows[0] ?? null;
}

// Cria post de share direto (bypassa a validação de POST_IMAGE_PREFIX do
// community.service.createPost) porque a capa do livro vem do CMS (trusted)
// e mora num namespace diferente de `objstore://posts/...`. Faz forum
// validation + INSERT e devolve o post enriquecido pro client.
async function createSharePost(opts: {
  userId: number;
  forumId: number;
  content: string;
  category: string;
  coverRef: string | null;
}) {
  const { rows: forumCheck } = await query<{ id: number; name: string; slug: string; icon: string | null }>(
    `SELECT id, name, slug, icon FROM forums WHERE id = $1 AND is_active = true`,
    [opts.forumId],
  );
  if (forumCheck.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  const images: string[] = [];
  if (opts.coverRef && typeof opts.coverRef === "string" && opts.coverRef.trim()) {
    images.push(opts.coverRef.trim());
  }
  const { rows } = await query<any>(
    `INSERT INTO posts (forum_id, user_id, title, content, category, images, class_id)
     VALUES ($1, $2, NULL, $3, $4, $5::jsonb, NULL)
     RETURNING id, forum_id, class_id, title, content, category, is_pinned,
               like_count, comment_count, share_count, created_at, images`,
    [opts.forumId, opts.userId, opts.content, opts.category, JSON.stringify(images)],
  );
  const post = rows[0];
  const { rows: userRows } = await query<{ name: string; avatar_url: string | null }>(
    `SELECT name, avatar_url FROM users WHERE id = $1`,
    [opts.userId],
  );
  const resolvedImages: string[] = [];
  for (const ref of images) {
    const url = await resolveStoredMediaUrl(ref);
    if (url) resolvedImages.push(url);
  }
  post.images = resolvedImages;
  post.author_id = opts.userId;
  post.author_name = userRows[0]?.name || "Anônimo";
  post.author_avatar = await resolveStoredMediaUrl(userRows[0]?.avatar_url ?? null);
  post.forum_name = forumCheck[0].name;
  post.forum_slug = forumCheck[0].slug;
  post.forum_icon = forumCheck[0].icon;
  return post;
}

function buildSharePostContent(opts: {
  bookTitle: string;
  bookAuthor: string | null;
  page: number;
  /** Total de páginas do livro. Null/0 indica EPUB (sem páginas fixas) — nesse
   *  caso `page` carrega o permil 1..1000 e renderizamos como "X% lido". */
  totalPages: number | null;
  quote: string;
  note?: string;
}): string {
  const lines: string[] = [];
  const cleanQuote = opts.quote.trim().replace(/\s+/g, " ");
  if (cleanQuote) {
    lines.push(`"${cleanQuote}"`);
    lines.push("");
  }
  if (opts.note && opts.note.trim()) {
    lines.push(opts.note.trim());
    lines.push("");
  }
  const author = opts.bookAuthor?.trim() ? ` — ${opts.bookAuthor.trim()}` : "";
  const locator = opts.totalPages && opts.totalPages > 0
    ? `pág. ${opts.page}`
    : `${Math.max(0, Math.min(100, Math.round(opts.page / 10)))}% lido`;
  lines.push(`📖 ${opts.bookTitle}${author} (${locator})`);
  return lines.join("\n").slice(0, 5000);
}

// POST /api/books/:contentId/highlights/:id/share — publica o trecho destacado
// como post numa comunidade escolhida pelo usuário. Body: { forum_id }.
router.post("/:contentId/highlights/:id/share", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    const hlId = parseBigId(req.params.id);
    if (!contentId || !hlId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const forumIdRaw = (req.body as { forum_id?: unknown })?.forum_id;
    const forumId = typeof forumIdRaw === "number" ? forumIdRaw : parseInt(String(forumIdRaw ?? ""), 10);
    if (!Number.isFinite(forumId) || forumId < 1) {
      sendError(res, "Selecione uma comunidade", "INVALID_FORUM_ID", 400);
      return;
    }
    const { rows } = await query<{ page: number; text: string }>(
      `SELECT page, text FROM book_highlights
        WHERE id = $1 AND user_id = $2 AND content_id = $3 LIMIT 1`,
      [hlId, req.user!.id, contentId],
    );
    const hl = rows[0];
    if (!hl) { sendError(res, "Destaque não encontrado", "NOT_FOUND", 404); return; }
    if (!hl.text.trim()) { sendError(res, "Destaque sem texto pra compartilhar", "EMPTY_HIGHLIGHT", 400); return; }
    const book = await loadBookMeta(contentId);
    if (!book) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const content = buildSharePostContent({
      bookTitle: book.title, bookAuthor: book.author,
      page: hl.page, totalPages: book.pages, quote: hl.text,
    });
    try {
      const post = await createSharePost({
        userId: req.user!.id, forumId, content,
        category: "Trecho de livro", coverRef: book.cover_url,
      });
      success(res, { post }, 201);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.message, err.code, err.statusCode);
        return;
      }
      throw err;
    }
  } catch (err) { next(err); }
});

// POST /api/books/:contentId/notes/:id/share — publica a anotação (com o
// trecho selecionado quando houver) como post da comunidade.
router.post("/:contentId/notes/:id/share", requireAuth, async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    const noteId = parseBigId(req.params.id);
    if (!contentId || !noteId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const forumIdRaw = (req.body as { forum_id?: unknown })?.forum_id;
    const forumId = typeof forumIdRaw === "number" ? forumIdRaw : parseInt(String(forumIdRaw ?? ""), 10);
    if (!Number.isFinite(forumId) || forumId < 1) {
      sendError(res, "Selecione uma comunidade", "INVALID_FORUM_ID", 400);
      return;
    }
    const { rows } = await query<{ page: number; selected_text: string; content: string }>(
      `SELECT page, selected_text, content FROM book_notes
        WHERE id = $1 AND user_id = $2 AND content_id = $3 LIMIT 1`,
      [noteId, req.user!.id, contentId],
    );
    const note = rows[0];
    if (!note) { sendError(res, "Anotação não encontrada", "NOT_FOUND", 404); return; }
    const book = await loadBookMeta(contentId);
    if (!book) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }

    const content = buildSharePostContent({
      bookTitle: book.title, bookAuthor: book.author,
      page: note.page, totalPages: book.pages,
      quote: note.selected_text || "", note: note.content,
    });
    try {
      const post = await createSharePost({
        userId: req.user!.id, forumId, content,
        category: "Anotação de livro", coverRef: book.cover_url,
      });
      success(res, { post }, 201);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.message, err.code, err.statusCode);
        return;
      }
      throw err;
    }
  } catch (err) { next(err); }
});

// GET /api/books/:contentId/top-highlights — agrega destaques por trecho
// normalizado (lowercase + colapsa whitespace) e devolve os mais marcados
// por usuários distintos. Público (não exige auth) — é prova social na
// página do livro.
router.get("/:contentId/top-highlights", async (req, res, next) => {
  try {
    const contentId = parseId(req.params.contentId);
    if (!contentId) { sendError(res, "ID inválido", "INVALID_ID", 400); return; }
    const book = await loadBookMeta(contentId);
    if (!book) { sendError(res, "Livro não encontrado", "BOOK_NOT_FOUND", 404); return; }
    const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? "8"), 10) || 8, 20));

    const { rows } = await query<{
      sample_id: string; text: string; color: string; page: number; user_count: number;
    }>(
      `WITH norm AS (
         SELECT id, page, text, color, user_id,
                lower(regexp_replace(btrim(text), '\\s+', ' ', 'g')) AS norm_text
           FROM book_highlights
          WHERE content_id = $1 AND length(btrim(text)) >= 8
       )
       SELECT MIN(id)::text AS sample_id,
              (array_agg(text ORDER BY id))[1] AS text,
              (array_agg(color ORDER BY id))[1] AS color,
              MIN(page) AS page,
              COUNT(DISTINCT user_id)::int AS user_count
         FROM norm
        GROUP BY norm_text
        ORDER BY user_count DESC, MIN(id) DESC
        LIMIT $2`,
      [contentId, limit],
    );
    success(res, {
      highlights: rows.map((r) => ({
        id: r.sample_id,
        text: r.text,
        color: r.color,
        page: r.page,
        userCount: r.user_count,
      })),
    });
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
