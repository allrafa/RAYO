import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { query } from "../../db/index.js";
import { success, error as sendError } from "../../utils/response.js";
import { rateLimiter } from "../../middleware/security.js";
import { sendContatoEmail } from "../../lib/email.js";
import { logger } from "../../utils/logger.js";

// Task #70 — Endpoints públicos do site marketing.
//
// `/api/blog/posts` e `/api/blog/posts/:slug` reaproveitam content_items
// filtrados por kind='artigo' + status='published'. Não exigem autenticação.
//
// `/api/contato` recebe o formulário público e dispara e-mail via Resend.
// Rate-limited a 3 requisições por hora por IP (anti-spam) — independente
// da rate de leitura do blog.

interface ArtigoRow {
  id: number;
  slug: string | null;
  title: string;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  author: string | null;
  tags: string[];
  segments: string[];
  view_count: number;
  published_at: Date | null;
}

function shapePost(r: ArtigoRow) {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.short_description ?? "",
    body: r.long_description ?? "",
    cover_url: r.cover_url,
    author: r.author,
    tags: r.tags ?? [],
    segments: r.segments ?? [],
    view_count: r.view_count,
    published_at: r.published_at,
  };
}

export const blogRouter = Router();

blogRouter.get("/posts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const segment = typeof req.query.segment === "string" ? req.query.segment : null;
    const params: unknown[] = [];
    let where = `kind = 'artigo' AND status = 'published'`;
    if (segment && segment !== "all") {
      where += ` AND (cardinality(segments) = 0 OR $1 = ANY(segments))`;
      params.push(segment);
    }
    const { rows } = await query(
      `SELECT id, slug, title, short_description, long_description, cover_url,
              author, tags, segments, view_count, published_at
         FROM content_items
        WHERE ${where}
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT ${limit}`,
      params,
    );
    success(res, { items: (rows as ArtigoRow[]).map(shapePost) });
  } catch (err) {
    next(err);
  }
});

blogRouter.get("/posts/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug || !/^[a-z0-9-]{1,200}$/i.test(slug)) {
      sendError(res, "Slug inválido", "INVALID_SLUG", 400);
      return;
    }
    const { rows } = await query(
      `SELECT id, slug, title, short_description, long_description, cover_url,
              author, tags, segments, view_count, published_at
         FROM content_items
        WHERE kind = 'artigo' AND status = 'published' AND slug = $1
        LIMIT 1`,
      [slug],
    );
    if (rows.length === 0) {
      sendError(res, "Artigo não encontrado", "POST_NOT_FOUND", 404);
      return;
    }
    void query(`UPDATE content_items SET view_count = view_count + 1 WHERE id = $1`, [rows[0].id]);
    success(res, { post: shapePost(rows[0] as ArtigoRow) });
  } catch (err) {
    next(err);
  }
});

export const contatoRouter = Router();

contatoRouter.post(
  "/",
  rateLimiter(3, 60 * 60 * 1000, { keyByUser: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const nome = typeof body.nome === "string" ? body.nome.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const assunto = typeof body.assunto === "string" ? body.assunto.trim() : "";
      const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim() : "";

      if (!nome || nome.length < 2 || nome.length > 120) {
        sendError(res, "Nome deve ter entre 2 e 120 caracteres", "INVALID_NOME", 400);
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        sendError(res, "E-mail inválido", "INVALID_EMAIL", 400);
        return;
      }
      if (!assunto || assunto.length < 2 || assunto.length > 120) {
        sendError(res, "Assunto obrigatório", "INVALID_ASSUNTO", 400);
        return;
      }
      if (!mensagem || mensagem.length < 10 || mensagem.length > 5000) {
        sendError(res, "Mensagem deve ter entre 10 e 5000 caracteres", "INVALID_MENSAGEM", 400);
        return;
      }

      const result = await sendContatoEmail({ nome, email, assunto, mensagem });
      if (!result.sent) {
        // Não falha pra usuário se Resend não estiver configurado em dev — só
        // loga. Em produção (com chave configurada) qualquer erro vira 502.
        if (result.error === "RESEND_NOT_CONFIGURED") {
          logger.warn("Contato", `Mensagem recebida mas Resend não configurado (${email})`);
          success(res, { ok: true, delivered: false });
          return;
        }
        sendError(res, "Não foi possível enviar agora. Tente em instantes.", "EMAIL_FAILED", 502);
        return;
      }
      success(res, { ok: true, delivered: true });
    } catch (err) {
      next(err);
    }
  },
);
