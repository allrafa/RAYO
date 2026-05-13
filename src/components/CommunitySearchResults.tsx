// Task #193 — Resultados da busca tabbed da Comunidade (Reddit-style).
// 5 tabs paginadas (20/pg). Tabs Radix controlado (NUNCA value+defaultValue).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { MessageCircle, Users, ImageIcon, FileText, User as UserIcon } from "lucide-react";
import { api } from "../lib/api";
import { PostCard } from "./ComunidadePage";
import { PostImageLightbox } from "./PostImageLightbox";
import {
  cardKeyHandler,
  openCommunityBySlug,
  openPostById,
  openProfileById,
  stopBubble,
  CARD_INTERACTIVE_CLASS,
} from "../lib/cardClickTargets";

type Tab = "posts" | "comunidades" | "comentarios" | "midia" | "perfis";

interface CommunitySearchResultsProps {
  q: string;
  tab: Tab;
  onTabChange: (t: Tab) => void;
}

interface PageState<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

const EMPTY: PageState<any> = {
  items: [], page: 1, totalPages: 0, total: 0, loading: false, loadingMore: false, error: null,
};

const TAB_LABEL: Record<Tab, string> = {
  posts: "Posts",
  comunidades: "Comunidades",
  comentarios: "Comentários",
  midia: "Mídia",
  perfis: "Perfis",
};

const TAB_ICON: Record<Tab, React.ReactNode> = {
  posts: <FileText className="w-4 h-4" />,
  comunidades: <Users className="w-4 h-4" />,
  comentarios: <MessageCircle className="w-4 h-4" />,
  midia: <ImageIcon className="w-4 h-4" />,
  perfis: <UserIcon className="w-4 h-4" />,
};

const TAB_ORDER: Tab[] = ["posts", "comunidades", "comentarios", "midia", "perfis"];

