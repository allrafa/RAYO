// Task #122 — Página dedicada de discussão (`/c/<slug>/p/<id>`).
// Não é modal: ocupa o conteúdo principal da aba Comunidade. Renderiza
// o post completo no topo + lista cronológica de comentários (ASC) +
// composer + reações multi-emoji em tudo. Voltar é origin-aware: vem
// da Home → volta pra Home; vem do feed → volta pro feed.

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Send, Share2 } from "lucide-react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { api } from "../lib/api";
import { enhancedToast } from "./EnhancedToast";
import { useAuth } from "./AuthContext";
import { EmojiReactionPicker, ReactionsSummary, type ReactionAggregate } from "./EmojiReactionPicker";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface PostDetailData {
  id: number;
  title: string | null;
  content: string;
  category: string;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  author_name: string;
  author_id: number;
  author_avatar?: string | null;
  forum_name?: string;
  forum_slug?: string;
  forum_icon?: string;
  images?: string[];
  user_liked: boolean;
  reactions: ReactionAggregate[];
  user_reaction: string | null;
}

interface CommentRow {
  id: number;
  content: string;
  parent_id: number | null;
  like_count: number;
  created_at: string;
  author_name: string;
  author_id: number;
  author_avatar?: string | null;
  user_liked: boolean;
  reactions: ReactionAggregate[];
  user_reaction: string | null;
}

interface DiscussionPageProps {
  postId: number;
  // Slug opcional só pro header / link "voltar pra c/<slug>". Quando
  // ausente, escondemos o atalho e a página ainda funciona.
  slug?: string | null;
  // History-aware back: ComunidadePage decide se chama history.back()
  // ou faz fallback (deep-link sem histórico). DiscussionPage só dispara.
  onBack: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("pt-BR");
}

