import { query, getClient } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { trackEvent } from "../analytics/service.js";
import { resolveStoredMediaUrl } from "../../lib/objectStorageBridge.js";
import { createNotification } from "../notifications/service.js";

const POST_IMAGE_PREFIX = "objstore://posts/";
const POST_MAX_IMAGES = 4;

// Task #122 — set fechado de reações multi-emoji. Validado nos endpoints
// de POST /reactions; qualquer emoji fora dessa lista vira 400. Mantemos
// o set pequeno (6) pra UI caber sem scroll horizontal e a tabela não
// virar bag de strings arbitrárias.
export const ALLOWED_REACTION_EMOJIS = ["❤️", "😂", "🙏", "💡", "🔥", "👏"] as const;
export type ReactionEmoji = (typeof ALLOWED_REACTION_EMOJIS)[number];
const REACTION_SET = new Set<string>(ALLOWED_REACTION_EMOJIS);

function assertValidReactionEmoji(emoji: unknown): asserts emoji is ReactionEmoji {
  if (typeof emoji !== "string" || !REACTION_SET.has(emoji)) {
    throw new AppError(
      "Emoji de reação inválido",
      "INVALID_REACTION_EMOJI",
      400,
    );
  }
}

// Agrega reações de um conjunto de posts/comentários numa única query.
// Retorna mapa id → { emoji → count }. Eficiente pra listagens.
async function aggregateReactions(
  table: "post_reactions" | "comment_reactions",
  fk: "post_id" | "comment_id",
  ids: number[],
): Promise<Map<number, Array<{ emoji: string; count: number }>>> {
  const out = new Map<number, Array<{ emoji: string; count: number }>>();
  if (ids.length === 0) return out;
  const { rows } = await query<{ tid: number; emoji: string; cnt: number }>(
    `SELECT ${fk} AS tid, emoji, COUNT(*)::int AS cnt
       FROM ${table}
      WHERE ${fk} = ANY($1::int[])
      GROUP BY ${fk}, emoji
      ORDER BY cnt DESC, emoji ASC`,
    [ids],
  );
  for (const r of rows) {
    const arr = out.get(r.tid) || [];
    arr.push({ emoji: r.emoji, count: r.cnt });
    out.set(r.tid, arr);
  }
  return out;
}

async function userReactionsFor(
  table: "post_reactions" | "comment_reactions",
  fk: "post_id" | "comment_id",
  ids: number[],
  userId: number | undefined,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (!userId || ids.length === 0) return out;
  const { rows } = await query<{ tid: number; emoji: string }>(
    `SELECT ${fk} AS tid, emoji FROM ${table}
      WHERE user_id = $1 AND ${fk} = ANY($2::int[])`,
    [userId, ids],
  );
  for (const r of rows) out.set(r.tid, r.emoji);
  return out;
}

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
  const ids = rows.map((r) => Number((r as any).id)).filter((n) => Number.isFinite(n));
  if (viewerId && rows.length > 0 && ids.length > 0) {
    const { rows: savedRows } = await query(
      `SELECT post_id FROM post_saves WHERE user_id = $1 AND post_id = ANY($2::int[])`,
      [viewerId, ids],
    );
    savedSet = new Set(savedRows.map((r) => Number(r.post_id)));
  }
  // Task #122 — agregação de reações multi-emoji em batch (evita N+1).
  const reactionsMap = await aggregateReactions("post_reactions", "post_id", ids);
  const userReactionMap = await userReactionsFor("post_reactions", "post_id", ids, viewerId);
  // Task #198 — flag pro frontend mostrar ações de moderação per-community
  // sem precisar de role global. Hidratamos em batch via DISTINCT forum_id.
  let modForumSet: Set<number> = new Set();
  if (viewerId && rows.length > 0) {
    const forumIds = Array.from(
      new Set(rows.map((r) => Number((r as any).forum_id)).filter((n) => Number.isFinite(n))),
    );
    if (forumIds.length > 0) {
      const { rows: modRows } = await query<{ forum_id: number }>(
        `SELECT forum_id FROM forum_moderators WHERE user_id = $1 AND forum_id = ANY($2::int[])`,
        [viewerId, forumIds],
      );
      modForumSet = new Set(modRows.map((r) => Number(r.forum_id)));
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
      const pid = Number((r as any).id);
      return {
        ...r,
        images: await resolvePostImages(r.images),
        image_refs: rawRefs,
        author_avatar: await resolveStoredMediaUrl(r.author_avatar),
        is_saved: viewerId ? savedSet.has(pid) : false,
        reactions: reactionsMap.get(pid) || [],
        user_reaction: userReactionMap.get(pid) || null,
        viewer_can_moderate: viewerId
          ? modForumSet.has(Number((r as any).forum_id))
          : false,
      };
    }),
  );
}

export async function listForums(userId?: number) {
  const params: Array<number> = [];
  let subscribedExpr = "false AS is_subscribed";
  let isModExpr = "false AS is_moderator";
  if (userId) {
    params.push(userId);
    subscribedExpr = `EXISTS(SELECT 1 FROM forum_subscriptions fs WHERE fs.forum_id = f.id AND fs.user_id = $1) AS is_subscribed`;
    isModExpr = `EXISTS(SELECT 1 FROM forum_moderators fm WHERE fm.forum_id = f.id AND fm.user_id = $1) AS is_moderator`;
  }
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.life_context, f.category,
       f.cover_url, f.is_official, f.created_by, f.created_at,
       (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id AND p.is_hidden = FALSE) AS post_count,
       (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id) AS member_count,
       ${subscribedExpr},
       ${isModExpr}
     FROM forums f
     WHERE f.is_active = true
     ORDER BY f.sort_order`,
    params,
  );
  // Cover_url precisa virar URL real (sentinels objstore:// → signed URL).
  for (const r of rows) {
    if (r.cover_url) r.cover_url = await resolveStoredMediaUrl(r.cover_url);
  }
  return rows;
}

export async function getForumBySlug(slug: string, userId?: number) {
  const params: Array<string | number> = [slug];
  let subscribedExpr = "false AS is_subscribed";
  let isModExpr = "false AS is_moderator";
  if (userId) {
    params.push(userId);
    subscribedExpr = `EXISTS(SELECT 1 FROM forum_subscriptions fs WHERE fs.forum_id = f.id AND fs.user_id = $2) AS is_subscribed`;
    isModExpr = `EXISTS(SELECT 1 FROM forum_moderators fm WHERE fm.forum_id = f.id AND fm.user_id = $2) AS is_moderator`;
  }
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.life_context, f.category,
       f.cover_url, f.rules, f.is_official, f.created_by, f.created_at,
       creator.name AS created_by_name,
       (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id AND p.is_hidden = FALSE) AS post_count,
       (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id) AS member_count,
       ${subscribedExpr},
       ${isModExpr}
     FROM forums f
     LEFT JOIN users creator ON creator.id = f.created_by
     WHERE f.slug = $1 AND f.is_active = true`,
    params,
  );
  if (rows.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  const forum = rows[0];
  if (forum.cover_url) forum.cover_url = await resolveStoredMediaUrl(forum.cover_url);
  // Hidrata moderadores per-community (lista compacta — nome+avatar).
  forum.moderators = await getForumModerators(forum.id);
  return forum;
}

