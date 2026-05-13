import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowLeft, Users, UserPlus, UserCheck, ShieldCheck, Calendar } from "lucide-react";
import { api } from "../lib/api";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { enhancedToast } from "./EnhancedToast";

// Task #92 — Community detail page (subreddit-style). Renderizada DENTRO da
// aba Comunidade quando um slug é selecionado via deep-link `/c/<slug>` ou
// clique em `c/<slug>`. NÃO é página pública: o gate de auth do App.tsx
// redireciona não autenticados pro /login.
//
// Task #198 — header enriquecido (capa, descrição, moderadores per-community)
// + Sobre completo (regras, criador, data, mods). Cover_url já vem resolvido
// como URL real do backend (resolveStoredMediaUrl em getForumBySlug).

interface ForumModerator {
  user_id: number;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

interface ForumDetail {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
  cover_url?: string | null;
  rules?: string | null;
  is_official?: boolean;
  created_by?: number | null;
  created_at?: string | null;
  member_count: number;
  is_subscribed: boolean;
  is_moderator?: boolean;
  post_count?: number | string;
  moderators?: ForumModerator[];
}

interface CommunityPost {
  id: number;
  title?: string | null;
  content: string;
  category?: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  images?: string[];
}

interface CommunityDetailPageProps {
  slug: string;
  onBack: () => void;
  onOpenPost?: (postId: number) => void;
  onOpenProfile?: (userId: number) => void;
}

function formatRelative(d: string): string {
  const date = new Date(d);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("pt-BR");
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

export function CommunityDetailPage({ slug, onBack, onOpenPost, onOpenProfile }: CommunityDetailPageProps) {
  const [forum, setForum] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subBusy, setSubBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fRes = await api.get<{ forum: ForumDetail }>(`/api/community/forums/by-slug/${encodeURIComponent(slug)}`);
    if (!fRes.success || !fRes.data) {
      setError(fRes.error?.message || "Comunidade não encontrada");
      setLoading(false);
      return;
    }
    setForum(fRes.data.forum);
    const pRes = await api.get<{ posts: CommunityPost[] }>(
      `/api/community/forums/${fRes.data.forum.id}/posts?limit=20`,
    );
    if (pRes.success && pRes.data) setPosts(pRes.data.posts);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggleSubscribe = async () => {
    if (!forum || subBusy) return;
    setSubBusy(true);
    const next = !forum.is_subscribed;
    setForum({
      ...forum,
      is_subscribed: next,
      member_count: forum.member_count + (next ? 1 : -1),
    });
    const res = await api.post<{ subscribed: boolean; member_count: number }>(
      `/api/community/forums/by-slug/${encodeURIComponent(forum.slug)}/subscribe`,
      { subscribed: next },
    );
    setSubBusy(false);
    if (res.success && res.data) {
      setForum((prev) =>
        prev
          ? { ...prev, is_subscribed: res.data!.subscribed, member_count: res.data!.member_count }
          : prev,
      );
      enhancedToast.success({
        title: next ? `Você entrou em c/${forum.slug}` : `Você saiu de c/${forum.slug}`,
        description: "",
        haptic: true,
      });
    } else {
      // rollback
      setForum(forum);
      enhancedToast.error({
        title: "Falha",
        description: res.error?.message || "Tente novamente",
        haptic: true,
      });
    }
  };

  if (loading && !forum) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted-foreground">Carregando comunidade…</p>
      </div>
    );
  }
  if (error || !forum) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
        >
          <p className="text-sm text-destructive">{error || "Comunidade não encontrada"}</p>
        </div>
      </div>
    );
  }

  const moderators = forum.moderators || [];

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="px-4 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 mb-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      {/* Cover banner — só renderiza se a comunidade tiver capa carregada via CMS */}
      {forum.cover_url && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden" style={{ aspectRatio: "16 / 5", background: "var(--rayo-terra-100)" }}>
          <ImageWithFallback src={forum.cover_url} alt={`Capa ${forum.name}`} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div
        className="rounded-xl p-5 mx-4"
        style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: "var(--rayo-terra-100)" }}
          >
            {forum.icon || "💬"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--rayo-forest-900)" }}>
                {forum.name}
              </h1>
              {forum.is_official && (
                <Badge style={{ background: "var(--rayo-forest-700)", color: "#fff", fontSize: 10 }}>
                  Oficial
                </Badge>
              )}
              {forum.is_moderator && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <ShieldCheck className="w-3 h-3" /> Você modera
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">c/{forum.slug}</p>
            <div className="flex items-center gap-3 text-xs mt-2 text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <strong style={{ color: "var(--rayo-forest-900)" }}>{forum.member_count}</strong>{" "}
                {forum.member_count === 1 ? "membro" : "membros"}
              </span>
              {forum.category && <Badge variant="outline" className="text-[10px]">{forum.category}</Badge>}
            </div>
            {forum.description && (
              <p className="text-sm mt-3" style={{ color: "var(--rayo-ink-600)" }}>{forum.description}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={onToggleSubscribe}
            disabled={subBusy}
            variant={forum.is_subscribed ? "outline" : "default"}
            className="gap-2 flex-shrink-0"
          >
            {forum.is_subscribed ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
            {forum.is_subscribed ? "Inscrito" : "Entrar"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="px-4 pt-4">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-3">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Nenhum post ainda. Seja o primeiro a publicar.
            </p>
          ) : (
            posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPost?.(p.id)}
                className="w-full text-left rounded-lg p-4 hover:bg-[var(--rayo-sand-100)] transition-colors"
                style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
              >
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                  <span>u/{p.author_name || "anônimo"}</span>
                  <span>· {formatRelative(p.created_at)}</span>
                  {p.category && <span>· {p.category}</span>}
                </div>
                {p.title && (
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--rayo-forest-900)" }}>
                    {p.title}
                  </h3>
                )}
                <p className="text-sm line-clamp-3" style={{ color: "var(--rayo-ink-600)" }}>{p.content}</p>
                {p.images && p.images.length > 0 && (
                  <div className="mt-2 flex gap-1 overflow-hidden rounded">
                    {p.images.slice(0, 3).map((src, i) => (
                      <ImageWithFallback
                        key={i}
                        src={src}
                        alt={`Imagem ${i + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span>♥ {p.like_count}</span>
                  <span>💬 {p.comment_count}</span>
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4 space-y-3">
          {forum.description && (
            <section
              className="rounded-lg p-4"
              style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--rayo-ink-500)" }}>
                Sobre
              </h3>
              <p className="text-sm whitespace-pre-line" style={{ color: "var(--rayo-ink-600)" }}>
                {forum.description}
              </p>
            </section>
          )}

          {forum.rules && (
            <section
              className="rounded-lg p-4"
              style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--rayo-ink-500)" }}>
                Regras
              </h3>
              <p className="text-sm whitespace-pre-line" style={{ color: "var(--rayo-ink-600)" }}>
                {forum.rules}
              </p>
            </section>
          )}

          <section
            className="rounded-lg p-4"
            style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--rayo-ink-500)" }}>
              <ShieldCheck className="w-3.5 h-3.5" /> Moderadores
            </h3>
            {moderators.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Esta comunidade ainda não tem moderadores específicos.
              </p>
            ) : (
              <ul className="space-y-2">
                {moderators.map((m) => (
                  <li key={m.user_id}>
                    <button
                      type="button"
                      onClick={() => onOpenProfile?.(m.user_id)}
                      className="w-full flex items-center gap-3 p-1.5 rounded-md hover:bg-[var(--rayo-sand-100)] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                        style={{ background: "var(--rayo-terra-100)" }}
                      >
                        {m.avatar_url ? (
                          <ImageWithFallback src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--rayo-forest-900)" }}>
                          {m.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">moderador desde {formatDate(m.created_at)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="rounded-lg p-4 text-xs space-y-1.5 text-muted-foreground"
            style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
          >
            <p className="flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Criada em {formatDate(forum.created_at)}
            </p>
            <p>{forum.member_count} {forum.member_count === 1 ? "membro" : "membros"} · {forum.post_count ?? 0} posts</p>
            {!forum.is_official && (
              <p style={{ color: "var(--rayo-ink-500)" }}>
                Comunidade criada por um membro da plataforma.
              </p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
