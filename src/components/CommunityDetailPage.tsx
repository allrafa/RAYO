import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ArrowLeft, Users, UserPlus, UserCheck, ShieldCheck, Calendar, Pencil } from "lucide-react";
import { api } from "../lib/api";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { enhancedToast } from "./EnhancedToast";
import { useAuth, userHasRole } from "./AuthContext";
import { CreateCommunityModal } from "./CreateCommunityModal";

// Task #202 — opções de ordenação dos posts da comunidade.
type PostOrder = "recent" | "trending" | "most_commented";
const POST_ORDER_LABEL: Record<PostOrder, string> = {
  recent: "Recentes",
  trending: "Em alta",
  most_commented: "Mais comentados",
};

interface ForumMember {
  user_id: number;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  is_moderator: boolean;
}

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
  life_context?: string | null;
  cover_url?: string | null;
  rules?: string | null;
  is_official?: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at?: string | null;
  member_count: number;
  is_subscribed: boolean;
  is_moderator?: boolean;
  post_count?: number | string;
  moderators?: ForumModerator[];
}

const LIFE_CONTEXT_LABEL: Record<string, string> = {
  solteiro: "Solteiro",
  namoro: "Namoro",
  noivos: "Noivos",
  casados: "Casados",
  pais: "Pais",
};

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
  const { user } = useAuth();
  const [forum, setForum] = useState<ForumDetail | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsOrder, setPostsOrder] = useState<PostOrder>("recent");
  const [postsLoading, setPostsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  // Task #202 — Edit modal state (só visível pra criador OU admin global).
  const [editOpen, setEditOpen] = useState(false);
  // Task #202 — Members tab state (lazy-loaded ao abrir a aba).
  const [members, setMembers] = useState<ForumMember[]>([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "members" | "about">("posts");

  // Carrega o forum + primeira página de posts (sempre que slug muda).
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
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset COMPLETO ao trocar de comunidade pra evitar mostrar dados da
  // anterior (Task #202 — fix do code review). Inclui `forum=null` pra
  // bloquear o fetch de posts com forum.id antigo enquanto o novo carrega.
  useEffect(() => {
    setForum(null);
    setMembers([]);
    setMembersPage(1);
    setMembersTotal(0);
    setMembersLoaded(false);
    setMembersLoading(false);
    setActiveTab("posts");
    setPosts([]);
    setPostsOrder("recent");
    setPostsLoading(false);
  }, [slug]);

  // Carrega posts quando o forum estiver disponível ou a ordenação mudar.
  // Guarda contra resposta stale: se o slug mudou enquanto o fetch
  // estava em voo, descarta o resultado.
  useEffect(() => {
    if (!forum) return;
    let cancelled = false;
    const slugAtFetch = forum.slug;
    const run = async () => {
      setPostsLoading(true);
      const pRes = await api.get<{ posts: CommunityPost[] }>(
        `/api/community/forums/${forum.id}/posts?limit=20&order=${postsOrder}`,
      );
      if (!cancelled && slugAtFetch === slug) {
        if (pRes.success && pRes.data) setPosts(pRes.data.posts);
        setPostsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [forum, postsOrder, slug]);

  // Members loader paginado (lazy: só dispara ao abrir aba).
  const loadMembersPage = useCallback(async (page: number) => {
    if (!forum) return;
    // Stale guard: se o slug mudar enquanto o fetch está em voo,
    // descartamos a resposta pra não vazar membros da comunidade anterior.
    const slugAtFetch = forum.slug;
    setMembersLoading(true);
    const res = await api.get<{ members: ForumMember[]; total: number; page: number; totalPages: number }>(
      `/api/community/forums/${forum.id}/members?page=${page}&limit=30`,
    );
    if (slugAtFetch !== slug) return;
    setMembersLoading(false);
    if (res.success && res.data) {
      setMembers((prev) => (page === 1 ? res.data!.members : [...prev, ...res.data!.members]));
      setMembersTotal(res.data.total);
      setMembersPage(res.data.page);
      setMembersLoaded(true);
    }
  }, [forum, slug]);

  useEffect(() => {
    if (activeTab === "members" && forum && !membersLoaded && !membersLoading) {
      void loadMembersPage(1);
    }
  }, [activeTab, forum, membersLoaded, membersLoading, loadMembersPage]);

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
  // Edit autorizado pra criador da comunidade OU admin global.
  const canEdit = !!user && (
    userHasRole(user, "admin") ||
    (forum.created_by != null && user.id === forum.created_by)
  );

  const orderPillStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    background: active ? "var(--rayo-terra-500)" : "var(--rayo-sand-100)",
    color: active ? "#fff" : "var(--rayo-ink-600)",
    border: `1px solid ${active ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
    cursor: "pointer",
    transition: "all .15s ease",
  });

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
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={onToggleSubscribe}
              disabled={subBusy}
              variant={forum.is_subscribed ? "outline" : "default"}
              className="gap-2"
            >
              {forum.is_subscribed ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
              {forum.is_subscribed ? "Inscrito" : "Entrar"}
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditOpen(true)}
                className="gap-2"
              >
                <Pencil className="w-3 h-3" /> Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "posts" | "members" | "about")} className="px-4 pt-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-3">
          {/* Sort pills */}
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Ordenar posts">
            {(Object.keys(POST_ORDER_LABEL) as PostOrder[]).map((opt) => (
              <button
                key={opt}
                type="button"
                role="tab"
                aria-selected={postsOrder === opt}
                onClick={() => setPostsOrder(opt)}
                style={orderPillStyle(postsOrder === opt)}
              >
                {POST_ORDER_LABEL[opt]}
              </button>
            ))}
          </div>
          {postsLoading && posts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Carregando posts…</p>
          ) : posts.length === 0 ? (
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

        <TabsContent value="members" className="mt-4 space-y-2">
          {membersLoading && members.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Carregando membros…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Nenhum membro inscrito ainda.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground px-1">
                {membersTotal} {membersTotal === 1 ? "membro" : "membros"}
              </p>
              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.user_id}>
                    <button
                      type="button"
                      onClick={() => onOpenProfile?.(m.user_id)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[var(--rayo-sand-100)] transition-colors text-left"
                      style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                        style={{ background: "var(--rayo-terra-100)" }}
                      >
                        {m.avatar_url ? (
                          <ImageWithFallback src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--rayo-forest-900)" }}>
                          {m.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          desde {formatDate(m.joined_at)}
                        </p>
                      </div>
                      {m.is_moderator && (
                        <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0">
                          <ShieldCheck className="w-3 h-3" /> Mod
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {members.length < membersTotal && (
                <div className="pt-2 flex justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={membersLoading}
                    onClick={() => loadMembersPage(membersPage + 1)}
                  >
                    {membersLoading ? "Carregando…" : "Mostrar mais"}
                  </Button>
                </div>
              )}
            </>
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
            {forum.life_context && (
              <p>
                Contexto:{" "}
                <span style={{ color: "var(--rayo-forest-900)" }}>
                  {LIFE_CONTEXT_LABEL[forum.life_context] || forum.life_context}
                </span>
              </p>
            )}
            {forum.category && (
              <p>Categoria: <span style={{ color: "var(--rayo-forest-900)" }}>{forum.category}</span></p>
            )}
            {forum.created_by && forum.created_by_name && (
              <p>
                Criada por{" "}
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(forum.created_by!)}
                  className="underline hover:no-underline"
                  style={{ color: "var(--rayo-terra-600)" }}
                >
                  {forum.created_by_name}
                </button>
              </p>
            )}
            {!forum.is_official && (
              <p style={{ color: "var(--rayo-ink-500)" }}>
                Comunidade criada por um membro da plataforma.
              </p>
            )}
          </section>
        </TabsContent>
      </Tabs>

      {/* Task #202 — modal de edição reaproveita o CreateCommunityModal em modo edit */}
      {canEdit && (
        <CreateCommunityModal
          open={editOpen}
          onOpenChange={setEditOpen}
          editingForum={{
            id: forum.id,
            name: forum.name,
            slug: forum.slug,
            description: forum.description ?? null,
            icon: forum.icon ?? null,
            category: forum.category ?? null,
            rules: forum.rules ?? null,
            cover_url: forum.cover_url ?? null,
          }}
          onUpdated={() => { void load(); }}
        />
      )}
    </div>
  );
}