// Task #198 — moderadores per-community (list compacto pra header e Sobre).
export async function getForumModerators(forumId: number) {
  const { rows } = await query<{ user_id: number; name: string; avatar_url: string | null; created_at: string }>(
    `SELECT u.id AS user_id, u.name, u.avatar_url, fm.created_at
       FROM forum_moderators fm
       JOIN users u ON u.id = fm.user_id
      WHERE fm.forum_id = $1
      ORDER BY fm.created_at ASC`,
    [forumId],
  );
  const out = [];
  for (const r of rows) {
    out.push({
      user_id: r.user_id,
      name: r.name,
      avatar_url: await resolveStoredMediaUrl(r.avatar_url),
      created_at: r.created_at,
    });
  }
  return out;
}

// Task #198 — paridade de moderação per-community em hide/unhide. Ao invés de
// duplicar UPDATE+mod_actions, autorizamos aqui (mod local OU role global)
// e delegamos ao helper canônico do admin que já mantém hidden_at/hidden_by.
// `setPostHidden`/`setCommentHidden` ficam re-importados via dynamic import
// pra evitar ciclo (admin/service também usa community helpers em outros pontos).
export async function setPostHiddenWithAuth(
  postId: number,
  hidden: boolean,
  userId: number,
  isModeratorPlus: boolean,
): Promise<void> {
  const { rows } = await query<{ forum_id: number }>(
    `SELECT forum_id FROM posts WHERE id = $1`,
    [postId],
  );
  if (rows.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  const allowed = isModeratorPlus || (await isForumModerator(rows[0].forum_id, userId));
  if (!allowed) {
    throw new AppError("Sem permissão", "FORBIDDEN", 403);
  }
  const { setPostHidden } = await import("../admin/service.js");
  await setPostHidden(postId, hidden, userId);
  await query(
    `INSERT INTO mod_actions (actor_id, target_kind, target_id, action, reason)
     VALUES ($1, 'post', $2, $3, NULL)`,
    [userId, postId, hidden ? "post_hidden" : "post_restored"],
  );
}

export async function setCommentHiddenWithAuth(
  commentId: number,
  hidden: boolean,
  userId: number,
  isModeratorPlus: boolean,
): Promise<void> {
  const { rows } = await query<{ forum_id: number }>(
    `SELECT p.forum_id FROM comments c JOIN posts p ON p.id = c.post_id WHERE c.id = $1`,
    [commentId],
  );
  if (rows.length === 0) {
    throw new AppError("Comentário não encontrado", "COMMENT_NOT_FOUND", 404);
  }
  const allowed = isModeratorPlus || (await isForumModerator(rows[0].forum_id, userId));
  if (!allowed) {
    throw new AppError("Sem permissão", "FORBIDDEN", 403);
  }
  const { setCommentHidden } = await import("../admin/service.js");
  await setCommentHidden(commentId, hidden, userId);
  await query(
    `INSERT INTO mod_actions (actor_id, target_kind, target_id, action, reason)
     VALUES ($1, 'comment', $2, $3, NULL)`,
    [userId, commentId, hidden ? "comment_hidden" : "comment_restored"],
  );
}

// Task #198 — true se user é moderador específico desta comunidade.
// NÃO checa role global; combine com hasRole no caller para o bypass admin/mod.
export async function isForumModerator(forumId: number, userId: number): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM forum_moderators WHERE forum_id = $1 AND user_id = $2) AS exists`,
    [forumId, userId],
  );
  return !!rows[0]?.exists;
}

export type ForumPostOrder = "recent" | "trending" | "most_commented";

export async function getForumPosts(
  forumId: number,
  page: number = 1,
  limit: number = 20,
  userId?: number,
  order: ForumPostOrder = "recent",
) {
  const offset = (page - 1) * limit;

  // Task #99 — feed por fórum NUNCA expõe posts de turma (class_id NOT NULL).
  // Task #202 — `trending` restringe a janela de 48h (engajamento recente).
  const trendingWindow = order === "trending"
    ? ` AND p.created_at > NOW() - INTERVAL '48 hours'`
    : "";

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts p
       WHERE p.forum_id = $1 AND p.is_hidden = FALSE AND p.class_id IS NULL${trendingWindow}`,
    [forumId],
  );
  const total = parseInt(countRows[0].total);

  // Sort: pin sempre acima; depois critério escolhido.
  let orderSql: string;
  switch (order) {
    case "trending":
      orderSql = "p.is_pinned DESC, (p.like_count + p.comment_count) DESC, p.created_at DESC";
      break;
    case "most_commented":
      orderSql = "p.is_pinned DESC, p.comment_count DESC, p.created_at DESC";
      break;
    default:
      orderSql = "p.is_pinned DESC, p.created_at DESC";
  }

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $4) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.forum_id = $1 AND p.is_hidden = FALSE AND p.class_id IS NULL${trendingWindow}
     ORDER BY ${orderSql}
     LIMIT $2 OFFSET $3`,
    userId ? [forumId, limit, offset, userId] : [forumId, limit, offset],
  );

  const posts = await hydratePostsRows(rows, userId);
  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// Task #202 — lista paginada de membros de uma comunidade. Inclui flag
// `is_moderator` per-row (LEFT JOIN forum_moderators) pra UI mostrar badge.
export async function listForumMembers(
  forumId: number,
  page: number = 1,
  limit: number = 30,
) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const offset = (page - 1) * safeLimit;

  // Task #202 — gate por is_active: comunidades soft-deletadas não devem
  // expor lista de membros. Se o forum não existe ou está inativo,
  // retornamos lista vazia (404 fica a cargo do caller via slug lookup).
  const { rows: forumRows } = await query<{ id: number }>(
    `SELECT id FROM forums WHERE id = $1 AND is_active = true`,
    [forumId],
  );
  if (forumRows.length === 0) {
    return { members: [], total: 0, page: 1, limit: safeLimit, totalPages: 0 };
  }

  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM forum_subscriptions WHERE forum_id = $1`,
    [forumId],
  );
  const total = parseInt(countRows[0].total, 10) || 0;

  const { rows } = await query<{
    user_id: number;
    name: string;
    avatar_url: string | null;
    joined_at: string;
    is_moderator: boolean;
  }>(
    `SELECT u.id AS user_id, u.name, u.avatar_url,
       fs.created_at AS joined_at,
       (fm.user_id IS NOT NULL) AS is_moderator
       FROM forum_subscriptions fs
       JOIN users u ON u.id = fs.user_id
       LEFT JOIN forum_moderators fm
         ON fm.forum_id = fs.forum_id AND fm.user_id = fs.user_id
      WHERE fs.forum_id = $1
      ORDER BY (fm.user_id IS NOT NULL) DESC, fs.created_at ASC
      LIMIT $2 OFFSET $3`,
    [forumId, safeLimit, offset],
  );

  const members = [];
  for (const r of rows) {
    members.push({
      user_id: r.user_id,
      name: r.name,
      avatar_url: await resolveStoredMediaUrl(r.avatar_url),
      joined_at: r.joined_at,
      is_moderator: !!r.is_moderator,
    });
  }
  return { members, total, page, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
}

