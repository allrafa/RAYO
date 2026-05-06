import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { validateProfileUpdate } from "../auth/validation.js";
import { updateUserProfile } from "../auth/service.js";
import { success, error } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { query } from "../../db/index.js";
import { UPLOAD_ROOT } from "../cms/upload.js";

const router = Router();

// Task #45 — upload de avatar. Multer dedicado: somente imagens, cap 2MB,
// gravado em uploads/avatar/, exposto via /uploads/avatar/.
const AVATAR_DIR = path.join(UPLOAD_ROOT, "avatar");
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}
const AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename: (_req, file, cb) => {
      // Sempre derivamos a extensão do MIME validado (allowlist no
      // fileFilter abaixo). Nunca confiamos em file.originalname pra
      // evitar que um cliente salve `.html` sob /uploads/avatar/ e
      // gere stored-XSS via static hosting same-origin.
      const extByMime: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
      };
      const ext = extByMime[file.mimetype] || ".bin";
      cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (AVATAR_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error("Imagem inválida (use JPG, PNG ou WebP)"));
  },
}).single("file");

// Task #44 — Perfil público mínimo de outro usuário (consumido pelo
// deep-link de busca). Devolve só campos seguros: id, name, segments
// (lista pública de contextos), level, xp, streak, total de badges
// conquistadas e data de entrada. Email, role e qualquer PII ficam
// fora. Requer auth pra evitar scraping anônimo.
router.get(
  "/:id/public",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id <= 0) {
        error(res, "ID de usuário inválido", "INVALID_USER_ID", 400);
        return;
      }
      const userRes = await query<{
        id: number;
        name: string;
        bio: string | null;
        avatar_url: string | null;
        segments: string[] | null;
        level: number;
        xp: number;
        streak: number;
        created_at: string;
      }>(
        `SELECT id, name, bio, avatar_url, segments, level, xp, streak, created_at
           FROM users WHERE id = $1`,
        [id],
      );
      if (userRes.rows.length === 0) {
        error(res, "Usuário não encontrado", "USER_NOT_FOUND", 404);
        return;
      }
      const u = userRes.rows[0];
      const badgeCountRes = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM user_badges WHERE user_id = $1`,
        [id],
      );
      const badgeCount = Number.parseInt(
        badgeCountRes.rows[0]?.count ?? "0",
        10,
      );
      success(res, {
        user: {
          id: u.id,
          name: u.name,
          bio: u.bio,
          avatar_url: u.avatar_url,
          segments: u.segments ?? [],
          level: u.level,
          xp: u.xp,
          streak: u.streak,
          totalBadges: badgeCount,
          joinedAt: u.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

router.patch("/profile", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateProfileUpdate(req.body);
    if (!validation.valid) {
      error(res, validation.message, "VALIDATION_ERROR", 400);
      return;
    }

    const updatedUser = await updateUserProfile(req.user!.id, validation.data);
    success(res, { user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// Task #45 — preferências de usuário (notifications + language). O
// payload aceito é nested: `{ notifications: { push?, email?,
// weekly_digest?, missions?, community? }, language? }`. Fazemos merge
// raso preservando notifications existentes e qualquer outra chave
// futura (ex.: theme).
router.patch("/preferences", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body || {}) as { notifications?: unknown; language?: unknown };
    const NOTIF_KEYS = ["push", "email", "weekly_digest", "missions", "community"] as const;

    const nextNotif: Record<string, boolean> = {};
    if (body.notifications !== undefined) {
      if (typeof body.notifications !== "object" || body.notifications === null || Array.isArray(body.notifications)) {
        error(res, "notifications deve ser um objeto", "VALIDATION_ERROR", 400);
        return;
      }
      const incoming = body.notifications as Record<string, unknown>;
      for (const key of NOTIF_KEYS) {
        if (incoming[key] !== undefined) {
          nextNotif[key] = Boolean(incoming[key]);
        }
      }
    }

    let language: string | undefined;
    if (body.language !== undefined) {
      if (body.language !== "pt-BR" && body.language !== "en") {
        error(res, "Idioma inválido (use pt-BR ou en)", "VALIDATION_ERROR", 400);
        return;
      }
      language = body.language;
    }

    if (Object.keys(nextNotif).length === 0 && language === undefined) {
      error(res, "Nenhuma preferência válida fornecida", "VALIDATION_ERROR", 400);
      return;
    }

    const { rows } = await query<{ notification_preferences: Record<string, unknown> | null }>(
      "SELECT notification_preferences FROM users WHERE id = $1",
      [req.user!.id],
    );
    const current = (rows[0]?.notification_preferences ?? {}) as Record<string, unknown>;
    const currentNotifRaw = current.notifications;
    const currentNotif =
      currentNotifRaw && typeof currentNotifRaw === "object" && !Array.isArray(currentNotifRaw)
        ? (currentNotifRaw as Record<string, boolean>)
        : {};
    const merged: Record<string, unknown> = { ...current };
    if (Object.keys(nextNotif).length > 0) {
      merged.notifications = { ...currentNotif, ...nextNotif };
    }
    if (language !== undefined) {
      merged.language = language;
    }

    const updatedUser = await updateUserProfile(req.user!.id, {
      notification_preferences: merged as Parameters<typeof updateUserProfile>[1]["notification_preferences"],
    });
    success(res, { user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// Task #45 — upload do avatar. Atualiza users.avatar_url e devolve o user.
router.post("/avatar", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  avatarUpload(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        const msg =
          uploadErr instanceof Error ? uploadErr.message : "Falha no upload";
        const code =
          (uploadErr as { code?: string }).code === "LIMIT_FILE_SIZE"
            ? "Imagem muito grande (máx. 2 MB)"
            : msg;
        error(res, code, "UPLOAD_ERROR", 400);
        return;
      }
      if (!req.file) {
        error(res, "Arquivo não enviado", "VALIDATION_ERROR", 400);
        return;
      }
      const publicUrl = `/uploads/avatar/${path.basename(req.file.path)}`;
      const updatedUser = await updateUserProfile(req.user!.id, {
        avatar_url: publicUrl,
      });
      success(res, { user: updatedUser });
    } catch (err) {
      next(err);
    }
  });
});

