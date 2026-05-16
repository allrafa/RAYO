// Task #99 — Comunidade escopada por turma. Reusa o mesmo `PostCard` e
// `CreatePostModal` da Comunidade global pra manter paridade de features
// (likes, salvar, editar, excluir, moderação) e analytics. A única
// diferença é que tudo é filtrado por `class_id` — posts criados aqui
// não vazam pro feed global e vice-versa.

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, PenSquare } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { PostCard } from "../ComunidadePage";
import { CreatePostModal } from "../CreatePostModal";
import { mapAPIPost, type APIPost, type MappedPost } from "../../lib/postMapper";
import { TrailPaywall } from "../trilhas/TrailPaywall";

// Task #122 — PostCard não recebe mais `reactions`/`onReact`; cada card
// gerencia seu próprio estado de reações multi-emoji internamente via
// EmojiReactionPicker, falando direto com o backend.

export function TurmaCommunityTab({ classId }: { classId: number }) {
  const [posts, setPosts] = useState<MappedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MappedPost | null>(null);
  // Task #130 — paywall inline. Quando o backend devolve 402
  // TRAIL_PAYMENT_REQUIRED no GET /posts?class_id=N, capturamos
  // trailId/trailSlug e renderizamos <TrailPaywall> em vez do feed.
  const [paywall, setPaywall] = useState<{ trailId: number | null; trailSlug: string | null } | null>(null);
  // Task #102 — id do post pendente vindo de uma notificação class_post.
  // Capturado uma única vez no mount; depois que a lista carrega, rola
  // até o post e aplica destaque temporário.
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPaywall(null);
    const res = await api.get<{ posts: APIPost[] }>(
      `/api/community/posts?class_id=${classId}&limit=50`,
    );
    if (res.success && res.data) {
      // Mapeia pra mesma shape consumida pelo feed global; PostCard
      // espera `author`, `time`, `likes`… (vide src/lib/postMapper.ts).
      setPosts((res.data.posts || []).map(mapAPIPost));
    } else if (res.error?.code === "TRAIL_PAYMENT_REQUIRED") {
      // Task #130 — sem assinatura ativa: mostra <TrailPaywall> in-place.
      const e = res.error as { trail_id?: number | null; trail_slug?: string | null };
      setPaywall({ trailId: e.trail_id ?? null, trailSlug: e.trail_slug ?? null });
      setPosts([]);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  // Task #102 — consume o stash que o NotificationBell parkou ao clicar
  // numa notificação `class_post` (link `/turmas/:cid/post/:pid`).
  useEffect(() => {
    try {
      // Task #163 — fallback pra chave legada cobre transição do rebrand.
      const pending =
        sessionStorage.getItem("rayo-pending-post") ??
        sessionStorage.getItem("raio-pending-post");
      if (pending) {
        sessionStorage.removeItem("rayo-pending-post");
        sessionStorage.removeItem("raio-pending-post");
        const id = Number(pending);
        if (Number.isFinite(id) && id > 0) setHighlightId(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Task #102 — quando o usuário JÁ está nessa turma e clica numa
  // notificação class_post, o stash não é repopulado a tempo desse
  // useEffect rodar de novo. NotificationBell publica esse evento
  // como canal independente para refirar o highlight do post alvo
  // sem depender de mount/sessionStorage.
  useEffect(() => {
    const onOpenPost = (e: Event) => {
      const detail = (e as CustomEvent<{ turmaId: number; postId: number }>).detail;
      if (!detail || detail.turmaId !== classId) return;
      if (Number.isFinite(detail.postId) && detail.postId > 0) {
        setHighlightId(detail.postId);
        // Recarrega a lista para garantir que posts criados depois
        // do último load() apareçam (ex.: notificação chegou via Socket.IO).
        void load();
      }
    };
    window.addEventListener("rayo:open-turma-post", onOpenPost);
    return () => window.removeEventListener("rayo:open-turma-post", onOpenPost);
  }, [classId, load]);

  useEffect(() => {
    if (loading || highlightId == null) return;
    if (!posts.some((p) => p.id === highlightId)) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-post-id="${highlightId}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.transition = "outline-color 600ms ease-out";
    el.style.outline = "2px solid var(--rayo-terra-500)";
    el.style.outlineOffset = "4px";
    el.style.borderRadius = "12px";
    // Dois timers tipados em refs locais — fade pra transparente em
    // 1.8s e cleanup completo das inline styles em 2.5s.
    let fadeOutTimer: number | null = null;
    const startTimer = window.setTimeout(() => {
      el.style.outline = "2px solid transparent";
      fadeOutTimer = window.setTimeout(() => {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.borderRadius = "";
        el.style.transition = "";
      }, 700);
    }, 1800);
    return () => {
      window.clearTimeout(startTimer);
      if (fadeOutTimer != null) window.clearTimeout(fadeOutTimer);
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.borderRadius = "";
      el.style.transition = "";
    };
  }, [loading, highlightId, posts]);

  // Task #130 — paywall inline tem prioridade sobre o feed.
  if (paywall && paywall.trailId) {
    return (
      <div className="px-4 py-4">
        <TrailPaywall trailId={paywall.trailId} variant="block" />
      </div>
    );
  }

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
        <div className="space-y-3" ref={containerRef}>
          {posts.map((post) => (
            <div key={post.id} data-post-id={post.id}>
              <PostCard
                post={post}
                onComment={load}
                onShare={load}
                onMutated={load}
                onEdit={(p: MappedPost) => {
                  setEditingPost(p);
                  setComposerOpen(true);
                }}
              />
            </div>
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
