// Community realtime helpers (Task #223).
//
// Camada fina sobre `server/realtime/community.ts`. Centraliza o
// shape dos payloads emitidos pelos call sites do service.ts (createPost,
// updatePost, deletePost, addComment, togglePostReaction,
// toggleCommentReaction, setPostHiddenWithAuth, setCommentHiddenWithAuth).
//
// Princípio (Task #229): Socket.IO é o transporte único — não há mais
// flag `COMMUNITY_REALTIME`. Kill-switch absoluto é `SOCKET_IO_ENABLED`
// no servidor (compartilhado com `/dm`).
// Notificações pessoais (`notification:new`, `notification:unread`)
// trafegam pelo `/dm` via `publishToUser → emitToUser` em
// `messages/events.ts`. Sala dedicada `user:<id>`, canal separado das
// salas `forum:<slug>` / `post:<id>` deste namespace.

import { emitToForumRoom, emitToPostRoom } from "../../realtime/community.js";

export interface PostNewPayload {
  id: number;
  forum_id: number;
  forum_slug: string;
  forum_name?: string;
  author_id: number;
  author_name: string;
  title: string | null;
  content: string;
  created_at: string;
  class_id: number | null;
  // Hint pro cliente saber se precisa filtrar (turma escopada).
}

// IMPORTANTE — Autorização no fan-out (Task #223 fix):
// posts class-scoped (class_id != null) NÃO vão pra sala aberta
// `forum:<slug>` porque a sala é ingressada com `forum:join`, que só
// valida que o fórum existe — não checa trilha paga/matrícula. Para
// não vazar conteúdo de turma a não-membros, classpost emite SÓ pra
// sala `post:<id>` (cujo `post:join` valida acesso completo, incluindo
// trail gate). REST `GET /forums/:id/posts` já filtra class posts do
// feed da comunidade, então não há regressão de feature.
export function emitPostNew(forumSlug: string, payload: PostNewPayload): void {
  if (payload.class_id) {
    // Sem audiência segura no socket pra anunciar criação de class post.
    // Membros da turma descobrirão via refetch da TurmaCommunityTab
    // (que tem seu próprio endpoint scoped). Nada vaza.
    return;
  }
  emitToForumRoom(forumSlug, "post:new", payload);
}

export function emitPostUpdated(
  forumSlug: string,
  postId: number,
  patch: Record<string, unknown>,
  classId: number | null = null,
): void {
  const payload = { post_id: postId, forum_slug: forumSlug, ...patch };
  // Sala do post sempre — quem entrou já passou pelo gate `post:join`.
  emitToPostRoom(postId, "post:updated", payload);
  // Sala do fórum só se o post for público (não-turma).
  if (!classId) emitToForumRoom(forumSlug, "post:updated", payload);
}

export function emitPostReaction(
  forumSlug: string,
  postId: number,
  payload: {
    user_id: number;
    reactions: Array<{ emoji: string; count: number }>;
    like_count: number;
  },
  classId: number | null = null,
): void {
  const out = { post_id: postId, forum_slug: forumSlug, ...payload };
  emitToPostRoom(postId, "post:reaction", out);
  if (!classId) emitToForumRoom(forumSlug, "post:reaction", out);
}

export interface CommentNewPayload {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  like_count: number;
}

export function emitCommentNew(postId: number, payload: CommentNewPayload): void {
  emitToPostRoom(postId, "comment:new", payload);
}

export function emitCommentUpdated(
  postId: number,
  commentId: number,
  patch: Record<string, unknown>,
): void {
  emitToPostRoom(postId, "comment:updated", { comment_id: commentId, post_id: postId, ...patch });
}

export function emitCommentReaction(
  postId: number,
  commentId: number,
  payload: {
    user_id: number;
    reactions: Array<{ emoji: string; count: number }>;
  },
): void {
  emitToPostRoom(postId, "comment:reaction", {
    comment_id: commentId,
    post_id: postId,
    ...payload,
  });
}
