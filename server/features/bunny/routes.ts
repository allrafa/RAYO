import { Router } from "express";
import express from "express";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireRole } from "../../middleware/auth.js";
import { rateLimiter } from "../../middleware/security.js";
import { success, error as sendError } from "../../utils/response.js";
import { query } from "../../db/index.js";
import { logger } from "../../utils/logger.js";
import { createNotification } from "../notifications/service.js";
import {
  isBunnyConfigured,
  getBunnyConfig,
  createBunnyVideo,
  uploadBunnyVideo,
  getBunnyVideo,
  bunnyStatusToInternal,
  buildBunnySentinel,
  parseBunnyRef,
  bunnyThumbnailUrl,
  BunnyError,
} from "../../lib/bunnyStream.js";

// ── Admin upload router (mounted at /api/admin/bunny) ─────────────────
// Producer+ envia o arquivo bruto; o servidor:
//   1) cria o slot no Bunny (POST /videos)
//   2) sobe os bytes (PUT /videos/{guid})
//   3) atualiza o content_item (provider/external_id/status='processing')
// Limites estritos: ≤5 GB, mime allowlist (mp4/mov/webm/quicktime).
//
// Multer com disk storage: 5 GB em RAM seria suicídio. Arquivos vão pra
// `os.tmpdir()` e são removidos no finally, sucesso ou falha.
export const adminBunnyRouter = Router();

