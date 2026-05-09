import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { trackEvent } from "../analytics/service.js";
import { resolveStoredMediaUrl } from "../../lib/objectStorageBridge.js";

const POST_IMAGE_PREFIX = "objstore://posts/";
const POST_MAX_IMAGES = 4;

// Resolve images JSON column (array de sentinels) → array de URLs assinadas.
async function resolvePostImages(images: unknown): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const it of images) {
    if (typeof it !== "string") continue;
    const url = await resolveStoredMediaUrl(it);
    if (url) out.push(url);
  }
  return out;
}

async function hydratePostsRows<T extends Record<string, any>>(
  rows: T[],
  viewerId?: number,
): Promise<T[]> {
  // Task #93 — hidrata is_saved em batch (evita subquery em cada listagem).
  let savedSet: Set<number> = new Set();
  if (viewerId && rows.length > 0) {
    const ids = rows.map((r) => Number((r as any).id)).filter((n) => Number.isFinite(n));
    if (ids.length > 0) {
      const { rows: savedRows } = await query(
        `SELECT post_id FROM post_saves WHERE user_id = $1 AND post_id = ANY($2::int[])`,
        [viewerId, ids],
      );
      savedSet = new Set(savedRows.map((r) => Number(r.post_id)));
    }
  }
  return Promise.all(
    rows.map(async (r) => {
      // Task #93 — preserva os sentinels CRUS em `image_refs` ANTES de
      // resolver `images` em URLs assinadas. O frontend precisa dos refs
      // crus pra editar (PATCH /posts/:id valida `objstore://posts/`).
      const rawRefs: string[] = Array.isArray(r.images)
        ? r.images.filter((it: unknown): it is string =>
            typeof it === "string" && it.startsWith(POST_IMAGE_PREFIX),
          )
        : [];
      return {
        ...r,
        images: await resolvePostImages(r.images),
        image_refs: rawRefs,
        author_avatar: await resolveStoredMediaUrl(r.author_avatar),
        is_saved: viewerId ? savedSet.has(Number((r as any).id)) : false,
      };
    }),
  );
}

export async function listForums(userId?: number) {
  const params: Array<number> = [];
  let subscribedExpr = "false AS is_subscribed";
  if (userId) {
    params.push(userId);
    subscribedExpr = `EXISTS(SELECT 1 FROM forum_subscriptions fs WHERE fs.forum_id = f.id AND fs.user_id = $1) AS is_subscribed`;
  }
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.life_context, f.category,
       (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id AND p.is_hidden = FALSE) AS post_count,
       (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id) AS member_count,
       ${subscribedExpr}
     FROM forums f
     WHERE f.is_active = true
     ORDER BY f.sort_order`,
    params,
  );
  return rows;
}

export async function getForumBySlug(slug: string, userId?: number) {
  const params: Array<string | number> = [slug];
  let subscribedExpr = "false AS is_subscribed";
  if (userId) {
    params.push(userId);
    subscribedExpr = `EXISTS(SELECT 1 FROM forum_subscriptions fs WHERE fs.forum_id = f.id AND fs.user_id = $2) AS is_subscribed`;
  }
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.life_context, f.category,
       (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id AND p.is_hidden = FALSE) AS post_count,
       (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id) AS member_count,
       ${subscribedExpr}
     FROM forums f
     WHERE f.slug = $1 AND f.is_active = true`,
    params,
  );
  if (rows.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  return rows[0];
}

