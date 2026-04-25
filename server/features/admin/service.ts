import { query } from "../../db/index.js";
import type { UserRole } from "../auth/service.js";

export class AdminError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

const VALID_ROLES: UserRole[] = ["client", "producer", "moderator", "admin"];

export interface OverviewStats {
  users: {
    total: number;
    premium: number;
    by_role: Record<UserRole, number>;
    new_last_7d: number;
  };
  content: {
    courses: number;
    lessons: number;
  };
  community: {
    posts_total: number;
    posts_hidden: number;
    comments_total: number;
    comments_hidden: number;
    posts_last_7d: number;
  };
  sessions: {
    active: number;
  };
  generated_at: string;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [
    usersTotal,
    usersPremium,
    usersByRole,
    usersNew7d,
    coursesTotal,
    lessonsTotal,
    postsTotal,
    postsHidden,
    commentsTotal,
    commentsHidden,
    postsNew7d,
    sessionsActive,
  ] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users WHERE is_premium = TRUE`),
    query<{ role: string; count: string }>(
      `SELECT role, COUNT(*)::text AS count FROM users GROUP BY role`,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`,
    ),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM courses`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM course_lessons`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM posts`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM posts WHERE is_hidden = TRUE`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM comments`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM comments WHERE is_hidden = TRUE`),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM posts WHERE created_at >= NOW() - INTERVAL '7 days'`,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM sessions WHERE expires_at > NOW()`,
    ),
  ]);

  const byRole: Record<UserRole, number> = {
    client: 0,
    producer: 0,
    moderator: 0,
    admin: 0,
  };
  for (const row of usersByRole.rows) {
    if ((VALID_ROLES as string[]).includes(row.role)) {
      byRole[row.role as UserRole] = parseInt(row.count, 10);
    }
  }

  return {
    users: {
      total: parseInt(usersTotal.rows[0].count, 10),
      premium: parseInt(usersPremium.rows[0].count, 10),
      by_role: byRole,
      new_last_7d: parseInt(usersNew7d.rows[0].count, 10),
    },
    content: {
      courses: parseInt(coursesTotal.rows[0].count, 10),
      lessons: parseInt(lessonsTotal.rows[0].count, 10),
    },
    community: {
      posts_total: parseInt(postsTotal.rows[0].count, 10),
      posts_hidden: parseInt(postsHidden.rows[0].count, 10),
      comments_total: parseInt(commentsTotal.rows[0].count, 10),
      comments_hidden: parseInt(commentsHidden.rows[0].count, 10),
      posts_last_7d: parseInt(postsNew7d.rows[0].count, 10),
    },
    sessions: {
      active: parseInt(sessionsActive.rows[0].count, 10),
    },
    generated_at: new Date().toISOString(),
  };
}

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_premium: boolean;
  segments: string[];
  level: number;
  created_at: string;
  last_active_at: string | null;
}

export interface ListUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | "all";
  segment?: string | "all";
  premium?: "all" | "yes" | "no";
}

export async function listUsers(filters: ListUsersFilters = {}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(filters.limit || 20, 100));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search && filters.search.trim().length > 0) {
    params.push(`%${filters.search.trim().toLowerCase()}%`);
    where.push(`(LOWER(email) LIKE $${params.length} OR LOWER(name) LIKE $${params.length})`);
  }
  if (filters.role && filters.role !== "all" && (VALID_ROLES as string[]).includes(filters.role)) {
    params.push(filters.role);
    where.push(`role = $${params.length}`);
  }
  if (filters.segment && filters.segment !== "all") {
    params.push(filters.segment);
    where.push(`$${params.length} = ANY(segments)`);
  }
  if (filters.premium === "yes") {
    where.push(`is_premium = TRUE`);
  } else if (filters.premium === "no") {
    where.push(`is_premium = FALSE`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users ${whereSql}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...params, limit, offset];
  const { rows } = await query<AdminUserRow>(
    `SELECT id, email, name, role, is_premium, segments, level, created_at, last_active_at
     FROM users
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams,
  );

  return {
    users: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function updateUserRole(
  targetUserId: number,
  newRole: UserRole,
  actorUserId: number,
): Promise<AdminUserRow> {
  if (!(VALID_ROLES as string[]).includes(newRole)) {
    throw new AdminError("Papel inválido", "INVALID_ROLE", 400);
  }
  if (targetUserId === actorUserId && newRole !== "admin") {
    throw new AdminError(
      "Você não pode rebaixar seu próprio papel de administrador",
      "CANNOT_DEMOTE_SELF",
      400,
    );
  }

  const { rows } = await query<AdminUserRow>(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, name, role, is_premium, segments, level, created_at, last_active_at`,
    [newRole, targetUserId],
  );

  if (rows.length === 0) {
    throw new AdminError("Usuário não encontrado", "USER_NOT_FOUND", 404);
  }

  return rows[0];
}