const TMP_DIR = path.join(os.tmpdir(), "rayo-bunny-uploads");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);
const VIDEO_MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TMP_DIR),
    filename: (_req, file, cb) => {
      const stamp = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const ext = path.extname(file.originalname) || ".mp4";
      cb(null, `${stamp}${ext}`);
    },
  }),
  limits: { fileSize: VIDEO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (VIDEO_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de vídeo não permitido: ${file.mimetype}`));
  },
}).single("file");

function safeUnlink(p: string | undefined): void {
  if (!p) return;
  fs.promises.unlink(p).catch(() => { /* best-effort */ });
}

// GET /api/admin/bunny/status — usado pelo admin form pra saber se mostra
// o uploader ou cai no fallback "URL externa".
adminBunnyRouter.get("/status", requireRole("producer"), (_req, res) => {
  const cfg = getBunnyConfig();
  success(res, {
    configured: cfg !== null,
    library_id: cfg?.libraryId ?? null,
    has_webhook_secret: !!cfg?.webhookSecret,
  });
});

// POST /api/admin/bunny/content/:id/upload — upload de vídeo para um
// content_item existente. `id` precisa pertencer ao usuário (producer)
// ou ser editável por moderator+.
adminBunnyRouter.post(
  "/content/:id/upload",
  requireRole("producer"),
  rateLimiter(20, 60 * 60 * 1000, { keyByUser: true }),
  async (req, res, next) => {
    if (!isBunnyConfigured()) {
      sendError(res, "Bunny Stream não está configurado", "BUNNY_DISABLED", 503);
      return;
    }
    // 1) Membership/ownership ANTES de aceitar bytes.
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      sendError(res, "ID inválido", "INVALID_ID", 400);
      return;
    }
    try {
      const { rows } = await query<{ id: number; created_by: number | null; title: string; kind: string }>(
        `SELECT id, created_by, title, kind FROM content_items WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) {
        sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404);
        return;
      }
      const item = rows[0];
      const role = req.user!.role;
      const elevated = role === "moderator" || role === "admin";
      if (!elevated && item.created_by !== req.user!.id) {
        sendError(res, "Sem permissão para este conteúdo", "FORBIDDEN", 403);
        return;
      }
      // Guard server-side: Bunny só faz sentido pra video/reels. Sem
      // isso, um cliente malicioso (ou bug futuro) poderia anexar
      // metadados de vídeo a um audio/livro/curso/serie.
      if (item.kind !== "video" && item.kind !== "reels") {
        sendError(
          res,
          `Upload Bunny só é permitido para conteúdos de vídeo ou reels (kind=${item.kind})`,
          "INVALID_KIND",
          400,
        );
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  // 2) Multer (disco).
  (req, res, next) => videoUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      sendError(res, "Vídeo excede o limite de 5 GB", "FILE_TOO_LARGE", 413);
      return;
    }
    sendError(res, err instanceof Error ? err.message : "Upload inválido", "INVALID_UPLOAD", 400);
  }),
  // 3) Bunny createVideo + uploadVideo + UPDATE no banco.
  async (req, res, next) => {
    const file = req.file;
    if (!file) {
      sendError(res, "Arquivo é obrigatório", "FILE_REQUIRED", 400);
      return;
    }
    const id = parseInt(req.params.id, 10);
    try {
      const cfg = getBunnyConfig()!;
      const { rows: itemRows } = await query<{ title: string; video_external_id: string | null }>(
        `SELECT title, video_external_id FROM content_items WHERE id = $1`,
        [id],
      );
      const title = itemRows[0]?.title ?? `Vídeo ${id}`;
      // Guarda o GUID anterior pra cleanup pós-sucesso (replace = troca).
      const previousRef = itemRows[0]?.video_external_id ?? null;
      const previousParsed = previousRef ? parseBunnyRef(previousRef, cfg.libraryId) : null;

      // Cria slot no Bunny.
      const created = await createBunnyVideo(title);

      // Sobe os bytes (stream do disco).
      const stream = fs.createReadStream(file.path);
      try {
        await uploadBunnyVideo(created.guid, stream, file.size);
      } finally {
        // Garante que o file descriptor feche mesmo em erro.
        stream.destroy();
      }

      const sentinel = buildBunnySentinel(cfg.libraryId, created.guid);
      const { rows: updated } = await query(
        `UPDATE content_items SET
            video_provider = 'bunny',
            video_external_id = $1,
            video_status = 'processing',
            video_duration_sec = NULL,
            video_thumbnail_url = NULL,
            updated_at = NOW()
          WHERE id = $2
          RETURNING id, video_provider, video_external_id, video_status`,
        [sentinel, id],
      );

      // Cleanup do vídeo Bunny anterior (apenas após o UPDATE bem-sucedido,
      // pra evitar deletar o vídeo bom se o INSERT/UPDATE falhar). Falha
      // de delete não derruba a request — Bunny segue cobrando até retry.
      if (previousParsed && previousParsed.guid !== created.guid) {
        try {
          const { deleteBunnyVideo } = await import("../../lib/bunnyStream.js");
          await deleteBunnyVideo(previousParsed.guid);
        } catch (err) {
          logger.warn(
            "Bunny",
            `Falha ao limpar vídeo anterior ${previousParsed.guid} após replace: ${(err as Error).message}`,
          );
        }
      }

      success(res, {
        item: updated[0],
        bunny: { library_id: cfg.libraryId, guid: created.guid, sentinel },
      }, 201);
    } catch (err) {
      if (err instanceof BunnyError) {
        sendError(res, err.message, "BUNNY_ERROR", err.statusCode);
        return;
      }
      next(err);
    } finally {
      safeUnlink(file?.path);
    }
  },
);