export async function getForumPosts(
  forumId: number,
  page: number = 1,
  limit: number = 20,
  userId?: number,
) {
  const offset = (page - 1) * limit;

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts WHERE forum_id = $1 AND is_hidden = FALSE`,
    [forumId],
  );
  const total = parseInt(countRows[0].total);

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $4) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.forum_id = $1 AND p.is_hidden = FALSE
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $2 OFFSET $3`,
    userId ? [forumId, limit, offset, userId] : [forumId, limit, offset],
  );

  const posts = await hydratePostsRows(rows, userId);
  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAllPosts(
  page: number = 1,
  limit: number = 20,
  userId?: number,
) {
  const offset = (page - 1) * limit;

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts WHERE is_hidden = FALSE`,
  );
  const total = parseInt(countRows[0].total);

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.is_hidden = FALSE
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $1 OFFSET $2`,
    userId ? [limit, offset, userId] : [limit, offset],
  );

  const posts = await hydratePostsRows(rows, userId);
  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createPost(
  userId: number,
  forumId: number,
  content: string,
  category?: string,
  title?: string,
  images?: unknown,
) {
  const trimmed = (content || "").trim();
  // Imagens: array de sentinels objstore://posts/<file>. Posts só com fotos
  // (sem texto) são permitidos — Reddit-style.
  let imageList: string[] = [];
  if (images !== undefined && images !== null) {
    if (!Array.isArray(images)) {
      throw new AppError("Imagens devem ser um array", "INVALID_IMAGES", 400);
    }
    if (images.length > POST_MAX_IMAGES) {
      throw new AppError(`Máximo de ${POST_MAX_IMAGES} imagens por post`, "TOO_MANY_IMAGES", 400);
    }
    for (const it of images) {
      if (typeof it !== "string" || !it.startsWith(POST_IMAGE_PREFIX)) {
        throw new AppError("Referência de imagem inválida", "INVALID_IMAGE_REF", 400);
      }
      imageList.push(it);
    }
  }

  if (trimmed.length === 0 && imageList.length === 0) {
    throw new AppError("Conteúdo do post é obrigatório", "EMPTY_CONTENT", 400);
  }
  if (trimmed.length > 5000) {
    throw new AppError("Conteúdo excede o limite de 5000 caracteres", "CONTENT_TOO_LONG", 400);
  }

  const { rows: forumCheck } = await query(
    `SELECT id FROM forums WHERE id = $1 AND is_active = true`,
    [forumId],
  );
  if (forumCheck.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }

  const { rows } = await query(
    `INSERT INTO posts (forum_id, user_id, title, content, category, images)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, forum_id, title, content, category, is_pinned, like_count, comment_count, share_count, created_at, images`,
    [forumId, userId, title || null, trimmed, category || null, JSON.stringify(imageList)],
  );

  const post = rows[0];
  const { rows: userRows } = await query(
    `SELECT name, avatar_url FROM users WHERE id = $1`,
    [userId],
  );
  const { rows: forumRows } = await query(
    `SELECT name, slug, icon FROM forums WHERE id = $1`,
    [forumId],
  );
  post.author_name = userRows[0]?.name || "Anônimo";
  post.author_id = userId;
  post.author_avatar = await resolveStoredMediaUrl(userRows[0]?.avatar_url);
  post.forum_name = forumRows[0]?.name;
  post.forum_slug = forumRows[0]?.slug;
  post.forum_icon = forumRows[0]?.icon;
  post.images = await resolvePostImages(post.images);
  post.user_liked = false;

  trackEvent(userId, "post_created", { post_id: post.id, forum_id: forumId, image_count: imageList.length });

  return post;
}

