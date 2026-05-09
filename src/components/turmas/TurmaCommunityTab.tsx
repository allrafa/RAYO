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
import { mapAPIPost, type APIPost, type MappedPost } from "../../lib/postMapper";

type ReactionsMap = Record<string, unknown>;

interface AppCtxLike {
  reactions?: ReactionsMap;
  reactToPost?: (postId: number, emoji: string) => void;
}

export function TurmaCommunityTab({ classId }: { classId: number }) {
  const ctx = useApp() as unknown as AppCtxLike;
  const reactions: ReactionsMap = ctx.reactions ?? {};
  const reactToPost = ctx.reactToPost;

  const [posts, setPosts] = useState<MappedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MappedPost | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ posts: APIPost[] }>(
      `/api/community/posts?class_id=${classId}&limit=50`,
    );
    if (res.success && res.data) {
      // Mapeia pra mesma shape consumida pelo feed global; PostCard
      // espera `author`, `time`, `likes`… (vide src/lib/postMapper.ts).
      setPosts((res.data.posts || []).map(mapAPIPost));
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReact = (postId: number, emoji: string) => {
    if (typeof reactToPost === "function") reactToPost(postId, emoji);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header / CTA composer */}
      <div className="flex items-center justify-between gap-2">
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
              reactions={reactions}
              onReact={handleReact}
              onComment={load}
              onShare={load}
              onMutated={load}
              onEdit={(p: MappedPost) => {
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
        editingPost={editingPost ?? undefined}
      />
    </div>
  );
}