// DELETE /api/admin/bunny/content/:id — desvincula o vídeo Bunny do
// content_item e remove no Bunny (idempotente em 404). Não apaga o item.
adminBunnyRouter.delete("/content/:id", requireRole("producer"), async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    sendError(res, "ID inválido", "INVALID_ID", 400);
    return;
  }
  try {
    const { rows } = await query<{ video_external_id: string | null; created_by: number | null }>(
      `SELECT video_external_id, created_by FROM content_items WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) {
      sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404);
      return;
    }
    const item = rows[0];
    const role = req.user!.role;
    const elevated = role === "moderator" || role === "admin";
    if (!elevated && item.created_by !== req.user!.id) {
      sendError(res, "Sem permissão para este conteúdo", "FORBIDDEN", 403);
      return;
    }
    const cfg = getBunnyConfig();
    const parsed = item.video_external_id ? parseBunnyRef(item.video_external_id, cfg?.libraryId) : null;
    if (parsed && cfg) {
      try {
        const { deleteBunnyVideo } = await import("../../lib/bunnyStream.js");
        await deleteBunnyVideo(parsed.guid);
      } catch (err) {
        logger.warn("Bunny", `deleteVideo falhou (continuando): ${(err as Error).message}`);
      }
    }
    await query(
      `UPDATE content_items SET
          video_provider = NULL, video_external_id = NULL, video_status = NULL,
          video_duration_sec = NULL, video_thumbnail_url = NULL, updated_at = NOW()
        WHERE id = $1`,
      [id],
    );
    success(res, { id, removed: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/bunny/content/:id — re-sincroniza o status com o Bunny
// (pull manual quando o webhook não chegou). Útil em dev. Mesma checagem
// de ownership do upload/delete: producer só vê o próprio conteúdo;
// moderator+ pode olhar qualquer um.
adminBunnyRouter.get("/content/:id", requireRole("producer"), async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    sendError(res, "ID inválido", "INVALID_ID", 400);
    return;
  }
  try {
    const { rows } = await query<{ video_external_id: string | null; created_by: number | null }>(
      `SELECT video_external_id, created_by FROM content_items WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) {
      sendError(res, "Conteúdo não encontrado", "CONTENT_NOT_FOUND", 404);
      return;
    }
    const item = rows[0];
    const role = req.user!.role;
    const elevated = role === "moderator" || role === "admin";
    if (!elevated && item.created_by !== req.user!.id) {
      sendError(res, "Sem permissão para este conteúdo", "FORBIDDEN", 403);
      return;
    }
    const cfg = getBunnyConfig();
    const parsed = item.video_external_id ? parseBunnyRef(item.video_external_id, cfg?.libraryId) : null;
    if (!parsed) {
      sendError(res, "Conteúdo sem vídeo Bunny", "NO_BUNNY_VIDEO", 404);
      return;
    }
    const v = await getBunnyVideo(parsed.guid);
    const status = bunnyStatusToInternal(v.status);
    await applyBunnyStatusUpdate(id, status, v.length, v.thumbnailFileName, parsed.guid);
    success(res, { id, status, duration_sec: v.length });
  } catch (err) {
    if (err instanceof BunnyError) {
      sendError(res, err.message, "BUNNY_ERROR", err.statusCode);
      return;
    }
    next(err);
  }
});

// ── Webhook router (mounted at /api/webhooks/bunny) ───────────────────
// SEM auth de usuário. Validação por HMAC SHA256 do raw body com
// BUNNY_STREAM_WEBHOOK_SECRET. Sem o secret configurado, REJEITA todas
// as chamadas (não é seguro deixar aberto).
//
// Bunny envia payloads como `{ VideoLibraryId, VideoGuid, Status }`. Nós
// também aceitamos `{ video_library_id, video_guid, status }` por defesa.
export const bunnyWebhookRouter = Router();