export async function getPostDetail(postId: number, userId?: number) {
  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.id = $1 AND p.is_hidden = FALSE`,
    userId ? [postId, userId] : [postId],
  );

  if (rows.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }

  const { rows: comments } = await query(
    `SELECT c.id, c.content, c.parent_id, c.like_count, c.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       ${userId ? `EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2) AS user_liked` : `false AS user_liked`}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1 AND c.is_hidden = FALSE
     ORDER BY c.created_at ASC`,
    userId ? [postId, userId] : [postId],
  );

  const hydratedComments = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      author_avatar: await resolveStoredMediaUrl(c.author_avatar),
    })),
  );

  const post = (await hydratePostsRows([rows[0]], userId))[0];
  return { ...post, comments: hydratedComments };
}

// Task #93 — autor edita; autor OU moderador+ pode esconder (soft delete).
export async function updatePost(
  postId: number,
  userId: number,
  patch: { content?: string; category?: string; title?: string; images?: unknown },
) {
  const { rows: existing } = await query(
    `SELECT id, user_id, forum_id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (existing.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  if (existing[0].user_id !== userId) {
    throw new AppError("Apenas o autor pode editar", "FORBIDDEN", 403);
  }

  // Task #93 — `forum_id` é IMUTÁVEL no PATCH (post não muda de comunidade).
  // Conteúdo, título, categoria e fotos podem ser editados.
  let nextContentTrimmed: string | null = null;
  if (patch.content !== undefined) {
    const trimmed = String(patch.content || "").trim();
    if (trimmed.length > 5000) {
      throw new AppError("Conteúdo excede 5000 caracteres", "CONTENT_TOO_LONG", 400);
    }
    nextContentTrimmed = trimmed;
  }

  // Defesa em profundidade: mesma allowlist de prefixo do create — só
  // sentinels objstore://posts/<file> são aceitos. Bloqueia URL externa,
  // vídeo (sentinels Bunny) e sentinels do CMS/DM.
  let imageList: string[] | null = null;
  if (patch.images !== undefined) {
    if (!Array.isArray(patch.images)) {
      throw new AppError("Imagens devem ser um array", "INVALID_IMAGES", 400);
    }
    if (patch.images.length > POST_MAX_IMAGES) {
      throw new AppError(`Máximo de ${POST_MAX_IMAGES} imagens por post`, "TOO_MANY_IMAGES", 400);
    }
    const buf: string[] = [];
    for (const it of patch.images) {
      if (typeof it !== "string" || !it.startsWith(POST_IMAGE_PREFIX)) {
        throw new AppError("Referência de imagem inválida", "INVALID_IMAGE_REF", 400);
      }
      buf.push(it);
    }
    imageList = buf;
  }

  // Post precisa continuar válido depois do PATCH: ou tem texto, ou tem
  // foto. Reusa a regra de criação (Reddit-style: foto sem texto OK).
  if (nextContentTrimmed !== null || imageList !== null) {
    const { rows: cur } = await query(
      `SELECT content, images FROM posts WHERE id = $1`,
      [postId],
    );
    const finalContent = nextContentTrimmed !== null ? nextContentTrimmed : (cur[0]?.content || "");
    const finalImages = imageList !== null
      ? imageList
      : (Array.isArray(cur[0]?.images) ? cur[0].images : []);
    if (finalContent.trim().length === 0 && finalImages.length === 0) {
      throw new AppError("Post precisa de texto ou ao menos uma foto", "EMPTY_CONTENT", 400);
    }
  }

  const sets: string[] = [];
  const params: any[] = [];
  if (nextContentTrimmed !== null) {
    params.push(nextContentTrimmed);
    sets.push(`content = $${params.length}`);
  }
  if (patch.category !== undefined) {
    params.push(patch.category || null);
    sets.push(`category = $${params.length}`);
  }
  if (patch.title !== undefined) {
    params.push(patch.title || null);
    sets.push(`title = $${params.length}`);
  }
  if (imageList !== null) {
    params.push(JSON.stringify(imageList));
    sets.push(`images = $${params.length}::jsonb`);
  }
  if (sets.length === 0) {
    return { post_id: postId, updated: false };
  }
  sets.push(`updated_at = NOW()`);
  params.push(postId);
  await query(`UPDATE posts SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
  trackEvent(userId, "post_edited", { post_id: postId });
  return { post_id: postId, updated: true };
}

export async function deletePost(
  postId: number,
  userId: number,
  isModeratorPlus: boolean,
) {
  const { rows: existing } = await query(
    `SELECT id, user_id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (existing.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  if (existing[0].user_id !== userId && !isModeratorPlus) {
    throw new AppError("Sem permissão", "FORBIDDEN", 403);
  }
  await query(`UPDATE posts SET is_hidden = TRUE, updated_at = NOW() WHERE id = $1`, [postId]);
  trackEvent(userId, "post_deleted", { post_id: postId, by_moderator: existing[0].user_id !== userId });
  return { post_id: postId, deleted: true };
}

// Task #93 — Salvar/Desalvar post (toggle). Idempotente.
export async function setPostSaved(postId: number, userId: number, saved: boolean) {
  const { rows: postCheck } = await query(
    `SELECT id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  if (saved) {
    await query(
      `INSERT INTO post_saves (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, postId],
    );
  } else {
    await query(`DELETE FROM post_saves WHERE user_id = $1 AND post_id = $2`, [userId, postId]);
  }
  return { post_id: postId, is_saved: saved };
}

export async function getUserSavedPosts(viewerId: number, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total
     FROM post_saves s
     JOIN posts p ON p.id = s.post_id
     WHERE s.user_id = $1 AND p.is_hidden = FALSE`,
    [viewerId],
  );
  const total = parseInt(countRows[0].total);

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS user_liked
     FROM post_saves s
     JOIN posts p ON p.id = s.post_id
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE s.user_id = $1 AND p.is_hidden = FALSE
     ORDER BY s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [viewerId, limit, offset],
  );
  const posts = await hydratePostsRows(rows, viewerId);
  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function togglePostLike(postId: number, userId: number) {
  const { rows: postCheck } = await query(
    `SELECT id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }

  const { rows: existing } = await query(
    `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId],
  );

  if (existing.length > 0) {
    const { rowCount } = await query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    if (rowCount && rowCount > 0) {
      await query(`UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [postId]);
    }
    return { liked: false };
  } else {
    const { rowCount } = await query(
      `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, userId],
    );
    if (rowCount && rowCount > 0) {
      await query(`UPDATE posts SET like_count = like_count + 1 WHERE id = $1`, [postId]);
    }
    return { liked: true };
  }
}

export async function addComment(postId: number, userId: number, content: string, parentId?: number) {
  if (!content || content.trim().length === 0) {
    throw new AppError("Conteúdo do comentário é obrigatório", "EMPTY_COMMENT", 400);
  }
  if (content.length > 2000) {
    throw new AppError("Comentário excede o limite de 2000 caracteres", "COMMENT_TOO_LONG", 400);
  }

  const { rows: postCheck } = await query(
    `SELECT id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }

  if (parentId) {
    const { rows: parentCheck } = await query(
      `SELECT id FROM comments WHERE id = $1 AND post_id = $2 AND is_hidden = FALSE`,
      [parentId, postId],
    );
    if (parentCheck.length === 0) {
      throw new AppError("Comentário pai não encontrado", "PARENT_NOT_FOUND", 404);
    }
  }

  const { rows } = await query(
    `INSERT INTO comments (post_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content, parent_id, like_count, created_at`,
    [postId, userId, content.trim(), parentId || null],
  );

  await query(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`, [postId]);

  const comment = rows[0];
  const { rows: userRows } = await query(
    `SELECT name, avatar_url FROM users WHERE id = $1`,
    [userId],
  );
  comment.author_name = userRows[0]?.name || "Anônimo";
  comment.author_id = userId;
  comment.author_avatar = await resolveStoredMediaUrl(userRows[0]?.avatar_url);
  comment.user_liked = false;

  trackEvent(userId, "comment_created", { post_id: postId, comment_id: comment.id });

  return comment;
}

export async function toggleCommentLike(commentId: number, userId: number) {
  const { rows: commentCheck } = await query(
    `SELECT id FROM comments WHERE id = $1 AND is_hidden = FALSE`,
    [commentId],
  );
  if (commentCheck.length === 0) {
    throw new AppError("Comentário não encontrado", "COMMENT_NOT_FOUND", 404);
  }

  const { rows: existing } = await query(
    `SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
    [commentId, userId],
  );

  if (existing.length > 0) {
    const { rowCount } = await query(`DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`, [commentId, userId]);
    if (rowCount && rowCount > 0) {
      await query(`UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [commentId]);
    }
    return { liked: false };
  } else {
    const { rowCount } = await query(
      `INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [commentId, userId],
    );
    if (rowCount && rowCount > 0) {
      await query(`UPDATE comments SET like_count = like_count + 1 WHERE id = $1`, [commentId]);
    }
    return { liked: true };
  }
}

// ───── Subscriptions / Comunidades ─────

// Task #92 — resolve forumId a partir de slug pra suportar endpoints
// `/forums/by-slug/:slug/subscribe` (URL canônica do Reddit-style).
export async function getForumIdBySlug(slug: string): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM forums WHERE slug = $1 AND is_active = true`,
    [slug],
  );
  if (rows.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  return rows[0].id;
}

// Task #92 — comunidades às quais o usuário autenticado é inscrito.
// Usado no `GET /api/community/forums/me` (sidebar/menu/perfil).
export async function getMySubscribedForums(userId: number) {
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.category,
       (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id)::int AS member_count
     FROM forum_subscriptions fs
     JOIN forums f ON f.id = fs.forum_id
     WHERE fs.user_id = $1 AND f.is_active = true
     ORDER BY f.name ASC`,
    [userId],
  );
  return { forums: rows };
}

