// Task #193 — Resultados da busca tabbed da Comunidade (Reddit-style).
// Renderizado pela ComunidadePage quando o usuário tem termo ativo (?q=).
// 5 tabs: Posts | Comunidades | Comentários | Mídia | Perfis. Cada tab
// pagina 10 itens por vez ("Carregar mais"). Tabs controlado (Radix):
// NUNCA passar value+defaultValue juntos.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { MessageCircle, Users, ImageIcon, FileText, User as UserIcon, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { PostCard } from "./ComunidadePage";
import {
  cardKeyHandler,
  openCommunityBySlug,
  openPostById,
  openProfileById,
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
  // Task #193 (race-fix) — toda request de busca carrega o "search key"
  // (`q::tab`) que estava ativo quando ela disparou. Quando a resposta
  // volta, comparamos com a key atual via ref (sempre fresh, imune a
  // closures stale) e descartamos qualquer payload que não pertence mais
  // ao estado atual. Cobre tanto fetch inicial quanto "Carregar mais".
  const searchKey = `${q.trim()}::${tab}`;
  const activeKeyRef = useRef(searchKey);
  useEffect(() => { activeKeyRef.current = searchKey; }, [searchKey]);

  // Carrega counts dos 5 tabs sempre que `q` muda. Curto-circuita pra
  // <2 chars. Counts dependem só de `q`, então a key de versionamento
  // aqui é só o termo trim'd.
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setCounts(null);
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

  // Carrega página 1 do tab ativo sempre que `q` ou `tab` mudam.
  // Reseta state ANTES do fetch pra evitar UI transitória stale.
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setState(EMPTY);
      return;
    }
    const myKey = `${trimmed}::${tab}`;
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
        setState({ ...EMPTY, error: "Não foi possível buscar agora." });
      }
    })();
  }, [q, tab]);

  const loadMore = useCallback(async () => {
    // Snapshot da key/página no momento do clique. Se o usuário mudou de
    // tab/query antes da resposta voltar, descartamos o payload pra não
    // misturar resultados de escopos diferentes.
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
        // Defesa extra: só anexa se a página retornada é exatamente a
        // próxima do que temos hoje (evita merge duplicado se o usuário
        // clica duas vezes em sequência).
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
              <span className="inline-flex items-center gap-2">
                {TAB_ICON[t]}
                {TAB_LABEL[t]}
                {counts && safeCount(t) > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                    background: tab === t ? "rgba(255,255,255,0.22)" : "var(--rayo-sand-50)",
                    color: tab === t ? "#fff" : "var(--rayo-ink-400)",
                  }}>{safeCount(t) > 99 ? "99+" : safeCount(t)}</span>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_ORDER.map((t) => (
          <TabsContent key={t} value={t} className="mt-0">
            {tab === t && (
              <ResultsBody q={q} tab={t} state={state} onLoadMore={loadMore} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResultsBody({
  q, tab, state, onLoadMore,
}: { q: string; tab: Tab; state: PageState<any>; onLoadMore: () => void }) {
  if (state.loading) {
    return (
      <div className="py-12 flex justify-center" aria-live="polite">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
      </div>
    );
  }
  if (state.error) {
    return <p className="py-8 text-center" style={{ color: "var(--rayo-ink-400)" }}>{state.error}</p>;
  }
  if (state.items.length === 0) {
    return (
      <div className="py-12 text-center" aria-live="polite">
        <p style={{ color: "var(--rayo-forest-900)", fontWeight: 600, marginBottom: 4 }}>
          Nenhum resultado em {TAB_LABEL[tab]}
        </p>
        <p style={{ color: "var(--rayo-ink-400)", fontSize: 14 }}>
          Tente outras palavras-chave ou outra aba.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tab === "posts" || tab === "midia"
        ? state.items.map((p) => (
            <PostCard key={p.id} post={hydratePostShape(p)} onComment={() => openPostById(p.id)} onShare={() => openPostById(p.id)} />
          ))
        : tab === "comunidades"
        ? state.items.map((f) => <ForumRow key={f.id} forum={f} />)
        : tab === "comentarios"
        ? state.items.map((c) => <CommentRow key={c.id} comment={c} q={q} />)
        : state.items.map((u) => <UserRow key={u.id} user={u} />)
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

// PostCard espera o shape interno do feed (chaves `author`, `time`, etc).
// Os endpoints de busca devolvem o shape "raw" do server (igual aos endpoints
// de listagem), então convertemos aqui pra reutilizar o componente sem fork.
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
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => openCommunityBySlug(forum.slug)}
      onKeyDown={cardKeyHandler(() => openCommunityBySlug(forum.slug))}
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
          {forum.is_subscribed && (
            <Badge style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-500)", fontSize: 10 }}>
              Inscrito
            </Badge>
          )}
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
    </Card>
  );
}

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

function UserRow({ user }: { user: any }) {
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
        <h4 style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }} className="truncate">
          {user.name}
        </h4>
        <p className="text-[13px]" style={{ color: "var(--rayo-ink-400)" }}>
          {user.post_count} posts
        </p>
        {user.bio && (
          <p className="text-[13px] mt-1 line-clamp-2" style={{ color: "var(--rayo-ink-400)" }}>
            {user.bio}
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