export function CommunitySearchResults({ q, tab, onTabChange }: CommunitySearchResultsProps) {
  const [counts, setCounts] = useState<Record<Tab, number> | null>(null);
  const [state, setState] = useState<PageState<any>>(EMPTY);
  // Race-fix: cada request carrega a search key (`q::tab`) ativa no
  // momento; comparamos via ref (sempre fresh) ao receber a resposta.
  const searchKey = `${q.trim()}::${tab}`;
  const activeKeyRef = useRef(searchKey);
  useEffect(() => { activeKeyRef.current = searchKey; }, [searchKey]);

  const fetchPage1 = useCallback(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setState(EMPTY);
      return;
    }
    const myKey = `${trimmed}::${tab}`;
    activeKeyRef.current = myKey;
    setState({ ...EMPTY, loading: true });
    void (async () => {
      const res = await api.get<{
        items: any[]; page: number; totalPages: number; total: number;
      }>(`/api/community/search?q=${encodeURIComponent(trimmed)}&tab=${tab}&page=1`);
      if (activeKeyRef.current !== myKey) return;
      if (res.success && res.data) {
        setState({
          items: res.data.items,
          page: res.data.page,
          totalPages: res.data.totalPages,
          total: res.data.total,
          loading: false, loadingMore: false, error: null,
        });
      } else {
        setState({ ...EMPTY, error: res.error?.message || "Não foi possível buscar agora." });
      }
    })();
  }, [q, tab]);

  useEffect(() => {
    const trimmed = q.trim();
    setCounts(null);
    if (trimmed.length < 2) {
      return;
    }
    const myQ = trimmed;
    void (async () => {
      const res = await api.get<{ counts: Record<Tab, number> }>(
        `/api/community/search?counts=1&q=${encodeURIComponent(myQ)}`,
      );
      // Só aceita se o `q` ativo ainda for este (ref é sempre fresh).
      if (activeKeyRef.current.split("::")[0] !== myQ) return;
      if (res.success && res.data) setCounts(res.data.counts);
    })();
  }, [q]);

  useEffect(() => { fetchPage1(); }, [fetchPage1]);

  const loadMore = useCallback(async () => {
    const myKey = activeKeyRef.current;
    let nextPage = 0;
    setState((s) => {
      if (s.loadingMore || s.loading || s.page >= s.totalPages) {
        nextPage = 0;
        return s;
      }
      nextPage = s.page + 1;
      return { ...s, loadingMore: true };
    });
    if (nextPage === 0) return;
    const trimmed = q.trim();
    const res = await api.get<{ items: any[]; page: number; totalPages: number; total: number }>(
      `/api/community/search?q=${encodeURIComponent(trimmed)}&tab=${tab}&page=${nextPage}`,
    );
    if (activeKeyRef.current !== myKey) return;
    if (res.success && res.data) {
      setState((s) => {
        if (res.data!.page !== s.page + 1) {
          return { ...s, loadingMore: false };
        }
        return {
          items: [...s.items, ...res.data!.items],
          page: res.data!.page,
          totalPages: res.data!.totalPages,
          total: res.data!.total,
          loading: false, loadingMore: false, error: null,
        };
      });
    } else {
      setState((s) => ({ ...s, loadingMore: false }));
    }
  }, [q, tab]);

  const safeCount = (t: Tab) => counts?.[t] ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as Tab)}>
        <TabsList
          className="w-full justify-start overflow-x-auto scrollbar-hide mb-6"
          style={{ background: "transparent", padding: 0, gap: 4, height: "auto" }}
        >
          {TAB_ORDER.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="rn-search-tab"
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: "nowrap",
                color: tab === t ? "#fff" : "var(--rayo-forest-900)",
                background: tab === t ? "var(--rayo-terra-500)" : "var(--rayo-sand-200)",
                border: "1px solid " + (tab === t ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"),
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                {TAB_ICON[t]}
                {TAB_LABEL[t]}
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: tab === t ? "#fff" : "var(--rayo-ink-400)",
                }} aria-label={counts ? `${safeCount(t)} resultados` : "carregando contador"}>
                  ({counts == null ? "…" : safeCount(t) > 99 ? "99+" : safeCount(t)})
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_ORDER.map((t) => (
          <TabsContent key={t} value={t} className="mt-0">
            {tab === t && (
              <ResultsBody q={q} tab={t} state={state} onLoadMore={loadMore} onRetry={fetchPage1} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResultsBody({
  q, tab, state, onLoadMore, onRetry,
}: { q: string; tab: Tab; state: PageState<any>; onLoadMore: () => void; onRetry: () => void }) {
  if (state.loading) {
    return <ResultsSkeleton tab={tab} />;
  }
  if (state.error) {
    return (
      <div className="py-10 text-center" aria-live="polite">
        <p style={{ color: "var(--rayo-forest-900)", fontWeight: 600, marginBottom: 8 }}>
          {state.error}
        </p>
        <Button
          type="button"
          onClick={onRetry}
          style={{ background: "var(--rayo-terra-500)", color: "#fff", fontWeight: 700, borderRadius: 999 }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (state.items.length === 0) {
    return (
      <div className="py-12 text-center" aria-live="polite">
        <p style={{ color: "var(--rayo-forest-900)", fontWeight: 600, marginBottom: 4 }}>
          Nenhum resultado em {TAB_LABEL[tab]} para “{q.trim()}”
        </p>
        <p style={{ color: "var(--rayo-ink-400)", fontSize: 14 }}>
          Tente outras palavras-chave ou outra aba.
        </p>
      </div>
    );
  }

  return (
    <div className={tab === "midia" ? "" : "space-y-3"}>
      {tab === "posts"
        ? state.items.map((p) => (
            <PostCard
              key={p.id}
              post={hydratePostShape(p)}
              onComment={() => openPostById(p.id)}
              onShare={() => openPostById(p.id)}
              highlightTerm={q}
            />
          ))
        : tab === "midia"
        ? <MediaGrid items={state.items} />
        : tab === "comunidades"
        ? <div className="space-y-3">{state.items.map((f) => <ForumRow key={f.id} forum={f} />)}</div>
        : tab === "comentarios"
        ? <div className="space-y-3">{state.items.map((c) => <CommentRow key={c.id} comment={c} q={q} />)}</div>
        : <div className="space-y-3">{state.items.map((u) => <UserRow key={u.id} user={u} q={q} />)}</div>
      }

      {state.page < state.totalPages && (
        <div className="pt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={state.loadingMore}
            style={{
              borderColor: "var(--rayo-sand-300)",
              color: "var(--rayo-forest-900)",
              fontWeight: 600,
            }}
          >
            {state.loadingMore ? "Carregando…" : `Carregar mais (${state.total - state.items.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

// Skeleton de loading: linhas com formato adequado ao tab.
const SKELETON_STYLE: React.CSSProperties = {
  background: "var(--rayo-sand-200)",
  animation: "pulse 1.4s ease-in-out infinite",
};
function ResultsSkeleton({ tab }: { tab: Tab }) {
  if (tab === "midia") {
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }} aria-hidden role="status" aria-label="Carregando resultados">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ ...SKELETON_STYLE, aspectRatio: "1 / 1", borderRadius: 10 }} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3" aria-hidden role="status" aria-label="Carregando resultados">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          ...SKELETON_STYLE,
          height: tab === "perfis" || tab === "comunidades" ? 80 : 120,
          borderRadius: 12,
        }} />
      ))}
    </div>
  );
}

// Mídia tab: grade responsiva de thumbnails. Click na thumb abre
// lightbox; "Ver discussão" abre o post completo.
function MediaGrid({ items }: { items: any[] }) {
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; postId: number } | null>(null);
  const tiles = items
    .map((p) => ({
      postId: p.id,
      images: Array.isArray(p.images) ? p.images.filter((s: any) => typeof s === "string" && s) : [],
      content: p.content,
      title: p.title,
      author: p.author_name,
    }))
    .filter((t) => t.images.length > 0);

  if (tiles.length === 0) {
    return (
      <p className="py-8 text-center" style={{ color: "var(--rayo-ink-400)" }}>
        Nenhum post com mídia neste filtro.
      </p>
    );
  }

  return (
    <>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
      >
        {tiles.map((t) => (
          <div
            key={t.postId}
            role="button"
            tabIndex={0}
            onClick={() => setLightbox({ images: t.images, index: 0, postId: t.postId })}
            onKeyDown={cardKeyHandler(() => setLightbox({ images: t.images, index: 0, postId: t.postId }))}
            className={CARD_INTERACTIVE_CLASS}
            aria-label={`Abrir mídia do post de ${t.author}`}
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--rayo-sand-200)",
              border: "1px solid var(--rayo-sand-300)",
            }}
          >
            <img
              src={t.images[0]}
              alt={t.title || t.content?.slice(0, 60) || "Imagem do post"}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.4"; }}
            />
            {t.images.length > 1 && (
              <span
                style={{
                  position: "absolute", top: 6, right: 6,
                  background: "rgba(0,0,0,0.6)", color: "#fff",
                  fontSize: 11, fontWeight: 700,
                  padding: "2px 6px", borderRadius: 999,
                }}
              >
                +{t.images.length - 1}
              </span>
            )}
            <button
              type="button"
              onClick={stopBubble(() => openPostById(t.postId))}
              aria-label="Ver discussão do post"
              style={{
                position: "absolute", left: 6, bottom: 6,
                background: "var(--rayo-terra-500)", color: "#fff",
                fontSize: 11, fontWeight: 700,
                padding: "4px 8px", borderRadius: 999,
                border: "none", cursor: "pointer",
              }}
            >
              Ver discussão
            </button>
          </div>
        ))}
      </div>
      {lightbox && (
        <PostImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox((s) => (s ? { ...s, index: i } : s))}
        />
      )}
    </>
  );
}

// Adapta o shape "raw" do server pro shape interno que PostCard espera.
function hydratePostShape(p: any) {
  return {
    id: p.id,
    author: p.author_name,
    avatar: p.author_avatar || "/placeholder-avatar.jpg",
    time: new Date(p.created_at).toLocaleDateString("pt-BR"),
    content: p.content,
    title: p.title,
    category: p.category || "",
    likes: p.like_count,
    comments: p.comment_count,
    shares: p.share_count,
    isPinned: !!p.is_pinned,
    userReacted: !!p.user_liked,
    visibility: "comunidade",
    forum_id: p.forum_id,
    forum_name: p.forum_name,
    forum_slug: p.forum_slug,
    forum_icon: p.forum_icon,
    author_id: p.author_id,
    images: Array.isArray(p.images) ? p.images : [],
    image_refs: Array.isArray(p.image_refs) ? p.image_refs : [],
    is_saved: !!p.is_saved,
    reactions: Array.isArray(p.reactions) ? p.reactions : [],
    user_reaction: p.user_reaction ?? null,
  };
}

function ForumRow({ forum }: { forum: any }) {
  const open = () => openCommunityBySlug(forum.slug);
  const [subscribed, setSubscribed] = useState<boolean>(!!forum.is_subscribed);
  const [busy, setBusy] = useState(false);
  const toggleSubscribe = async () => {
    if (busy) return;
    const next = !subscribed;
    setSubscribed(next);
    setBusy(true);
    const res = await api.post<{ subscribed: boolean }>(
      `/api/community/forums/by-slug/${forum.slug}/subscribe`,
      { subscribed: next },
    );
    setBusy(false);
    if (!res.success) setSubscribed(!next);
  };
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={cardKeyHandler(open)}
      className={`p-4 flex items-center gap-3 ${CARD_INTERACTIVE_CLASS}`}
      aria-label={`Abrir comunidade ${forum.name}`}
      style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 48, height: 48, borderRadius: 999,
          background: "var(--rayo-terra-100)", fontSize: 24,
        }}
        aria-hidden
      >
        {forum.icon || "👥"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }} className="truncate">
            {forum.name}
          </h4>
        </div>
        <p className="text-[13px] truncate" style={{ color: "var(--rayo-ink-400)" }}>
          c/{forum.slug} · {forum.member_count} membros · {forum.post_count} posts
        </p>
        {forum.description && (
          <p className="text-[13px] mt-1 line-clamp-2" style={{ color: "var(--rayo-ink-400)" }}>
            {forum.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={stopBubble(toggleSubscribe)}
          disabled={busy}
          aria-label={subscribed ? `Sair da comunidade ${forum.name}` : `Entrar na comunidade ${forum.name}`}
          style={{
            background: subscribed ? "var(--rayo-sand-50)" : "var(--rayo-forest-900)",
            color: subscribed ? "var(--rayo-forest-900)" : "#fff",
            fontWeight: 700,
            borderRadius: 999,
            padding: "0 14px",
            border: subscribed ? "1px solid var(--rayo-sand-300)" : "none",
          }}
        >
          {subscribed ? "Inscrito" : "Entrar"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={stopBubble(open)}
          aria-label={`Visitar comunidade ${forum.name}`}
          style={{
            background: "var(--rayo-terra-500)",
            color: "#fff",
            fontWeight: 700,
            borderRadius: 999,
            padding: "0 14px",
          }}
        >
          Visitar
        </Button>
      </div>
    </Card>
  );
}

const ROLE_BADGE: Record<string, { label: string; bg: string; fg: string } | null> = {
  client: null,
  producer: { label: "Produtor", bg: "var(--rayo-forest-900)", fg: "#fff" },
  moderator: { label: "Moderador", bg: "var(--rayo-terra-500)", fg: "#fff" },
  admin: { label: "Admin", bg: "#7c2d12", fg: "#fff" },
};

function CommentRow({ comment, q }: { comment: any; q: string }) {
  const open = () => openPostById(comment.post_id, comment.id);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={cardKeyHandler(open)}
      className={`p-4 ${CARD_INTERACTIVE_CLASS}`}
      aria-label={`Abrir comentário em ${comment.post_title || "post"}`}
      style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
    >
      <div className="flex items-center gap-2 mb-2 text-[12px]" style={{ color: "var(--rayo-ink-400)" }}>
        <span>c/{comment.forum_slug}</span>
        <span>·</span>
        <span className="truncate" style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>
          {comment.post_title || comment.post_excerpt?.slice(0, 60) || "Post"}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <Avatar style={{ width: 32, height: 32 }}>
          <AvatarImage src={comment.author_avatar || undefined} alt={comment.author_name} />
          <AvatarFallback>{(comment.author_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p style={{ fontWeight: 600, fontSize: 13, color: "var(--rayo-forest-900)" }}>
            {comment.author_name}
          </p>
          <p className="text-[14px] mt-1 line-clamp-3" style={{ color: "var(--rayo-forest-900)" }}>
            <Highlighted text={comment.content} q={q} />
          </p>
          <p className="text-[12px] mt-2" style={{ color: "var(--rayo-ink-400)" }}>
            {new Date(comment.created_at).toLocaleDateString("pt-BR")} · {comment.like_count} curtidas
          </p>
        </div>
      </div>
    </Card>
  );
}

function UserRow({ user, q }: { user: any; q: string }) {
  // O schema atual não tem coluna `username`/`display_name`, então o
  // handle exibido é derivado do id (`@u<id>`) — estável e único.
  const handle = `@u${user.id}`;
  const role = ROLE_BADGE[user.role as string] ?? null;
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => openProfileById(user.id)}
      onKeyDown={cardKeyHandler(() => openProfileById(user.id))}
      className={`p-4 flex items-center gap-3 ${CARD_INTERACTIVE_CLASS}`}
      aria-label={`Abrir perfil de ${user.name}`}
      style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
    >
      <Avatar style={{ width: 48, height: 48 }}>
        <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
        <AvatarFallback>{(user.name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }} className="truncate">
            <Highlighted text={user.name || ""} q={q} />
          </h4>
          {role && (
            <Badge style={{ background: role.bg, color: role.fg, fontSize: 10, fontWeight: 700 }}>
              {role.label}
            </Badge>
          )}
        </div>
        <p className="text-[12px]" style={{ color: "var(--rayo-ink-400)" }}>
          <span style={{ fontWeight: 600 }}>{handle}</span> · {user.post_count} posts
        </p>
        {user.bio && (
          <p className="text-[13px] mt-1 line-clamp-2" style={{ color: "var(--rayo-ink-400)" }}>
            <Highlighted text={user.bio} q={q} />
          </p>
        )}
      </div>
    </Card>
  );
}

function Highlighted({ text, q }: { text: string; q: string }) {
  const term = q.trim();
  const parts = useMemo(() => {
    if (!term || term.length < 2) return [{ s: text, hit: false }];
    try {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const split = text.split(re);
      return split.map((s) => ({ s, hit: s.toLowerCase() === term.toLowerCase() }));
    } catch {
      return [{ s: text, hit: false }];
    }
  }, [text, term]);
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark
            key={i}
            style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-forest-900)", padding: "0 2px", borderRadius: 3 }}
          >
            {p.s}
          </mark>
        ) : (
          <span key={i}>{p.s}</span>
        ),
      )}
    </>
  );
}