export async function getAllPosts(
  page: number = 1,
  limit: number = 20,
  userId?: number,
  classId?: number,
  // Task #197 — quando true E userId presente, restringe o feed aos
  // posts de fóruns que o usuário assina (`forum_subscriptions`).
  // Anônimo passando subscribedOnly cai pra "todos" (UI esconde o
  // toggle, então a chamada nunca deveria sair do client; defesa em
  // profundidade pra não quebrar callers existentes).
  subscribedOnly?: boolean,
) {
  // Task #99 — quando o caller pede classId, AUTORIZAÇÃO já foi feita no
  // router (requireAuth + matrícula OU moderator+). Aqui é apenas o filtro.
  const offset = (page - 1) * limit;

  // Monta WHERE dinamicamente. Mesmos filtros são aplicados no COUNT
  // pra que `total` reflita o escopo solicitado (paginação correta).
  const filterParams: unknown[] = [];
  const filterConds: string[] = ["p.is_hidden = FALSE"];

  if (classId) {
    filterParams.push(classId);
    filterConds.push(`p.class_id = $${filterParams.length}`);
  } else {
    // Sem classId, mostra SOMENTE posts globais (class_id IS NULL) pra
    // não vazar conteúdo de turma no feed público da Comunidade.
    filterConds.push(`p.class_id IS NULL`);
  }

  if (subscribedOnly && userId) {
    filterParams.push(userId);
    filterConds.push(
      `p.forum_id IN (SELECT forum_id FROM forum_subscriptions WHERE user_id = $${filterParams.length})`,
    );
  }

  const whereSql = filterConds.join(" AND ");

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts p WHERE ${whereSql}`,
    filterParams,
  );
  const total = parseInt(countRows[0].total);

  // SELECT params: filtros + limit + offset + (opcional) userId pra user_liked.
  const selectParams: unknown[] = [...filterParams, limit, offset];
  const limitIdx = filterParams.length + 1;
  const offsetIdx = filterParams.length + 2;

  let userLikedExpr = "false AS user_liked";
  if (userId) {
    selectParams.push(userId);
    userLikedExpr = `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${selectParams.length}) AS user_liked`;
  }

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.class_id, p.title, p.content, p.category, p.is_pinned, p.images,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id, u.avatar_url AS author_avatar,
       f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon,
       ${userLikedExpr}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE ${whereSql}
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    selectParams,
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
  classId?: number | null,
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

  // Task #99 — quando classId vem, validar matrícula (defesa em profundidade;
  // o router já checa, mas service garante invariância).
  let resolvedClassId: number | null = null;
  if (classId !== undefined && classId !== null) {
    const cid = Number(classId);
    if (!Number.isFinite(cid) || cid < 1) {
      throw new AppError("ID de turma inválido", "INVALID_CLASS_ID", 400);
    }
    const { rows: m } = await query(
      `SELECT 1 FROM user_course_progress WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
      [userId, cid],
    );
    if (m.length === 0) {
      // Task #99 — moderator/admin override: equipe pode publicar em qualquer
      // turma pra ações de moderação/curadoria, sem precisar matricular.
      const { rows: r } = await query(`SELECT role FROM users WHERE id = $1`, [userId]);
      const role = r[0]?.role;
      if (role !== "moderator" && role !== "admin") {
        throw new AppError("Apenas membros da turma podem publicar nela", "NOT_A_MEMBER", 403);
      }
    }
    resolvedClassId = cid;
  }

  const { rows } = await query(
    `INSERT INTO posts (forum_id, user_id, title, content, category, images, class_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING id, forum_id, class_id, title, content, category, is_pinned, like_count, comment_count, share_count, created_at, images`,
    [forumId, userId, title || null, trimmed, category || null, JSON.stringify(imageList), resolvedClassId],
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

  // Task #102 — fan-out de notificação para membros matriculados quando o
  // post é escopado em uma turma (class_id). Best-effort: falhas no sino
  // NÃO devem reverter a criação do post.
  if (resolvedClassId) {
    void notifyClassMembersOfNewPost(resolvedClassId, post.id, userId, post.author_name, trimmed)
      .catch((err) =>
        // eslint-disable-next-line no-console
        console.error(
          `[Community] notifyClassMembersOfNewPost failed: ${err instanceof Error ? err.message : err}`,
        ),
      );
  }

  return post;
}

// Task #102 — Cria UMA notificação para cada membro matriculado da turma
// (exceto o autor). Usa um único INSERT batched via SELECT para escalar
// bem com turmas grandes; depois publica eventos SSE individuais para
// que o sino atualize em tempo real para quem estiver online.
async function notifyClassMembersOfNewPost(
  classId: number,
  postId: number,
  authorId: number,
  authorName: string,
  contentSnippet: string,
): Promise<void> {
  const { rows: courseRows } = await query<{ title: string }>(
    `SELECT title FROM courses WHERE id = $1`,
    [classId],
  );
  const courseTitle = courseRows[0]?.title || "sua turma";
  const snippet = (contentSnippet || "").trim().slice(0, 140);
  const body = snippet
    ? `${authorName}: "${snippet}${contentSnippet.length > 140 ? "…" : ""}"`
    : `${authorName} publicou em ${courseTitle}.`;
  // Deep-link inclui post_id pra que o sino abra exatamente o post alvo
  // dentro da aba Comunidade da turma. NotificationBell faz o parse do
  // padrão `/turmas/:classId/post/:postId` e estaciona ambos os ids em
  // sessionStorage; TurmaCommunityTab consome `rayo-pending-post` ao
  // carregar a lista pra rolar/destacar o post correspondente.
  const link = `/turmas/${classId}/post/${postId}`;
  const payload = {
    course_id: classId,
    course_title: courseTitle,
    post_id: postId,
    author_id: authorId,
    author_name: authorName,
  };

  // Recipientes: todos os matriculados menos o autor. Inserir + recolher
  // ids para publicar eventos SSE com a mesma payload do INSERT.
  const { rows: notifRows } = await query<{ id: number; user_id: number }>(
    `INSERT INTO notifications (user_id, kind, title, body, link, payload)
     SELECT ucp.user_id, 'class_post', $2, $3, $4, $5::jsonb
       FROM user_course_progress ucp
      WHERE ucp.course_id = $1
        AND ucp.user_id <> $6
     RETURNING id, user_id`,
    [
      classId,
      `Novo post em ${courseTitle}`,
      body,
      link,
      JSON.stringify(payload),
      authorId,
    ],
  );

  if (notifRows.length === 0) return;

  // Publica os eventos SSE em paralelo (notificação nova + badge).
  const { publishToUser } = await import("../messages/events.js");
  const { getUnreadCount } = await import("../notifications/service.js");
  const baseNotif = {
    kind: "class_post" as const,
    title: `Novo post em ${courseTitle}`,
    body,
    link,
    payload,
    read_at: null,
    created_at: new Date().toISOString(),
  };
  for (const r of notifRows) {
    publishToUser(r.user_id, "notification:new", { ...baseNotif, id: r.id });
    void getUnreadCount(r.user_id)
      .then((unread) => publishToUser(r.user_id, "notification:unread", { unread }))
      .catch(() => {
        /* best-effort */
      });
  }
}

