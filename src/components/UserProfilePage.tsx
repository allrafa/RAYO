import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Heart, MessageCircle, UserPlus, UserCheck, X, Award, Bookmark } from "lucide-react";
import { enhancedToast } from "./EnhancedToast";

// Task #92 — Perfil público estilo Reddit. Carrega karma, posts,
// comentários e comunidades do usuário-alvo via os endpoints novos
// em /api/community/users/:id/* + /api/users/:id/follows. Aparece
// como overlay dentro do PerfilPage (deep-link `/u/:id`) e também
// pode ser renderizado pra mostrar o próprio perfil.

interface PublicProfile {
  id: number;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  segments: string[];
  level: number;
  xp: number;
  streak: number;
  totalBadges: number;
  joinedAt: string;
}

interface KarmaInfo {
  post_karma: number;
  comment_karma: number;
  post_count: number;
  comment_count: number;
}

interface FollowInfo {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface UserPost {
  id: number;
  content: string;
  category?: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  images?: string[];
  forum_name?: string;
  forum_slug?: string;
  forum_icon?: string;
}

interface UserComment {
  id: number;
  post_id: number;
  content: string;
  like_count: number;
  created_at: string;
  post_title?: string | null;
  post_excerpt?: string | null;
  forum_name?: string;
  forum_slug?: string;
}

interface UserCommunity {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  member_count: number;
}

interface UserBadge {
  id: number;
  title: string;
  description?: string | null;
  icon?: string | null;
  tier?: string | null;
  earnedAt?: string | null;
}

interface UserProfilePageProps {
  userId: number;
  onClose?: () => void;
  // Task #92 — quando clicar em c/<slug> dentro do perfil, navegar
  // automaticamente pra aba Comunidade (sem isso o evento dispara mas
  // o usuário continua na tela de perfil).
  onNavigateToCommunity?: () => void;
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("pt-BR");
}

export function UserProfilePage({ userId, onClose, onNavigateToCommunity }: UserProfilePageProps) {
  const { user: viewer } = useAuth();
  const isSelf = viewer?.id === userId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [karma, setKarma] = useState<KarmaInfo | null>(null);
  const [follow, setFollow] = useState<FollowInfo | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [communities, setCommunities] = useState<UserCommunity[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  // Task #93 — aba "Salvos" só carrega quando isSelf abre a tab.
  const [savedPosts, setSavedPosts] = useState<UserPost[] | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, karmaRes, followRes, postsRes, commentsRes, commsRes, badgesRes] = await Promise.all([
        api.get<{ user: PublicProfile }>(`/api/users/${userId}/public`),
        api.get<KarmaInfo>(`/api/community/users/${userId}/karma`),
        api.get<FollowInfo>(`/api/users/${userId}/follows`),
        api.get<{ posts: UserPost[] }>(`/api/community/users/${userId}/posts?limit=20`),
        api.get<{ comments: UserComment[] }>(`/api/community/users/${userId}/comments?limit=20`),
        api.get<{ communities: UserCommunity[] }>(`/api/community/users/${userId}/communities`),
        api.get<{ badges: UserBadge[] }>(`/api/community/users/${userId}/badges`),
      ]);
      if (profRes.success && profRes.data) setProfile(profRes.data.user);
      else setError(profRes.error?.message || "Não foi possível carregar este perfil.");
      if (karmaRes.success && karmaRes.data) setKarma(karmaRes.data);
      if (followRes.success && followRes.data) setFollow(followRes.data);
      if (postsRes.success && postsRes.data) setPosts(postsRes.data.posts);
      if (commentsRes.success && commentsRes.data) setComments(commentsRes.data.comments);
      if (commsRes.success && commsRes.data) setCommunities(commsRes.data.communities);
      if (badgesRes.success && badgesRes.data) setBadges(badgesRes.data.badges);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadSaved = useCallback(async () => {
    if (!isSelf) return;
    setSavedLoading(true);
    try {
      // Task #93 — backend aceita "me" como atalho ou o id numérico do
      // próprio usuário (outros IDs respondem 403). Usamos "me" pra
      // alinhar com o contrato sugerido na revisão.
      const res = await api.get<{ posts: UserPost[] }>(`/api/community/users/me/saved?limit=20`);
      if (res.success && res.data) setSavedPosts(res.data.posts);
      else setSavedPosts([]);
    } finally {
      setSavedLoading(false);
    }
  }, [isSelf]);

  const handleTabChange = (value: string) => {
    if (value === "saved" && isSelf && savedPosts === null && !savedLoading) {
      void loadSaved();
    }
  };

  const onToggleFollow = async () => {
    if (!follow || followBusy || isSelf) return;
    setFollowBusy(true);
    const next = !follow.is_following;
    setFollow({ ...follow, is_following: next, followers_count: follow.followers_count + (next ? 1 : -1) });
    const res = await api.post<FollowInfo>(`/api/users/${userId}/follow`, { follow: next });
    setFollowBusy(false);
    if (res.success && res.data) {
      setFollow({
        is_following: next,
        followers_count: res.data.followers_count,
        following_count: res.data.following_count,
      });
      enhancedToast.success({
        title: next ? "Seguindo" : "Você deixou de seguir",
        description: next ? `Você agora segue ${profile?.name ?? "este usuário"}` : "",
        haptic: true,
      });
    } else {
      // rollback
      setFollow(follow);
      enhancedToast.error({
        title: "Falha",
        description: res.error?.message || "Tente novamente",
        haptic: true,
      });
    }
  };

  const openCommunity = (slug: string) => {
    try {
      sessionStorage.setItem("rayo-pending-community-slug", slug);
    } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent("rayo:open-community", { detail: { slug } }));
    // Sem navegar pra aba Comunidade, o clique parece inerte porque o
    // perfil continua renderizado por cima. Fechamos o overlay de perfil
    // e pedimos pro pai trocar de aba.
    onClose?.();
    onNavigateToCommunity?.();
  };

