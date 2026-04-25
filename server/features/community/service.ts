import { query } from "../../db/index.js";
import { AppError } from "../academia/service.js";
import { trackEvent } from "../analytics/service.js";

export async function listForums() {
  const { rows } = await query(
    `SELECT f.id, f.name, f.description, f.icon, f.life_context, f.category,
       (SELECT COUNT(*) FROM posts p WHERE p.forum_id = f.id) AS post_count
     FROM forums f
     WHERE f.is_active = true
     ORDER BY f.sort_order`
  );
  return rows;
}

export async function getForumPosts(
  forumId: number,
  page: number = 1,
  limit: number = 20,
  userId?: number
) {
  const offset = (page - 1) * limit;

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts WHERE forum_id = $1 AND is_hidden = FALSE`,
    [forumId]
  );
  const total = parseInt(countRows[0].total);

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $4) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.forum_id = $1 AND p.is_hidden = FALSE
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $2 OFFSET $3`,
    userId ? [forumId, limit, offset, userId] : [forumId, limit, offset]
  );

  return { posts: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAllPosts(
  page: number = 1,
  limit: number = 20,
  userId?: number
) {
  const offset = (page - 1) * limit;

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM posts WHERE is_hidden = FALSE`
  );
  const total = parseInt(countRows[0].total);

  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id,
       f.name AS forum_name,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.is_hidden = FALSE
     ORDER BY p.is_pinned DESC, p.created_at DESC
     LIMIT $1 OFFSET $2`,
    userId ? [limit, offset, userId] : [limit, offset]
  );

  return { posts: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function createPost(
  userId: number,
  forumId: number,
  content: string,
  category?: string,
  title?: string
) {
  if (!content || content.trim().length === 0) {
    throw new AppError("Conteúdo do post é obrigatório", "EMPTY_CONTENT", 400);
  }
  if (content.length > 5000) {
    throw new AppError("Conteúdo excede o limite de 5000 caracteres", "CONTENT_TOO_LONG", 400);
  }

  const { rows: forumCheck } = await query(
    `SELECT id FROM forums WHERE id = $1 AND is_active = true`,
    [forumId]
  );
  if (forumCheck.length === 0) {
    throw new AppError("Fórum não encontrado", "FORUM_NOT_FOUND", 404);
  }

  const { rows } = await query(
    `INSERT INTO posts (forum_id, user_id, title, content, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, forum_id, title, content, category, is_pinned, like_count, comment_count, share_count, created_at`,
    [forumId, userId, title || null, content.trim(), category || null]
  );

  const post = rows[0];
  const { rows: userRows } = await query(`SELECT name FROM users WHERE id = $1`, [userId]);
  post.author_name = userRows[0]?.name || "Anônimo";
  post.author_id = userId;
  post.user_liked = false;

  trackEvent(userId, "post_created", { post_id: post.id, forum_id: forumId });

  return post;
}

export async function getPostDetail(postId: number, userId?: number) {
  const { rows } = await query(
    `SELECT p.id, p.forum_id, p.title, p.content, p.category, p.is_pinned,
       p.like_count, p.comment_count, p.share_count, p.created_at,
       u.name AS author_name, u.id AS author_id,
       f.name AS forum_name,
       ${userId ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS user_liked` : `false AS user_liked`}
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE p.id = $1 AND p.is_hidden = FALSE`,
    userId ? [postId, userId] : [postId]
  );

  if (rows.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }

  const { rows: comments } = await query(
    `SELECT c.id, c.content, c.parent_id, c.like_count, c.created_at,
       u.name AS author_name, u.id AS author_id,
       ${userId ? `EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2) AS user_liked` : `false AS user_liked`}
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1 AND c.is_hidden = FALSE
     ORDER BY c.created_at ASC`,
    userId ? [postId, userId] : [postId]
  );

  return { ...rows[0], comments };
}

export async function togglePostLike(postId: number, userId: number) {
  const { rows: postCheck } = await query(
    `SELECT id FROM posts WHERE id = $1 AND is_hidden = FALSE`,
    [postId]
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }

  const { rows: existing } = await query(
    `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
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
      [postId, userId]
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
    [postId]
  );
  if (postCheck.length === 0) {
    throw new AppError("Post não encontrado", "POST_NOT_FOUND", 404);
  }

  if (parentId) {
    const { rows: parentCheck } = await query(
      `SELECT id FROM comments WHERE id = $1 AND post_id = $2 AND is_hidden = FALSE`,
      [parentId, postId]
    );
    if (parentCheck.length === 0) {
      throw new AppError("Comentário pai não encontrado", "PARENT_NOT_FOUND", 404);
    }
  }

  const { rows } = await query(
    `INSERT INTO comments (post_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content, parent_id, like_count, created_at`,
    [postId, userId, content.trim(), parentId || null]
  );

  await query(`UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`, [postId]);

  const comment = rows[0];
  const { rows: userRows } = await query(`SELECT name FROM users WHERE id = $1`, [userId]);
  comment.author_name = userRows[0]?.name || "Anônimo";
  comment.author_id = userId;
  comment.user_liked = false;

  trackEvent(userId, "comment_created", { post_id: postId, comment_id: comment.id });

  return comment;
}

export async function toggleCommentLike(commentId: number, userId: number) {
  const { rows: commentCheck } = await query(
    `SELECT id FROM comments WHERE id = $1 AND is_hidden = FALSE`,
    [commentId]
  );
  if (commentCheck.length === 0) {
    throw new AppError("Comentário não encontrado", "COMMENT_NOT_FOUND", 404);
  }

  const { rows: existing } = await query(
    `SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
    [commentId, userId]
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
      [commentId, userId]
    );
    if (rowCount && rowCount > 0) {
      await query(`UPDATE comments SET like_count = like_count + 1 WHERE id = $1`, [commentId]);
    }
    return { liked: true };
  }
}