bunnyWebhookRouter.post(
  "/",
  // raw body necessário pra HMAC. Aceita JSON.
  express.raw({ type: ["application/json", "application/*+json"], limit: "32kb" }),
  async (req, res) => {
    const cfg = getBunnyConfig();
    if (!cfg || !cfg.webhookSecret) {
      sendError(res, "Webhook desabilitado", "BUNNY_WEBHOOK_DISABLED", 503);
      return;
    }
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");
    const expected = crypto
      .createHmac("sha256", cfg.webhookSecret)
      .update(raw)
      .digest("hex");
    const sig = String(
      req.header("x-bunny-signature") ||
      req.header("x-webhook-signature") ||
      req.header("authorization") || "",
    ).trim().replace(/^sha256=/i, "");
    if (!sig || !timingSafeEqualHex(sig, expected)) {
      logger.warn("Bunny", "Webhook com assinatura inválida.");
      sendError(res, "Assinatura inválida", "INVALID_SIGNATURE", 401);
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    } catch {
      sendError(res, "JSON inválido", "INVALID_JSON", 400);
      return;
    }

    const guid = String(payload.VideoGuid ?? payload.video_guid ?? "").trim();
    const statusRaw = payload.Status ?? payload.status;
    const statusNum = typeof statusRaw === "number"
      ? statusRaw
      : Number.parseInt(String(statusRaw ?? ""), 10);
    if (!guid || !Number.isFinite(statusNum)) {
      sendError(res, "Payload incompleto", "INVALID_PAYLOAD", 400);
      return;
    }
    const internal = bunnyStatusToInternal(statusNum);

    // Acha o content_item pelo GUID. Aceita o sentinel completo OU o GUID
    // sozinho gravado em video_external_id.
    const sentinel = buildBunnySentinel(cfg.libraryId, guid);
    const { rows } = await query<{ id: number; created_by: number | null; title: string }>(
      `SELECT id, created_by, title FROM content_items
        WHERE video_provider = 'bunny'
          AND (video_external_id = $1 OR video_external_id = $2)
        LIMIT 1`,
      [sentinel, guid],
    );
    if (rows.length === 0) {
      // Bunny manda webhook mesmo pra vídeos órfãos (criados manualmente
      // no painel). Respondemos 200 pra ele não ficar reentregando.
      logger.info("Bunny", `Webhook ignorado: nenhum content_item para guid=${guid}`);
      success(res, { ok: true, matched: false });
      return;
    }
    const target = rows[0];

    // Pra ready/failed buscamos a duração/thumb via getVideo (o webhook
    // nem sempre traz isso, e é barato).
    let duration: number | null = null;
    let thumbFile: string | null = null;
    if (internal === "ready") {
      try {
        const v = await getBunnyVideo(guid);
        duration = v.length || null;
        thumbFile = v.thumbnailFileName ?? null;
      } catch (err) {
        logger.warn("Bunny", `getVideo após webhook falhou: ${(err as Error).message}`);
      }
    }
    const changed = await applyBunnyStatusUpdate(target.id, internal, duration, thumbFile, guid);

    // Notifica o producer dono — apenas quando o status mudou de fato,
    // pra não duplicar notificações em caso de reentrega de webhook.
    if (changed && target.created_by) {
      const labelByStatus = {
        ready: "Vídeo pronto",
        failed: "Falha no processamento do vídeo",
        processing: "Processando vídeo",
      } as const;
      try {
        await createNotification({
          userId: target.created_by,
          kind: "video_status",
          title: labelByStatus[internal],
          body: target.title,
          link: `/admin/cms?id=${target.id}`,
          payload: { content_id: target.id, status: internal },
        });
      } catch (err) {
        logger.warn("Bunny", `notify producer falhou: ${(err as Error).message}`);
      }
    }

    success(res, { ok: true, matched: true, status: internal });
  },
);

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Atualiza status. Idempotente e à prova de reentrega/out-of-order:
//   - já está em 'ready' e veio 'processing'  → ignora (não regredir)
//   - já está em 'failed' e veio 'processing' → ignora
//   - 'ready' ou 'failed' sempre sobrescrevem (estados terminais)
// Retorna `true` se o status mudou de fato (usado pelo webhook pra
// disparar notificação só uma vez).
async function applyBunnyStatusUpdate(
  contentId: number,
  status: "processing" | "ready" | "failed",
  durationSec: number | null,
  thumbnailFileName: string | null,
  guid: string,
): Promise<boolean> {
  const cfg = getBunnyConfig();
  let thumbUrl: string | null = null;
  if (cfg) {
    thumbUrl = thumbnailFileName
      ? `https://${cfg.cdnHostname}/${guid}/${thumbnailFileName}`
      : bunnyThumbnailUrl(cfg.cdnHostname, guid);
  }
  const { rows } = await query<{ id: number }>(
    `UPDATE content_items SET
        video_status = $1,
        video_duration_sec = COALESCE($2, video_duration_sec),
        video_thumbnail_url = COALESCE($3, video_thumbnail_url),
        updated_at = NOW()
      WHERE id = $4
        AND video_status IS DISTINCT FROM $1
        -- Não regredir: se já está em estado terminal, só aceita novos
        -- estados terminais (failed após ready, p.ex., não acontece na
        -- prática mas o guard é cheap).
        AND NOT (
          video_status IN ('ready','failed') AND $1 = 'processing'
        )
      RETURNING id`,
    [status, durationSec, thumbUrl, contentId],
  );
  return rows.length > 0;
}