export interface ModerationPostRow {
  id: number;
  forum_id: number;
  forum_name: string;
  title: string | null;
  content: string;
  author_id: number;
  author_name: string;
  is_hidden: boolean;
  hidden_at: string | null;
  hidden_by: number | null;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface ModerationCommentRow {
  id: number;
  post_id: number;
  post_title: string | null;
  content: string;
  author_id: number;
  author_name: string;
  is_hidden: boolean;
  hidden_at: string | null;
  hidden_by: number | null;
  like_count: number;
  created_at: string;
}

export async function listModerationPosts(
  status: "all" | "visible" | "hidden" = "all",
  page = 1,
  limit = 20,
) {
  const where: string[] = [];
  if (status === "visible") where.push(`p.is_hidden = FALSE`);
  if (status === "hidden") where.push(`p.is_hidden = TRUE`);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const offset = (page - 1) * limit;
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM posts p ${whereSql}`,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query<ModerationPostRow>(
    `SELECT p.id, p.forum_id, f.name AS forum_name, p.title, p.content,
            p.user_id AS author_id, u.name AS author_name,
            p.is_hidden, p.hidden_at, p.hidden_by,
            p.like_count, p.comment_count, p.created_at
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     ${whereSql}
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return { posts: rows, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export async function listModerationComments(
  status: "all" | "visible" | "hidden" = "all",
  page = 1,
  limit = 20,
) {
  const where: string[] = [];
  if (status === "visible") where.push(`c.is_hidden = FALSE`);
  if (status === "hidden") where.push(`c.is_hidden = TRUE`);
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const offset = (page - 1) * limit;
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM comments c ${whereSql}`,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query<ModerationCommentRow>(
    `SELECT c.id, c.post_id, p.title AS post_title, c.content,
            c.user_id AS author_id, u.name AS author_name,
            c.is_hidden, c.hidden_at, c.hidden_by,
            c.like_count, c.created_at
     FROM comments c
     JOIN users u ON u.id = c.user_id
     JOIN posts p ON p.id = c.post_id
     ${whereSql}
     ORDER BY c.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return { comments: rows, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

export async function setPostHidden(
  postId: number,
  hidden: boolean,
  moderatorId: number,
): Promise<void> {
  const { rowCount } = await query(
    hidden
      ? `UPDATE posts SET is_hidden = TRUE, hidden_at = NOW(), hidden_by = $2 WHERE id = $1`
      : `UPDATE posts SET is_hidden = FALSE, hidden_at = NULL, hidden_by = NULL WHERE id = $1`,
    hidden ? [postId, moderatorId] : [postId],
  );
  if (!rowCount || rowCount === 0) {
    throw new AdminError("Post não encontrado", "POST_NOT_FOUND", 404);
  }
}

export async function setCommentHidden(
  commentId: number,
  hidden: boolean,
  moderatorId: number,
): Promise<void> {
  const { rowCount } = await query(
    hidden
      ? `UPDATE comments SET is_hidden = TRUE, hidden_at = NOW(), hidden_by = $2 WHERE id = $1`
      : `UPDATE comments SET is_hidden = FALSE, hidden_at = NULL, hidden_by = NULL WHERE id = $1`,
    hidden ? [commentId, moderatorId] : [commentId],
  );
  if (!rowCount || rowCount === 0) {
    throw new AdminError("Comentário não encontrado", "COMMENT_NOT_FOUND", 404);
  }
}