  const totalKarma = useMemo(
    () => (karma ? karma.post_karma + karma.comment_karma : 0),
    [karma],
  );

  if (loading && !profile) {
    return (
      <div
        className="rounded-xl p-6"
        style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
      >
        <p className="text-sm text-muted-foreground">Carregando perfil…</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div
        className="rounded-xl p-6 flex items-start justify-between gap-3"
        style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
      >
        <p className="text-sm text-destructive">{error}</p>
        {onClose && (
          <button onClick={onClose} className="text-xs underline">fechar</button>
        )}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
    >
      {/* Header */}
      <div className="p-5 flex items-start gap-4 relative">
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            aria-label="Fechar perfil"
            className="absolute top-3 right-3 rounded-full p-1 hover:bg-[var(--rayo-sand-200)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <Avatar className="w-20 h-20 ring-2" style={{ borderColor: "var(--rayo-sand-300)" }}>
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.name} />}
          <AvatarFallback className="text-2xl">{profile.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-tight" style={{ color: "var(--rayo-forest-900)" }}>
            {profile.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            u/{profile.id} · membro desde{" "}
            {new Date(profile.joinedAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
          </p>
          {profile.segments?.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {profile.segments.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          )}
          {profile.bio && (
            <p className="text-sm mt-2" style={{ color: "var(--rayo-ink-600)" }}>{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Karma + Follow */}
      <div
        className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center"
        style={{ background: "var(--rayo-sand-100)", borderTop: "1px solid var(--rayo-sand-300)", borderBottom: "1px solid var(--rayo-sand-300)" }}
      >
        <div>
          <p className="text-lg font-bold" style={{ color: "var(--rayo-terra-500)" }}>{totalKarma}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Karma total</p>
        </div>
        <div>
          <p className="text-lg font-bold">{karma?.post_count ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Posts</p>
        </div>
        <div>
          <p className="text-lg font-bold">{follow?.followers_count ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seguidores</p>
        </div>
        <div className="sm:text-right">
          {!isSelf && follow && (
            <Button
              size="sm"
              onClick={onToggleFollow}
              disabled={followBusy}
              variant={follow.is_following ? "outline" : "default"}
              className="gap-2"
            >
              {follow.is_following ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
              {follow.is_following ? "Seguindo" : "Seguir"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {/* Task #93 — Tabs mobile-first: linha rolável horizontalmente em
          telas pequenas (sem clipping de label, padding lateral confortável)
          e auto-justify no desktop. NÃO usar `grid-cols-N` aqui — em mobile
          isso aperta os títulos e quebra acessibilidade. */}
      <Tabs defaultValue="posts" className="pt-3 pb-5" onValueChange={handleTabChange}>
        <div className="px-4 -mx-1 overflow-x-auto no-scrollbar">
          <TabsList
            className="inline-flex w-max min-w-full gap-1 lg:w-full lg:justify-between bg-transparent p-0"
            style={{ background: "transparent" }}
          >
            <TabsTrigger value="posts" className="px-3 py-2 whitespace-nowrap text-sm">Posts</TabsTrigger>
            <TabsTrigger value="comments" className="px-3 py-2 whitespace-nowrap text-sm">Comentários</TabsTrigger>
            <TabsTrigger value="communities" className="px-3 py-2 whitespace-nowrap text-sm">Comunidades</TabsTrigger>
            <TabsTrigger value="achievements" className="px-3 py-2 whitespace-nowrap text-sm">Conquistas</TabsTrigger>
            {isSelf && (
              <TabsTrigger value="saved" className="px-3 py-2 whitespace-nowrap text-sm flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                Salvos
              </TabsTrigger>
            )}
            <TabsTrigger value="about" className="px-3 py-2 whitespace-nowrap text-sm">Sobre</TabsTrigger>
          </TabsList>
        </div>
        {isSelf && (
          <TabsContent value="saved" className="mt-3 space-y-2">
            {savedLoading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Carregando…</p>
            ) : !savedPosts || savedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                Você ainda não salvou nenhuma publicação. Use o menu “…” em qualquer post para salvar.
              </p>
            ) : (
              savedPosts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)" }}
                >
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                    {p.forum_slug && (
                      <button
                        type="button"
                        onClick={() => openCommunity(p.forum_slug!)}
                        className="hover:underline"
                        style={{ color: "var(--rayo-terra-500)", fontWeight: 600 }}
                      >
                        c/{p.forum_slug}
                      </button>
                    )}
                    <span>· {formatRelative(p.created_at)}</span>
                  </div>
                  <p className="line-clamp-3" style={{ color: "var(--rayo-forest-900)" }}>{p.content}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.like_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.comment_count}</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        )}

        <TabsContent value="posts" className="mt-3 space-y-2">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhum post ainda.</p>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="rounded-lg p-3 text-sm"
                style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)" }}
              >
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                  {p.forum_slug && (
                    <button
                      type="button"
                      onClick={() => openCommunity(p.forum_slug!)}
                      className="hover:underline"
                      style={{ color: "var(--rayo-terra-500)", fontWeight: 600 }}
                    >
                      c/{p.forum_slug}
                    </button>
                  )}
                  <span>· {formatRelative(p.created_at)}</span>
                  {p.category && <span>· {p.category}</span>}
                </div>
                <p className="line-clamp-3" style={{ color: "var(--rayo-forest-900)" }}>{p.content}</p>
                {p.images && p.images.length > 0 && (
                  <div className="mt-2 flex gap-1 overflow-hidden rounded">
                    {p.images.slice(0, 3).map((src, i) => (
                      <ImageWithFallback
                        key={i}
                        src={src}
                        alt={`Imagem ${i + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.like_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.comment_count}</span>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-3 space-y-2">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhum comentário ainda.</p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="rounded-lg p-3 text-sm"
                style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)" }}
              >
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                  {c.forum_slug && (
                    <button
                      type="button"
                      onClick={() => openCommunity(c.forum_slug!)}
                      className="hover:underline"
                      style={{ color: "var(--rayo-terra-500)", fontWeight: 600 }}
                    >
                      c/{c.forum_slug}
                    </button>
                  )}
                  <span>· {formatRelative(c.created_at)}</span>
                </div>
                {c.post_title && (
                  <p className="text-[11px] text-muted-foreground italic truncate">em "{c.post_title}"</p>
                )}
                <p className="line-clamp-3" style={{ color: "var(--rayo-forest-900)" }}>{c.content}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{c.like_count}</span>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="communities" className="mt-3 space-y-2">
          {communities.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma comunidade ainda.</p>
          ) : (
            communities.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openCommunity(c.slug)}
                className="w-full rounded-lg p-3 text-left text-sm flex items-center gap-3 hover:bg-[var(--rayo-sand-200)] transition-colors"
                style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)" }}
              >
                <div className="text-2xl">{c.icon || "💬"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: "var(--rayo-forest-900)" }}>
                    c/{c.slug}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.member_count} {c.member_count === 1 ? "membro" : "membros"}
                  </p>
                </div>
              </button>
            ))
          )}
        </TabsContent>

        <TabsContent value="achievements" className="mt-3 space-y-2">
          {badges.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma conquista ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg p-3 text-center"
                  style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)" }}
                >
                  <div className="text-2xl mb-1">{b.icon || <Award className="w-5 h-5 mx-auto" />}</div>
                  <p className="text-xs font-semibold" style={{ color: "var(--rayo-forest-900)" }}>{b.title}</p>
                  {b.tier && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{b.tier}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-3">
          <div
            className="rounded-lg p-4 text-sm space-y-2"
            style={{ background: "var(--rayo-sand-100)", border: "1px solid var(--rayo-sand-300)" }}
          >
            <p>
              <strong>Nível:</strong> {profile.level} · <strong>XP:</strong> {profile.xp}
            </p>
            <p>
              <strong>Sequência atual:</strong> {profile.streak} dias
            </p>
            <p>
              <strong>Conquistas:</strong> {profile.totalBadges}
            </p>
            <p>
              <strong>Karma de posts:</strong> {karma?.post_karma ?? 0} ·{" "}
              <strong>Karma de comentários:</strong> {karma?.comment_karma ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Membro desde{" "}
              {new Date(profile.joinedAt).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