export function DiscussionPage({ postId, slug, onBack }: DiscussionPageProps) {
  const { user: viewer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [composer, setComposer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const res = await api.get<{ post: PostDetailData & { comments: CommentRow[] } }>(
        `/api/community/posts/${postId}`,
      );
      if (!active) return;
      if (res.success && res.data) {
        const { comments: cs, ...rest } = res.data.post;
        setPost({
          ...rest,
          reactions: Array.isArray(rest.reactions) ? rest.reactions : [],
          user_reaction: rest.user_reaction ?? null,
        });
        setComments(
          (cs || []).map((c) => ({
            ...c,
            reactions: Array.isArray(c.reactions) ? c.reactions : [],
            user_reaction: c.user_reaction ?? null,
          })),
        );
      } else {
        enhancedToast.error({
          title: "Discussão não encontrada",
          description: res.error?.message || "O post pode ter sido removido.",
          haptic: true,
        });
        onBack();
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [postId, onBack]);

  const handleBack = () => {
    if (composer.trim().length > 0) {
      setConfirmDiscardOpen(true);
      return;
    }
    onBack();
  };

  const submitComment = async () => {
    const content = composer.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    const res = await api.post<{ comment: CommentRow }>(
      `/api/community/posts/${postId}/comments`,
      { content },
    );
    if (res.success && res.data) {
      const c = res.data.comment;
      setComments((prev) => [
        ...prev,
        {
          ...c,
          reactions: Array.isArray(c.reactions) ? c.reactions : [],
          user_reaction: c.user_reaction ?? null,
        },
      ]);
      setComposer("");
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    } else {
      enhancedToast.error({
        title: "Falha ao comentar",
        description: res.error?.message || "Tente novamente",
        haptic: true,
      });
    }
    setSubmitting(false);
  };

  const sharePost = async () => {
    if (!post) return;
    const url = `${window.location.origin}/c/${post.forum_slug || slug || "geral"}/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title || "Discussão no RAYO", url });
      } else {
        await navigator.clipboard.writeText(url);
        enhancedToast.success({ title: "Link copiado", haptic: true });
      }
    } catch {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
      </div>
    );
  }
  if (!post) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-32">
      {/* Header — back origin-aware */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
          style={{ color: "var(--rayo-ink-700)" }}
          aria-label={origin === "home" ? "Voltar para a Home" : "Voltar para a Comunidade"}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[13px]" style={{ fontWeight: 500 }}>
            {origin === "home" ? "Voltar" : "Comunidade"}
          </span>
        </Button>
        <Button variant="ghost" size="sm" onClick={sharePost} aria-label="Compartilhar">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* POST completo — mesma anatomia do PostCard, mas inline */}
      <article className="ra-card p-5 sm:p-6 space-y-4">
        <header className="flex items-center gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback
              style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-500)", fontWeight: 600 }}
            >
              {(post.author_name || "·").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px]" style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>
                {post.author_name}
              </span>
              {post.forum_name && (
                <span className="text-[12px]" style={{ color: "var(--rayo-ink-400)" }}>
                  em <strong style={{ color: "var(--rayo-terra-500)" }}>{post.forum_name}</strong>
                </span>
              )}
            </div>
            <span className="text-[12px]" style={{ color: "var(--rayo-ink-400)" }}>
              {formatTime(post.created_at)}
            </span>
          </div>
        </header>

        {post.title && (
          <h1 className="text-[22px] sm:text-[26px]" style={{ fontWeight: 700, color: "var(--rayo-forest-900)", lineHeight: 1.25 }}>
            {post.title}
          </h1>
        )}

        <div className="text-[15px] whitespace-pre-wrap" style={{ color: "var(--rayo-ink-700)", lineHeight: 1.6 }}>
          {post.content}
        </div>

        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="grid grid-cols-1 gap-2 rounded-xl overflow-hidden">
            {post.images.map((src, i) => (
              <div key={i} className="rounded-lg overflow-hidden">
                <ImageWithFallback src={src} alt={`Imagem ${i + 1}`} className="w-full h-auto object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Action row — picker + comment count + share */}
        <div
          className="flex items-center gap-6 pt-3"
          style={{ borderTop: "1px solid var(--rayo-sand-300)" }}
        >
          <EmojiReactionPicker
            targetType="post"
            targetId={post.id}
            reactions={post.reactions}
            userReaction={post.user_reaction}
            onChange={(next) =>
              setPost((prev) => prev && { ...prev, reactions: next.reactions, user_reaction: next.userReaction })
            }
            variant="full"
            className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          />
          <button
            type="button"
            onClick={() => composerRef.current?.focus()}
            className="flex items-center gap-2 text-[13px]"
            style={{ color: "var(--rayo-ink-400)", fontWeight: 500 }}
          >
            <MessageCircle className="w-4 h-4" />
            {post.comment_count}
          </button>
          <button
            type="button"
            onClick={sharePost}
            className="flex items-center gap-2 text-[13px]"
            style={{ color: "var(--rayo-ink-400)", fontWeight: 500 }}
          >
            <Share2 className="w-4 h-4" />
            {post.share_count || ""}
          </button>
        </div>

        {/* Chips agregados POR EMOJI (ReactionsSummary) — atende o requisito
            de "contador agrupado", não só o total da action row. */}
        {post.reactions.length > 0 && (
          <ReactionsSummary
            targetType="post"
            targetId={post.id}
            reactions={post.reactions}
            userReaction={post.user_reaction}
            onChange={(next) =>
              setPost((prev) => prev && { ...prev, reactions: next.reactions, user_reaction: next.userReaction })
            }
          />
        )}
      </article>

      {/* COMENTÁRIOS — ordem ASC (já vem assim do servidor) */}
      <section className="mt-6 space-y-1">
        <h2 className="text-[16px] mb-3" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
          Comentários ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="text-center py-8 text-[13px]" style={{ color: "var(--rayo-ink-400)" }}>
            Seja o primeiro a comentar.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback
                    style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-500)", fontSize: 12 }}
                  >
                    {(c.author_name || "·").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px]" style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>
                      {c.author_name}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--rayo-ink-400)" }}>
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-[14px] mt-1 whitespace-pre-wrap" style={{ color: "var(--rayo-ink-700)" }}>
                    {c.content}
                  </p>
                  <div className="mt-1">
                    <EmojiReactionPicker
                      targetType="comment"
                      targetId={c.id}
                      reactions={c.reactions}
                      userReaction={c.user_reaction}
                      onChange={(next) =>
                        setComments((prev) =>
                          prev.map((row) =>
                            row.id === c.id
                              ? { ...row, reactions: next.reactions, user_reaction: next.userReaction }
                              : row,
                          ),
                        )
                      }
                      variant="compact"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* COMPOSER fixo no rodapé (mobile-first); inline em telas largas */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t md:static md:border-0 md:mt-6 md:bg-transparent">
        <div className="max-w-3xl mx-auto p-3 md:p-0 flex items-end gap-2">
          {viewer ? (
            <>
              <Textarea
                ref={composerRef}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Escreva um comentário…"
                rows={1}
                className="resize-none min-h-[40px] max-h-32"
                style={{ borderRadius: 20 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitComment();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => void submitComment()}
                disabled={submitting || composer.trim().length === 0}
                style={{ background: "var(--rayo-terra-500)", color: "white", borderRadius: 999 }}
                aria-label="Enviar comentário"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </>
          ) : (
            <p className="text-center text-[13px] flex-1 py-2" style={{ color: "var(--rayo-ink-400)" }}>
              Faça login para comentar.
            </p>
          )}
        </div>
      </div>

      {confirmDiscardOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setConfirmDiscardOpen(false)}
          >
            <div
              className="bg-card rounded-2xl p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px]" style={{ fontWeight: 700 }}>
                Descartar rascunho?
              </h3>
              <p className="text-[13px]" style={{ color: "var(--rayo-ink-400)" }}>
                Você tem um comentário não enviado. Tem certeza que quer voltar?
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConfirmDiscardOpen(false)}>
                  Continuar editando
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmDiscardOpen(false);
                    onBack();
                  }}
                  style={{ background: "var(--rayo-terra-500)", color: "white" }}
                >
                  Descartar
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