// Task #45 — agregador de stats reais para a Atividade no Perfil.
// Contrato: `{ libraryCount, communitiesCount, favoritesCount,
// councilSessionsCount? }`. `favoritesCount` cobre apenas favoritos
// persistidos no servidor (vídeos favoritos do YouTube ainda vivem em
// localStorage e o frontend mescla). `councilSessionsCount` só é
// devolvido se houver tabela de conversas do Conselheiro — caso
// contrário fica omisso pra frontend não mostrar dado falso.
router.get("/me/activity-stats", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [libraryRes, communitiesRes, councilTableRes] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM user_course_progress WHERE user_id = $1`,
        [userId],
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT forum_id)::text AS count FROM posts WHERE user_id = $1 AND is_hidden = FALSE`,
        [userId],
      ),
      query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'trilha_transformacao_conversations'
         ) AS exists`,
      ),
    ]);

    const stats: Record<string, number> = {
      libraryCount: Number.parseInt(libraryRes.rows[0]?.count ?? "0", 10),
      communitiesCount: Number.parseInt(communitiesRes.rows[0]?.count ?? "0", 10),
      // Favoritos persistidos no servidor: hoje só temos cursos
      // marcados em progresso como proxy real (vídeos favoritos vivem
      // no cliente). Se um dia tivermos `user_favorites`, troca aqui.
      favoritesCount: 0,
    };

    if (councilTableRes.rows[0]?.exists) {
      const councilRes = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM trilha_transformacao_conversations WHERE user_id = $1`,
        [userId],
      );
      stats.councilSessionsCount = Number.parseInt(councilRes.rows[0]?.count ?? "0", 10);
    }

    success(res, { stats });
  } catch (err) {
    next(err);
  }
});

export default router;
