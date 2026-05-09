// Task #99 — Comunidade escopada por turma. Reusa o mesmo `PostCard` e
// `CreatePostModal` da Comunidade global pra manter paridade de features
// (likes, salvar, editar, excluir, moderação) e analytics. A única
// diferença é que tudo é filtrado por `class_id` — posts criados aqui
// não vazam pro feed global e vice-versa.

import { useEffect, useState, useCallback } from "react";
import { Loader2, PenSquare } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { useApp } from "../AppContext";
import { PostCard } from "../ComunidadePage";
import { CreatePostModal } from "../CreatePostModal";

export function TurmaCommunityTab({ classId }: { classId: number }) {
  const { mapAPIPost, reactions, reactToPost } = useApp() as any;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ posts: any[] }>(
      `/api/community/posts?class_id=${classId}&limit=50`,
    );
    if (res.success && res.data) {
      // mapAPIPost garante que o shape bate com o que PostCard espera
      // (mesma normalização que a Comunidade global usa).
      const mapped = (res.data.posts || []).map((p: any) =>
        typeof mapAPIPost === "function" ? mapAPIPost(p) : p,
      );
      setPosts(mapped);
    }
    setLoading(false);
  }, [classId, mapAPIPost]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReact = (postId: number, emoji: string) => {
    if (typeof reactToPost === "function") reactToPost(postId, emoji);
  };

  const handleComment = (_post: any) => {
    // TODO Task #99 follow-up: navegar pro detalhe do post dentro do
    // contexto da turma. Por ora, recarrega o feed após o sino.
    load();
  };

  const handleShare = (_post: any) => {
    /* compartilhar reaproveita o sistema global; PostCard cuida */
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header / CTA composer */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Comunidade exclusiva dessa turma. Posts daqui não aparecem no feed global.
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditingPost(null);
            setComposerOpen(true);
          }}
          style={{ background: "var(--rayo-terra-500)", color: "white" }}
        >
          <PenSquare className="w-4 h-4 mr-2" /> Publicar
        </Button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Ainda não há publicações dessa turma. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              reactions={reactions || {}}
              onReact={handleReact}
              onComment={() => handleComment(post)}
              onShare={() => handleShare(post)}
              onMutated={load}
              onEdit={(p) => {
                setEditingPost(p);
                setComposerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Composer reaproveitado da Comunidade (mesmo upload de imagens,
          mesma validação, mesma UX) — só com class_id setado. */}
      <CreatePostModal
        open={composerOpen}
        onOpenChange={(v) => {
          setComposerOpen(v);
          if (!v) {
            setEditingPost(null);
            load();
          }
        }}
        currentPage="comunidade"
        initialClassId={classId}
        editingPost={editingPost}
      />
    </div>
  );
}
