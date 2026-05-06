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

// Task #45 — atualiza preferências de notificação (merge raso na JSONB).
router.patch("/preferences", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const allowed = ["push", "email", "missions", "community"] as const;
    const next: Record<string, boolean> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        next[key] = Boolean(body[key]);
      }
    }
    if (Object.keys(next).length === 0) {
      error(res, "Nenhuma preferência válida fornecida", "VALIDATION_ERROR", 400);
      return;
    }

    const { rows } = await query<{ notification_preferences: Record<string, boolean> | null }>(
      "SELECT notification_preferences FROM users WHERE id = $1",
      [req.user!.id],
    );
    const current = (rows[0]?.notification_preferences ?? {}) as Record<string, boolean>;
    const merged = { ...current, ...next };

    const updatedUser = await updateUserProfile(req.user!.id, { notification_preferences: merged });
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
// Comunidades = quantidade de fóruns distintos onde o usuário já postou
// (não há tabela de membership). Vídeos favoritos vêm do localStorage
// do cliente e não entram aqui.
router.get("/me/activity-stats", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [coursesRes, libraryRes, communitiesRes, postsRes] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM user_course_progress WHERE user_id = $1`,
        [userId],
      ),
      query<{ count: string }>(
        // Tabela existe? Em produção a Biblioteca vem dos cursos +
        // CMS items lidos. Como não há tabela dedicada, retornamos a
        // contagem de cursos matriculados como aproximação.
        `SELECT COUNT(*)::text AS count FROM user_course_progress WHERE user_id = $1`,
        [userId],
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT forum_id)::text AS count FROM posts WHERE user_id = $1 AND is_hidden = FALSE`,
        [userId],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM posts WHERE user_id = $1 AND is_hidden = FALSE`,
        [userId],
      ),
    ]);
    success(res, {
      stats: {
        coursesEnrolled: Number.parseInt(coursesRes.rows[0]?.count ?? "0", 10),
        libraryCount: Number.parseInt(libraryRes.rows[0]?.count ?? "0", 10),
        communitiesActive: Number.parseInt(
          communitiesRes.rows[0]?.count ?? "0",
          10,
        ),
        postsCreated: Number.parseInt(postsRes.rows[0]?.count ?? "0", 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