// Task #92 — "Em alta" da comunidade nas últimas 48h. Score simples
// `likes + comments` (peso igual). Usado tanto pelo endpoint global
// quanto pela vista por comunidade (forumId opcional).
export async function getTrendingPosts(opts: {
  forumId?: number;
  limit?: number;
  userId?: number;
}) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const params: unknown[] = [limit];
  let forumWhere = "";
  if (opts.forumId) {
    params.push(opts.forumId);
    forumWhere = `AND p.forum_id = $${params.length}`;
  }
  let userExpr = "false AS user_liked";
  if (opts.userId) {
    params.push(opts.userId);
    userExpr = `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${params.length}) AS user_liked`;
  }
  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       (p.like_count + p.comment_count) AS trending_score,
       ${userExpr}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.is_hidden = FALSE
       AND p.created_at >= NOW() - INTERVAL '48 hours'
       ${forumWhere}
     ORDER BY trending_score DESC, p.created_at DESC
     LIMIT $1`,
    params,
  );
  const posts = await hydratePostsRows(rows, opts.userId);
  return { posts };
}

export async function setForumSubscription(forumId: number, userId: number, subscribed: boolean) {
  const { rows: forumCheck } = await query(
    `SELECT id FROM forums WHERE id = $1 AND is_active = true`,
    [forumId],
  );
  if (forumCheck.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  if (subscribed) {
    await query(
      `INSERT INTO forum_subscriptions (forum_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [forumId, userId],
    );
  } else {
    await query(
      `DELETE FROM forum_subscriptions WHERE forum_id = $1 AND user_id = $2`,
      [forumId, userId],
    );
  }
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS member_count FROM forum_subscriptions WHERE forum_id = $1`,
    [forumId],
  );
  return { subscribed, member_count: countRows[0]?.member_count ?? 0 };
}

// ───── Perfil público (Reddit-style) ─────

export async function getUserPosts(targetUserId: number, viewerId?: number, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts WHERE user_id = $1 AND is_hidden = FALSE`,
    [targetUserId],
  );
  const total = parseInt(countRows[0].total);

  const params: Array<number> = [targetUserId, limit, offset];
  let likedExpr = "false AS user_liked";
  if (viewerId) {
    params.push(viewerId);
    likedExpr = `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $4) AS user_liked`;
  }

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       ${likedExpr}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.user_id = $1 AND p.is_hidden = FALSE
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    params,
  );

  const posts = await hydratePostsRows(rows, viewerId);
  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserComments(targetUserId: number, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM comments WHERE user_id = $1 AND is_hidden = FALSE`,
    [targetUserId],
  );
  const total = parseInt(countRows[0].total);

  const { rows } = await query(
    `SELECT c.id, c.post_id, c.content, c.like_count, c.created_at,
       p.title AS post_title, p.content AS post_excerpt,
       f.name AS forum_name, f.slug AS forum_slug
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     JOIN forums f ON f.id = p.forum_id
     WHERE c.user_id = $1 AND c.is_hidden = FALSE AND p.is_hidden = FALSE
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    [targetUserId, limit, offset],
  );

  return { comments: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getUserCommunities(targetUserId: number) {
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.category,
       (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id) AS member_count
     FROM forum_subscriptions fs
     JOIN forums f ON f.id = fs.forum_id
     WHERE fs.user_id = $1 AND f.is_active = true
     ORDER BY fs.created_at DESC`,
    [targetUserId],
  );
  return { communities: rows };
}

export async function getUserKarma(targetUserId: number) {
  const { rows } = await query(
    `SELECT
       COALESCE((SELECT SUM(like_count) FROM posts    WHERE user_id = $1 AND is_hidden = FALSE), 0)::int AS post_karma,
       COALESCE((SELECT SUM(like_count) FROM comments WHERE user_id = $1 AND is_hidden = FALSE), 0)::int AS comment_karma,
       (SELECT COUNT(*) FROM posts    WHERE user_id = $1 AND is_hidden = FALSE)::int AS post_count,
       (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_hidden = FALSE)::int AS comment_count`,
    [targetUserId],
  );
  return rows[0];
}