export async function getPostDetail(postId: number, userId?: number) {
  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.class_id, p.title, p.content, p.category, p.is_pinned, p.images,
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

  // Task #99/#130 — post de turma exige (a) trilha paga liberada, depois
  // (b) matrícula (ou moderator+). Sem o trail gate, links diretos pra
  // posts de turma paga abriam pra quem cancelou mas continuou matriculado.
  const classId = rows[0].class_id;
  if (classId) {
    if (!userId) {
      throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
    }
    const { rows: r } = await query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const role = r[0]?.role;
    const isModeratorPlus = role === "moderator" || role === "admin";
    if (!isModeratorPlus) {
      // (a) trail gate
      const { rows: tr } = await query<{ trail_id: number; slug: string }>(
        `SELECT t.id AS trail_id, t.slug
           FROM trail_courses tc
           JOIN trails t ON t.id = tc.trail_id
          WHERE tc.course_id = $1 AND t.active = TRUE
          LIMIT 1`,
        [classId],
      );
      if (tr.length > 0) {
        const trailId = tr[0].trail_id;
        const { rows: sub } = await query<{ exists: boolean }>(
          `SELECT EXISTS(
             SELECT 1 FROM subscriptions
              WHERE user_id = $1 AND trail_id = $2
                AND status = ANY(ARRAY['active','trialing','past_due']::text[])
           ) AS exists`,
          [userId, trailId],
        );
        if (!sub[0]?.exists) {
          // Erro semântico de paywall — frontend renderiza <TrailPaywall>.
          const err = new AppError(
            "Esta publicação faz parte de uma trilha paga. Assine para acessar.",
            "TRAIL_PAYMENT_REQUIRED",
            402,
          );
          (err as unknown as { trail_id: number; trail_slug: string; class_id: number }).trail_id = trailId;
          (err as unknown as { trail_id: number; trail_slug: string; class_id: number }).trail_slug = tr[0].slug;
          (err as unknown as { trail_id: number; trail_slug: string; class_id: number }).class_id = classId;
          throw err;
        }
      }
      // (b) matrícula — 404 pra não vazar
      const { rows: m } = await query(
        `SELECT 1 FROM user_course_progress WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
        [userId, classId],
      );
      if (m.length === 0) {
        throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
      }
    }
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

  // Task #122 — hidrata reações multi-emoji em batch também nos comentários.
  const commentIds = comments.map((c) => Number(c.id)).filter((n) => Number.isFinite(n));
  const cReactionsMap = await aggregateReactions("comment_reactions", "comment_id", commentIds);
  const cUserReactionMap = await userReactionsFor("comment_reactions", "comment_id", commentIds, userId);
  const hydratedComments = await Promise.all(
    comments.map(async (c) => {
      const cid = Number(c.id);
      return {
        ...c,
        author_avatar: await resolveStoredMediaUrl(c.author_avatar),
        reactions: cReactionsMap.get(cid) || [],
        user_reaction: cUserReactionMap.get(cid) || null,
      };
    }),
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
  reason?: string | null,
) {
  const { rows: existing } = await query(
    `SELECT p.id, p.user_id, p.title, p.content, p.forum_id,
            f.slug AS forum_slug, f.name AS forum_name
     FROM posts p
     JOIN forums f ON f.id = p.forum_id
     WHERE p.id = $1 AND p.is_hidden = FALSE`,
    [postId],
  );
  if (existing.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  const post = existing[0];
  const isAuthor = post.user_id === userId;
  // Task #198 — moderador local também pode remover. Role global continua
  // como override (`isModeratorPlus`); per-community modera só este forum.
  const isLocalMod = !isAuthor && !isModeratorPlus
    ? await isForumModerator(post.forum_id, userId)
    : false;
  const canModerate = isModeratorPlus || isLocalMod;
  if (!isAuthor && !canModerate) {
    throw new AppError("Sem permissão", "FORBIDDEN", 403);
  }

  // Task #94 — quando moderador (não autor) remove, soft delete + insert
  // em mod_actions rodam na MESMA transação pra evitar estado parcial
  // (post escondido sem registro de auditoria). Auto-exclusão do autor
  // continua silenciosa (sem entrada de auditoria/notificação). Mod local
  // (Task #198) registra mod_actions exatamente igual a mod global.
  const trimmedReason = typeof reason === "string" ? reason.trim().slice(0, 2000) : null;
  if (isAuthor) {
    await query(`UPDATE posts SET is_hidden = TRUE, updated_at = NOW() WHERE id = $1`, [postId]);
  } else {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE posts SET is_hidden = TRUE, updated_at = NOW() WHERE id = $1`,
        [postId],
      );
      await client.query(
        `INSERT INTO mod_actions (actor_id, target_kind, target_id, action, reason)
         VALUES ($1, 'post', $2, 'post_deleted', $3)`,
        [userId, postId, trimmedReason || null],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    // Notificação fica fora da transação: é melhor-esforço (falha no
    // bell não deve reverter a moderação). Se cair, fica logado pra
    // diagnóstico mas o autor não é avisado nesse caso de borda.
    try {
      const snippet = String(post.title || post.content || "").trim().slice(0, 80);
      await createNotification({
        userId: post.user_id,
        kind: "post_moderated",
        title: "Seu post foi removido pela moderação",
        body: trimmedReason
          ? `Motivo: ${trimmedReason}`
          : (snippet ? `Post removido: "${snippet}"` : "Um moderador removeu seu post."),
        link: post.forum_slug ? `/c/${post.forum_slug}` : null,
        payload: {
          post_id: postId,
          forum_slug: post.forum_slug,
          forum_name: post.forum_name,
          reason: trimmedReason || null,
          actor_id: userId,
        },
      });
    } catch (err) {
      console.error("[community] failed to notify author of moderated post", err);
    }
  }

  trackEvent(userId, "post_deleted", { post_id: postId, by_moderator: !isAuthor });
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

// Task #99/#130 — invariante de turma: like/comment/reaction em post com
// class_id setado exige (a) trilha paga liberada (se houver) e (b) matrícula
// (ou moderator+). Sem o trail gate, usuários que cancelaram a assinatura
// mas continuaram matriculados ainda interagiam com a comunidade paga.
async function assertCanInteractWithClassPost(classId: number | null | undefined, userId: number): Promise<void> {
  if (!classId) return;
  // Moderator+ bypass tudo.
  const { rows: r } = await query(`SELECT role FROM users WHERE id = $1`, [userId]);
  const role = r[0]?.role;
  if (role === "moderator" || role === "admin") return;
  // (a) Trail gate: se essa turma é parte de trilha paga, exige assinatura ativa.
  const { rows: tr } = await query<{ trail_id: number; slug: string }>(
    `SELECT t.id AS trail_id, t.slug
       FROM trail_courses tc
       JOIN trails t ON t.id = tc.trail_id
      WHERE tc.course_id = $1 AND t.active = TRUE
      LIMIT 1`,
    [classId],
  );
  if (tr.length > 0) {
    const trailId = tr[0].trail_id;
    const { rows: sub } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM subscriptions
          WHERE user_id = $1 AND trail_id = $2
            AND status = ANY(ARRAY['active','trialing','past_due']::text[])
       ) AS exists`,
      [userId, trailId],
    );
    if (!sub[0]?.exists) {
      const err = new AppError(
        "Esta interação faz parte de uma trilha paga. Assine para participar.",
        "TRAIL_PAYMENT_REQUIRED",
        402,
      );
      (err as unknown as { trail_id: number; trail_slug: string; class_id: number }).trail_id = trailId;
      (err as unknown as { trail_id: number; trail_slug: string; class_id: number }).trail_slug = tr[0].slug;
      (err as unknown as { trail_id: number; trail_slug: string; class_id: number }).class_id = classId;
      throw err;
    }
  }
  // (b) Matrícula — 404 pra não vazar.
  const { rows: m } = await query(
    `SELECT 1 FROM user_course_progress WHERE user_id = $1 AND course_id = $2 LIMIT 1`,
    [userId, classId],
  );
  if (m.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
}

// Task #122 — toggle multi-emoji.
//   • Sem reação atual + emoji novo  → INSERT, like_count += 1
//   • Reação igual ao emoji enviado  → DELETE (toggle off), like_count -= 1
//   • Reação diferente               → UPDATE emoji, like_count inalterado
// like_count agora reflete o TOTAL de reações (qualquer emoji),
// preservando o significado de engajamento usado em trending/karma.
// Mantemos post_likes legado em sincronia (INSERT/DELETE espelhando o
// flag user_liked) pra não quebrar consultas/joins ainda não migrados.
export async function togglePostReaction(
  postId: number,
  userId: number,
  emoji: string,
) {
  assertValidReactionEmoji(emoji);
  const { rows: postCheck } = await query(
    `SELECT id, class_id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  await assertCanInteractWithClassPost(postCheck[0].class_id, userId);

  const { rows: existing } = await query<{ emoji: string }>(
    `SELECT emoji FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
    [postId, userId],
  );

  let userReaction: string | null = null;
  if (existing.length === 0) {
    await query(
      `INSERT INTO post_reactions (post_id, user_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji`,
      [postId, userId, emoji],
    );
    await query(`UPDATE posts SET like_count = like_count + 1 WHERE id = $1`, [postId]);
    await query(
      `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, userId],
    );
    userReaction = emoji;
  } else if (existing[0].emoji === emoji) {
    await query(`DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    await query(`UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [postId]);
    await query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    userReaction = null;
  } else {
    await query(
      `UPDATE post_reactions SET emoji = $3 WHERE post_id = $1 AND user_id = $2`,
      [postId, userId, emoji],
    );
    userReaction = emoji;
  }

  const reactionsMap = await aggregateReactions("post_reactions", "post_id", [postId]);
  return {
    user_reaction: userReaction,
    reactions: reactionsMap.get(postId) || [],
  };
}

export async function toggleCommentReaction(
  commentId: number,
  userId: number,
  emoji: string,
) {
  assertValidReactionEmoji(emoji);
  const { rows: commentCheck } = await query<{ post_id: number }>(
    `SELECT post_id FROM comments WHERE id = $1 AND is_hidden = FALSE`,
    [commentId],
  );
  if (commentCheck.length === 0) {
    throw new AppError("Comentário não encontrado", "COMMENT_NOT_FOUND", 404);
  }
  // Mesma autorização de turma do post pai (defesa em profundidade).
  const { rows: parentRows } = await query<{ class_id: number | null }>(
    `SELECT class_id FROM posts WHERE id = $1`,
    [commentCheck[0].post_id],
  );
  await assertCanInteractWithClassPost(parentRows[0]?.class_id ?? null, userId);

  const { rows: existing } = await query<{ emoji: string }>(
    `SELECT emoji FROM comment_reactions WHERE comment_id = $1 AND user_id = $2`,
    [commentId, userId],
  );

  let userReaction: string | null = null;
  if (existing.length === 0) {
    await query(
      `INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT (comment_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji`,
      [commentId, userId, emoji],
    );
    await query(`UPDATE comments SET like_count = like_count + 1 WHERE id = $1`, [commentId]);
    await query(
      `INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [commentId, userId],
    );
    userReaction = emoji;
  } else if (existing[0].emoji === emoji) {
    await query(`DELETE FROM comment_reactions WHERE comment_id = $1 AND user_id = $2`, [commentId, userId]);
    await query(`UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`, [commentId]);
    await query(`DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`, [commentId, userId]);
    userReaction = null;
  } else {
    await query(
      `UPDATE comment_reactions SET emoji = $3 WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId, emoji],
    );
    userReaction = emoji;
  }

  const reactionsMap = await aggregateReactions("comment_reactions", "comment_id", [commentId]);
  return {
    user_reaction: userReaction,
    reactions: reactionsMap.get(commentId) || [],
  };
}

// Aliases legados — `/like` agora é equivalente a reagir com ❤️ (o emoji
// padrão). Devolvem `{liked}` mantendo o contrato antigo do frontend
// até a migração completa pro endpoint /reactions.
export async function togglePostLike(postId: number, userId: number) {
  const r = await togglePostReaction(postId, userId, "❤️");
  return { liked: r.user_reaction === "❤️" };
}

export async function addComment(postId: number, userId: number, content: string, parentId?: number) {
  if (!content || content.trim().length === 0) {
    throw new AppError("Conteúdo do comentário é obrigatório", "EMPTY_COMMENT", 400);
  }
  if (content.length > 2000) {
    throw new AppError("Comentário excede o limite de 2000 caracteres", "COMMENT_TOO_LONG", 400);
  }

  const { rows: postCheck } = await query(
    `SELECT id, class_id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId],
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
  // Task #99 — comentar em post de turma exige matrícula (ou moderator+).
  await assertCanInteractWithClassPost(postCheck[0].class_id, userId);

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
  const r = await toggleCommentReaction(commentId, userId, "❤️");
  return { liked: r.user_reaction === "❤️" };
}

// ───── Task #198 — CRUD de comunidades (CMS + criação por usuário) ─────

const FORUM_NAME_MAX = 80;
const FORUM_DESC_MAX = 500;
const FORUM_RULES_MAX = 5000;
const FORUM_SLUG_RE = /^[a-z0-9-]+$/;

function slugify(input: string, fallback: string): string {
  const base = (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || fallback;
}

// Slugs reservados — colidem com sub-rotas técnicas em /api/community/forums.
// Manter sincronizado com routes.ts (`cover-staging`, `me`, `by-slug`).
const RESERVED_FORUM_SLUGS = new Set<string>(["cover-staging", "me", "by-slug"]);

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = RESERVED_FORUM_SLUGS.has(base) ? `${base}-c` : base;
  let suffix = 2;
  // Probe até achar livre. Sem TOCTOU bonito (sem advisory lock), mas o
  // INSERT subsequente cobre via UNIQUE INDEX (try/catch no caller).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await query(`SELECT 1 FROM forums WHERE slug = $1`, [candidate]);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 50) {
      throw new AppError("Não foi possível gerar slug único", "SLUG_GENERATION_FAILED", 500);
    }
  }
}

interface ForumInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
  life_context?: string | null;
  cover_url?: string | null;
  rules?: string | null;
  is_official?: boolean;
  is_active?: boolean;
  slug?: string;
}

function validateForumPatch(patch: ForumInput, isCreate: boolean): void {
  if (isCreate || patch.name !== undefined) {
    const name = String(patch.name || "").trim();
    if (!name) throw new AppError("Nome é obrigatório", "NAME_REQUIRED", 400);
    if (name.length > FORUM_NAME_MAX) {
      throw new AppError(`Nome excede ${FORUM_NAME_MAX} caracteres`, "NAME_TOO_LONG", 400);
    }
    patch.name = name;
  }
  if (patch.description !== undefined && patch.description !== null) {
    const d = String(patch.description).trim();
    if (d.length > FORUM_DESC_MAX) {
      throw new AppError(`Descrição excede ${FORUM_DESC_MAX} caracteres`, "DESC_TOO_LONG", 400);
    }
    patch.description = d || null;
  }
  if (patch.rules !== undefined && patch.rules !== null) {
    const r = String(patch.rules).trim();
    if (r.length > FORUM_RULES_MAX) {
      throw new AppError(`Regras excedem ${FORUM_RULES_MAX} caracteres`, "RULES_TOO_LONG", 400);
    }
    patch.rules = r || null;
  }
  if (isCreate) {
    // Task #198 — categoria é obrigatória na criação por usuário e admin
    // (validator: "category required by task form").
    const cat = String(patch.category || "").trim();
    if (!cat) throw new AppError("Categoria é obrigatória", "CATEGORY_REQUIRED", 400);
    if (cat.length > 60) {
      throw new AppError("Categoria excede 60 caracteres", "CATEGORY_TOO_LONG", 400);
    }
    patch.category = cat;
  } else if (patch.category !== undefined && patch.category !== null) {
    const cat = String(patch.category).trim();
    if (cat.length > 60) {
      throw new AppError("Categoria excede 60 caracteres", "CATEGORY_TOO_LONG", 400);
    }
    patch.category = cat || null;
  }
  if (patch.cover_url !== undefined && patch.cover_url !== null) {
    const c = String(patch.cover_url).trim();
    // Aceita só sentinels de object storage (defesa em profundidade contra
    // injeção de URL externa). String vazia → null.
    if (c && !c.startsWith("objstore://forums/")) {
      throw new AppError("Capa inválida", "INVALID_COVER", 400);
    }
    patch.cover_url = c || null;
  }
  // Capa é obrigatória APENAS na criação (paridade com a UI). Edição
  // continua podendo remover a capa pra voltar ao fallback gradiente.
  if (isCreate && !patch.cover_url) {
    throw new AppError("Capa é obrigatória", "COVER_REQUIRED", 400);
  }
  if (patch.slug !== undefined) {
    const s = String(patch.slug || "").trim().toLowerCase();
    if (!FORUM_SLUG_RE.test(s) || s.length < 2 || s.length > 60) {
      throw new AppError("Slug inválido (use a-z, 0-9 e -, 2 a 60 chars)", "INVALID_SLUG", 400);
    }
    patch.slug = s;
  }
}

// Task #198 — gating: usuário precisa ter e-mail verificado pra criar
// comunidade (mesma regra anti-spam usada em outras ações públicas).
// Usa email_verification_codes (LOWER(email) match) como fonte da
// verdade — registerUser insere uma linha verified=TRUE só quando o
// código bate. Helpfully tolerante: se a tabela não existir ainda
// (cenário de teste mínimo), retorna false silenciosamente.
export async function isUserEmailVerified(userId: number): Promise<boolean> {
  try {
    const { rows } = await query<{ ok: boolean }>(
      `SELECT EXISTS(
         SELECT 1
           FROM email_verification_codes ev
           JOIN users u ON LOWER(u.email) = LOWER(ev.email)
          WHERE u.id = $1 AND ev.verified = TRUE
       ) AS ok`,
      [userId],
    );
    return !!rows[0]?.ok;
  } catch {
    return false;
  }
}

// Versão pública: usuário cria a própria comunidade. created_by = userId,
// is_official=false. Criador vira moderador local + subscriber em uma
// transação (estado consistente; sem janela "comunidade existe sem dono").
// Requer e-mail verificado (anti-spam) — Task #198.
export async function createForumByUser(userId: number, input: ForumInput) {
  if (!(await isUserEmailVerified(userId))) {
    throw new AppError(
      "Confirme seu e-mail antes de criar uma comunidade.",
      "EMAIL_NOT_VERIFIED",
      403,
    );
  }
  validateForumPatch(input, true);
  const slug = input.slug
    ? await ensureUniqueSlug(input.slug)
    : await ensureUniqueSlug(slugify(input.name || "", `c-${Date.now()}`));
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number }>(
      // Explicit is_official=FALSE (default da coluna é TRUE pra
      // backfill — não pode contar com o default aqui).
      `INSERT INTO forums (name, slug, description, icon, category, life_context, rules, cover_url,
                           created_by, is_official, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, TRUE,
               COALESCE((SELECT MAX(sort_order)+1 FROM forums), 1))
       RETURNING id`,
      [
        input.name,
        slug,
        input.description || null,
        input.icon || "💬",
        input.category || null,
        input.life_context || null,
        input.rules || null,
        input.cover_url || null,
        userId,
      ],
    );
    const forumId = rows[0].id;
    await client.query(
      `INSERT INTO forum_subscriptions (forum_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [forumId, userId],
    );
    await client.query(
      `INSERT INTO forum_moderators (forum_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [forumId, userId],
    );
    await client.query("COMMIT");
    trackEvent(userId, "community_created", { forum_id: forumId, slug });
    return await getForumBySlug(slug, userId);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    // UNIQUE violation no slug (race) → erro semântico claro.
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique/i.test(msg) && /slug/i.test(msg)) {
      throw new AppError("Este nome/slug já existe", "SLUG_TAKEN", 409);
    }
    throw err;
  } finally {
    client.release();
  }
}

// Variante admin: pode definir is_official, slug livre, sort_order, life_context.
// Não vincula criador como moderador (admin pode promover depois).
export async function adminCreateForum(adminId: number, input: ForumInput) {
  validateForumPatch(input, true);
  const slug = input.slug
    ? await ensureUniqueSlug(input.slug)
    : await ensureUniqueSlug(slugify(input.name || "", `c-${Date.now()}`));
  try {
    const { rows } = await query<{ id: number }>(
      `INSERT INTO forums (name, slug, description, icon, category, life_context, rules, cover_url,
                           created_by, is_official, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE,
               COALESCE((SELECT MAX(sort_order)+1 FROM forums), 1))
       RETURNING id`,
      [
        input.name,
        slug,
        input.description || null,
        input.icon || "💬",
        input.category || null,
        input.life_context || null,
        input.rules || null,
        input.cover_url || null,
        adminId,
        input.is_official === true,
      ],
    );
    trackEvent(adminId, "community_created_admin", { forum_id: rows[0].id, slug });
    return await getForumBySlug(slug);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique/i.test(msg) && /slug/i.test(msg)) {
      throw new AppError("Slug já existe", "SLUG_TAKEN", 409);
    }
    throw err;
  }
}

// Task #198/#199 — autorização do edit de METADATA da comunidade.
// Permitido pra: CRIADOR, ADMIN global, MODERATOR+ global, OU
// moderador local (forum_moderators). Campos sensíveis (slug,
// is_official, is_active, sort_order) continuam restritos à rota
// admin elevada em /api/admin/community/forums/:id — a rota pública
// faz uma allowlist no body antes de chamar updateForum.
export async function authorizeForumMetadataEdit(
  idOrSlug: number | string,
  userId: number,
  isAdminOrModeratorGlobal: boolean,
): Promise<number> {
  const where = typeof idOrSlug === "number" ? "id = $1" : "slug = $1";
  const { rows } = await query<{ id: number; created_by: number | null }>(
    `SELECT id, created_by FROM forums WHERE ${where}`,
    [idOrSlug],
  );
  if (rows.length === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  const { id, created_by } = rows[0];
  if (isAdminOrModeratorGlobal) return id;
  if (created_by === userId) return id;
  if (await isForumModerator(id, userId)) return id;
  throw new AppError("Sem permissão", "FORBIDDEN", 403);
}

// Update genérico (admin OU mod local — caller checa autorização).
// Campos editáveis: name, description, icon, category, life_context,
// cover_url, rules, is_official, is_active, slug.
export async function updateForum(forumId: number, patch: ForumInput) {
  validateForumPatch(patch, false);
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    params.push(value);
    sets.push(`${sql} = $${params.length}`);
  };
  if (patch.name !== undefined) push("name", patch.name);
  if (patch.description !== undefined) push("description", patch.description);
  if (patch.icon !== undefined) push("icon", patch.icon || null);
  if (patch.category !== undefined) push("category", patch.category || null);
  if (patch.life_context !== undefined) push("life_context", patch.life_context || null);
  if (patch.rules !== undefined) push("rules", patch.rules);
  if (patch.cover_url !== undefined) push("cover_url", patch.cover_url);
  if (patch.is_official !== undefined) push("is_official", patch.is_official === true);
  if (patch.is_active !== undefined) push("is_active", patch.is_active !== false);
  if (patch.slug !== undefined) push("slug", patch.slug);
  if (sets.length === 0) {
    throw new AppError("Nada para atualizar", "EMPTY_PATCH", 400);
  }
  params.push(forumId);
  try {
    const { rowCount } = await query(
      `UPDATE forums SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params,
    );
    if (rowCount === 0) {
      throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique/i.test(msg) && /slug/i.test(msg)) {
      throw new AppError("Slug já existe", "SLUG_TAKEN", 409);
    }
    throw err;
  }
  return { forum_id: forumId, updated: true };
}

// Soft "delete" via is_active=false. Posts ficam intactos (gating no listForums).
export async function setForumActive(forumId: number, active: boolean) {
  const { rowCount } = await query(
    `UPDATE forums SET is_active = $1 WHERE id = $2`,
    [active, forumId],
  );
  if (rowCount === 0) {
    throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  }
  return { forum_id: forumId, is_active: active };
}

// Lista pra admin (inclui inativas + criador). Task #198: aceita busca
// por nome/slug e paginação simples (default 30/pág). Total devolvido
// pra o frontend renderizar contador + paginação.
export async function listAdminForums(opts?: {
  search?: string | null;
  page?: number;
  limit?: number;
}) {
  const search = (opts?.search ?? "").trim();
  const page = Math.max(1, Math.floor(opts?.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(opts?.limit ?? 30)));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(f.name ILIKE $${params.length} OR f.slug ILIKE $${params.length})`);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const { rows: cnt } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM forums f ${whereSql}`,
    params,
  );
  const total = parseInt(cnt[0]?.total ?? "0", 10);

  const dataParams = [...params, limit, offset];
  const { rows } = await query(
    `SELECT f.id, f.name, f.slug, f.description, f.icon, f.category, f.life_context,
            f.cover_url, f.rules, f.is_official, f.is_active, f.created_by, f.created_at,
            f.sort_order,
            u.name AS created_by_name,
            (SELECT COUNT(*) FROM forum_subscriptions fs WHERE fs.forum_id = f.id) AS member_count,
            (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id AND p.is_hidden = FALSE) AS post_count,
            (SELECT COUNT(*) FROM forum_moderators fm WHERE fm.forum_id = f.id) AS moderator_count
       FROM forums f
       LEFT JOIN users u ON u.id = f.created_by
       ${whereSql}
       ORDER BY f.is_active DESC, f.sort_order ASC, f.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams,
  );
  for (const r of rows) {
    if (r.cover_url) r.cover_url = await resolveStoredMediaUrl(r.cover_url);
  }
  return { forums: rows, total, page, limit };
}

export async function addForumModerator(forumId: number, userId: number, addedBy: number) {
  const { rows: f } = await query(`SELECT id FROM forums WHERE id = $1`, [forumId]);
  if (f.length === 0) throw new AppError("Comunidade não encontrada", "FORUM_NOT_FOUND", 404);
  const { rows: u } = await query(`SELECT id FROM users WHERE id = $1`, [userId]);
  if (u.length === 0) throw new AppError("Usuário não encontrado", "USER_NOT_FOUND", 404);
  await query(
    `INSERT INTO forum_moderators (forum_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [forumId, userId],
  );
  trackEvent(addedBy, "forum_moderator_added", { forum_id: forumId, user_id: userId });
  return { forum_id: forumId, user_id: userId, added: true };
}

export async function removeForumModerator(forumId: number, userId: number, removedBy: number) {
  const { rowCount } = await query(
    `DELETE FROM forum_moderators WHERE forum_id = $1 AND user_id = $2`,
    [forumId, userId],
  );
  trackEvent(removedBy, "forum_moderator_removed", { forum_id: forumId, user_id: userId });
  return { forum_id: forumId, user_id: userId, removed: (rowCount ?? 0) > 0 };
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
  // Task #99 — perfis públicos NÃO exibem posts de turma (class_id NOT NULL).
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts WHERE user_id = $1 AND is_hidden = FALSE AND class_id IS NULL`,
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
     WHERE p.user_id = $1 AND p.is_hidden = FALSE AND p.class_id IS NULL
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

// Task #193 — Busca tabbed da Comunidade (estilo Reddit). Cobre 5 escopos
// no MESMO endpoint pra evitar 5 round-trips do client; cada chamada vem
// com `tab` específico + page. Modo `counts=true` devolve só os totais
// dos 5 tabs em UMA query consolidada (pra desenhar os contadores nas
// tabs). ILIKE puro (sem trigram) pra manter migração zero — datasets
// ainda pequenos. Posts/Comentários respeitam `class_id IS NULL` (não
// vazar conteúdo de turma paga). `q` < 2 chars = empty result.
export type CommunitySearchTab =
  | "posts"
  | "comunidades"
  | "comentarios"
  | "midia"
  | "perfis";

const SEARCH_PER_PAGE = 20;

function buildLike(qRaw: string): string | null {
  const q = (qRaw || "").trim();
  if (q.length < 2) return null;
  return `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

export async function getCommunitySearchCounts(
  qRaw: string,
): Promise<Record<CommunitySearchTab, number>> {
  const empty: Record<CommunitySearchTab, number> = {
    posts: 0, comunidades: 0, comentarios: 0, midia: 0, perfis: 0,
  };
  const like = buildLike(qRaw);
  if (!like) return empty;
  const [posts, comunidades, comentarios, midia, perfis] = await Promise.all([
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM posts
        WHERE is_hidden = FALSE AND class_id IS NULL
          AND (title ILIKE $1 OR content ILIKE $1)`,
      [like],
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM forums
        WHERE is_active = TRUE
          AND (name ILIKE $1 OR description ILIKE $1 OR slug ILIKE $1)`,
      [like],
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM comments c
         JOIN posts p ON p.id = c.post_id
        WHERE c.is_hidden = FALSE AND p.is_hidden = FALSE AND p.class_id IS NULL
          AND c.content ILIKE $1`,
      [like],
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM posts
        WHERE is_hidden = FALSE AND class_id IS NULL
          AND jsonb_typeof(images) = 'array' AND jsonb_array_length(images) > 0
          AND (title ILIKE $1 OR content ILIKE $1)`,
      [like],
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users
        WHERE name ILIKE $1 OR COALESCE(bio, '') ILIKE $1`,
      [like],
    ),
  ]);
  return {
    posts: posts.rows[0]?.n ?? 0,
    comunidades: comunidades.rows[0]?.n ?? 0,
    comentarios: comentarios.rows[0]?.n ?? 0,
    midia: midia.rows[0]?.n ?? 0,
    perfis: perfis.rows[0]?.n ?? 0,
  };
}

export async function searchCommunity(
  qRaw: string,
  tab: CommunitySearchTab,
  page: number,
  viewerId?: number,
): Promise<{
  tab: CommunitySearchTab;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: any[];
}> {
  const like = buildLike(qRaw);
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const limit = SEARCH_PER_PAGE;
  const offset = (safePage - 1) * limit;
  const empty = { tab, page: safePage, limit, total: 0, totalPages: 0, items: [] };
  if (!like) return empty;

  if (tab === "posts" || tab === "midia") {
    const mediaWhere = tab === "midia"
      ? `AND jsonb_typeof(p.images) = 'array' AND jsonb_array_length(p.images) > 0`
      : "";
    const { rows: countRows } = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM posts p
        WHERE p.is_hidden = FALSE AND p.class_id IS NULL
          ${mediaWhere}
          AND (p.title ILIKE $1 OR p.content ILIKE $1)`,
      [like],
    );
    const total = countRows[0]?.n ?? 0;
    const params: unknown[] = [like, limit, offset];
    let likedExpr = "false AS user_liked";
    if (viewerId) {
      params.push(viewerId);
      likedExpr = `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${params.length}) AS user_liked`;
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
       WHERE p.is_hidden = FALSE AND p.class_id IS NULL
         ${mediaWhere}
         AND (p.title ILIKE $1 OR p.content ILIKE $1)
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      params,
    );
    const items = await hydratePostsRows(rows, viewerId);
    return { tab, page: safePage, limit, total, totalPages: Math.ceil(total / limit), items };
  }

  if (tab === "comunidades") {
    const { rows: countRows } = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM forums
        WHERE is_active = TRUE
          AND (name ILIKE $1 OR description ILIKE $1 OR slug ILIKE $1)`,
      [like],
    );
    const total = countRows[0]?.n ?? 0;
    const params: unknown[] = [like, limit, offset];
    let subscribedExpr = "false AS is_subscribed";
    if (viewerId) {
      params.push(viewerId);
      subscribedExpr = `EXISTS(SELECT 1 FROM forum_subscriptions fs WHERE fs.forum_id = f.id AND fs.user_id = $${params.length}) AS is_subscribed`;
    }
    const { rows } = await query(
      `SELECT f.id, f.name, f.slug, f.description, f.icon, f.category, f.life_context,
         (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id AND p.is_hidden = FALSE AND p.class_id IS NULL)::int AS post_count,
         (SELECT COUNT(*) FROM forum_subscriptions fs2 WHERE fs2.forum_id = f.id)::int AS member_count,
         ${subscribedExpr}
       FROM forums f
       WHERE f.is_active = TRUE
         AND (f.name ILIKE $1 OR f.description ILIKE $1 OR f.slug ILIKE $1)
       ORDER BY (CASE WHEN f.name ILIKE $1 THEN 0 ELSE 1 END), member_count DESC, f.name ASC
       LIMIT $2 OFFSET $3`,
      params,
    );
    return { tab, page: safePage, limit, total, totalPages: Math.ceil(total / limit), items: rows };
  }

  if (tab === "comentarios") {
    const { rows: countRows } = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM comments c
         JOIN posts p ON p.id = c.post_id
        WHERE c.is_hidden = FALSE AND p.is_hidden = FALSE AND p.class_id IS NULL
          AND c.content ILIKE $1`,
      [like],
    );
    const total = countRows[0]?.n ?? 0;
    const { rows } = await query(
      `SELECT c.id, c.post_id, c.content, c.like_count, c.created_at,
         u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
         p.title AS post_title, p.content AS post_excerpt,
         f.name AS forum_name, f.slug AS forum_slug, f.icon AS forum_icon
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN posts  p ON p.id = c.post_id
       JOIN forums f ON f.id = p.forum_id
       WHERE c.is_hidden = FALSE AND p.is_hidden = FALSE AND p.class_id IS NULL
         AND c.content ILIKE $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [like, limit, offset],
    );
    const items = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        author_avatar: await resolveStoredMediaUrl(r.author_avatar),
      })),
    );
    return { tab, page: safePage, limit, total, totalPages: Math.ceil(total / limit), items };
  }

  if (tab === "perfis") {
    const { rows: countRows } = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users
        WHERE name ILIKE $1 OR COALESCE(bio, '') ILIKE $1`,
      [like],
    );
    const total = countRows[0]?.n ?? 0;
    const { rows } = await query(
      `SELECT u.id, u.name, u.avatar_url, u.bio, u.role,
         (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND is_hidden = FALSE AND class_id IS NULL)::int AS post_count
       FROM users u
       WHERE u.name ILIKE $1 OR COALESCE(u.bio, '') ILIKE $1
       ORDER BY (CASE WHEN u.name ILIKE $1 THEN 0 ELSE 1 END), u.name ASC
       LIMIT $2 OFFSET $3`,
      [like, limit, offset],
    );
    const items = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        avatar_url: await resolveStoredMediaUrl(r.avatar_url),
      })),
    );
    return { tab, page: safePage, limit, total, totalPages: Math.ceil(total / limit), items };
  }

  return empty;
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
