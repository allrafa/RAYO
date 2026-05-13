import { MessageCircle, Share2, MoreHorizontal, Plus, TrendingUp, Users, Clock, Pin, Send, Search, Sparkles, UserPlus, ChevronRight, CheckCircle, Lock, Globe, Mail, Image as ImageIcon, Video, Smile, Bookmark, BookmarkCheck, Pencil, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { useSearchParams } from "react-router-dom";
import { CommunitySearchResults } from "./CommunitySearchResults";
import { userHasRole } from "./AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { onScrollTop } from "../lib/scrollTop";
import { useScrollRestore } from "../lib/scrollRestore";
import { DiscardDraftDialog } from "./DiscardDraftDialog";
import { PullToRefresh } from "./PullToRefresh";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyStateError, EmptyStateNoCommunity } from "./EmptyState";
import { enhancedToast } from "./EnhancedToast";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import {
  cardKeyHandler,
  stopBubble,
  openProfileById,
  openCommunityBySlug,
} from "../lib/cardClickTargets";
import { PostImageLightbox } from "./PostImageLightbox";
import { useUnreadBySection } from "./hooks/useUnreadBySection";
import { CreatePostModal } from "./CreatePostModal";
import { EmojiReactionPicker, ReactionsSummary, type ReactionAggregate } from "./EmojiReactionPicker";
import { FavoriteIcon } from "./FavoriteButton";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ConversasPage } from "./ConversasPage";
import { CommunityDetailPage } from "./CommunityDetailPage";
import { CreateCommunityModal } from "./CreateCommunityModal";
import { DiscussionPage } from "./DiscussionPage";
import { useTheme } from "./ThemeProvider";
import { api } from "../lib/api";

interface Forum {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  life_context: string | null;
  category: string;
  post_count: string;
  member_count: string | number;
  is_subscribed: boolean;
  // Task #202 — campos enriquecidos pra cards de Comunidades.
  is_moderator?: boolean;
  is_official?: boolean;
  cover_url?: string | null;
  created_by?: number | null;
  created_at?: string | null;
}

interface CommentData {
  id: number;
  content: string;
  parent_id: number | null;
  like_count: number;
  created_at: string;
  author_name: string;
  author_id: number;
  user_liked: boolean;
  // Task #122 — reações multi-emoji por comentário.
  reactions: ReactionAggregate[];
  user_reaction: string | null;
}

// Task #122 — onNavigate vem de App.tsx pra suportar back-to-home da
// DiscussionPage quando o usuário chegou via deep-link `/c/<slug>/p/<id>`
// ou pelo card de Discussões da Home.
export function ComunidadePage({ onNavigate }: { onNavigate?: (tab: string) => void } = {}) {
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  // Task #93 — modal de edição reusa o CreatePostModal com `editingPost`.
  const [editingPost, setEditingPost] = useState<any>(null);
  // Task #193 — busca tabbed inline (Reddit-style). URL é a fonte da verdade
  // (`?q=&tab=`) pra que o estado sobreviva refresh, back/forward e share.
  // Input é controlado localmente pra digitação fluída; debounce de 250ms
  // empurra o termo final pra URL (replace mode, sem encher o histórico).
  const [searchParams, setSearchParams] = useSearchParams();
  const ALLOWED_SEARCH_TABS = ["posts", "comunidades", "comentarios", "midia", "perfis"] as const;
  type SearchTab = (typeof ALLOWED_SEARCH_TABS)[number];
  const urlQ = searchParams.get("q") ?? "";
  const urlTabRaw = (searchParams.get("tab") ?? "posts").toLowerCase();
  const urlTab: SearchTab = (ALLOWED_SEARCH_TABS as readonly string[]).includes(urlTabRaw)
    ? (urlTabRaw as SearchTab)
    : "posts";
  const [searchInput, setSearchInput] = useState(urlQ);
  const isSearching = urlQ.trim().length >= 2;
  // Sincroniza o input com a URL quando ela muda externamente (re-tap,
  // back/forward, deep-link). Sem isso, ESC ou navegação ignora.
  useEffect(() => { setSearchInput(urlQ); }, [urlQ]);
  // Debounce: 250ms depois da última tecla, espelha o input no `?q=` da URL.
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === urlQ) return;
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (trimmed.length === 0) {
          next.delete("q");
          next.delete("tab");
        } else {
          next.set("q", trimmed);
          if (!next.get("tab")) next.set("tab", "posts");
        }
        return next;
      }, { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput, urlQ, setSearchParams]);
  const setSearchTab = useCallback((t: SearchTab) => {
    // Tab change empurra entrada nova no histórico (back/forward navega
    // entre tabs). Mudança de texto continua usando replace pra não
    // poluir histórico durante digitação.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", t);
      return next;
    });
  }, [setSearchParams]);
  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      next.delete("tab");
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const [currentView, setCurrentView] = useState<"feed" | "comunidades" | "conversas">("feed");
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  // Task #197 — escopo do feed: "geral" (todos os posts globais) ou
  // "minhas" (só fóruns assinados). URL é fonte da verdade (`?escopo=minhas`),
  // sessionStorage só persiste a preferência entre navegações da sessão.
  // Default é "geral" pra novos visitantes e pra anônimos (que não têm
  // assinaturas). `?escopo=geral` é omitido da URL (replace mode).
  type FeedScope = "geral" | "minhas";
  const parseScopeFromUrl = (): FeedScope | null => {
    const v = (searchParams.get("escopo") ?? "").toLowerCase();
    return v === "minhas" || v === "geral" ? (v as FeedScope) : null;
  };
  const initialFeedScope: FeedScope = (() => {
    const fromUrl = parseScopeFromUrl();
    if (fromUrl) return fromUrl;
    try {
      const stored = sessionStorage.getItem("rayo-community-feed-scope");
      if (stored === "minhas" || stored === "geral") return stored;
    } catch { /* noop */ }
    return "geral";
  })();
  const [feedScope, setFeedScope] = useState<FeedScope>(initialFeedScope);
  // Task #92 — Community detail page por slug. Quando setado, sobrepõe
  // tudo (header de tabs + composer escondidos) e renderiza CommunityDetailPage.
  // Task #176 — URL é fonte da verdade tanto pra `/c/<slug>` (community
  // detail) quanto pra `/c/<slug>/p/<id>` (discussão dedicada). Sem este
  // initializer, refresh ou entrada direta em `/c/<slug>` caía no feed
  // genérico em vez da comunidade — App.tsx não estaciona mais o slug
  // em sessionStorage (CustomEvent vem da busca/cards, mas link direto
  // / refresh não passa por lá).
  const parseSlugFromPath = (): string | null => {
    if (typeof window === "undefined") return null;
    const m = window.location.pathname.match(/^\/c\/([a-z0-9-]+)(?:\/p\/\d+)?\/?$/i);
    return m ? m[1].toLowerCase() : null;
  };
  const [activeCommunitySlug, setActiveCommunitySlug] = useState<string | null>(parseSlugFromPath);
  // Task #122 — Discussão dedicada `/c/<slug>/p/<id>`. URL é a fonte
  // da verdade: derivamos o estado do pathname no mount e em popstate.
  // Entrar em discussão = pushState; sair = history.back() (com
  // fallback pra pushState("/") quando não há histórico).
  const parseDiscussionFromPath = (): { postId: number; slug: string | null } | null => {
    if (typeof window === "undefined") return null;
    const m = window.location.pathname.match(/^\/c\/([a-z0-9-]+)\/p\/(\d+)\/?$/i);
    if (!m) return null;
    const id = parseInt(m[2], 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { postId: id, slug: m[1].toLowerCase() };
  };
  const [activeDiscussion, setActiveDiscussion] = useState<
    { postId: number; slug: string | null } | null
  >(parseDiscussionFromPath);

  // Task #117 — restaura scrollY do feed quando o usuário fecha o painel
  // de comentários OU sai da página de uma comunidade. Sem isso ele cai
  // no topo da lista e perde o contexto de onde estava.
  useScrollRestore("comunidade-feed", showComments || !!activeCommunitySlug);
  
  // Task #122 — likePost removido daqui; reações vivem no PostCard via
  // EmojiReactionPicker (que dispara o endpoint multi-emoji direto).
  const { posts, sharePost, loadPosts } = useApp();
  const { user: authUser } = useAuth();
  // Task #129 — badge de DMs na pílula "Mensagens" + decremento on-view
  // do badge de Comunidade na nav inferior. O endpoint
  // `/api/notifications/read-section/community` marca os kinds de
  // comunidade/turmas como lidos e dispara `notification:unread` via SSE,
  // que o `useUnreadBySection` já escuta pra ressincronizar.
  const { count: unreadMessages } = useUnreadMessages();
  const { community: unreadCommunity, refresh: refreshSections } = useUnreadBySection();
  useEffect(() => {
    if (!authUser || unreadCommunity <= 0) return;
    void api.post("/api/notifications/read-section/community").then(() => {
      void refreshSections();
    });
    // Roda quando o badge passa a >0 enquanto a página está montada
    // (post novo chegou enquanto o usuário tá olhando o feed).
  }, [authUser, unreadCommunity, refreshSections]);
  const { theme } = useTheme();
  const [forums, setForums] = useState<Forum[]>([]);
  const [forumsLoading, setForumsLoading] = useState(true);
  const [forumsError, setForumsError] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<CommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  // Task #115 — quando o post é aberto a partir de um card de comentário no
  // perfil, este id pede pro CommentsPanel rolar até esse comentário e
  // destacá-lo brevemente. Limpado no fechar do painel.
  const [highlightCommentId, setHighlightCommentId] = useState<number | null>(null);

  // Task #115 — declarado ANTES de openPostById porque este último o usa
  // como dependência do useCallback (TDZ-safe).
  const loadPostComments = useCallback(async (postId: number) => {
    setLoadingComments(true);
    try {
      const res = await api.get<{ post: { comments: CommentData[] } }>(`/api/community/posts/${postId}`);
      if (res.success && res.data) {
        setPostComments(res.data.post.comments);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  // Task #44 — deep-link de busca: quando um resultado de busca de
  // post é clicado, recebemos o id por CustomEvent. Tentamos abrir o
  // post da memória; se não estiver carregado, buscamos via
  // /api/community/posts/:id e abrimos do mesmo jeito.
  const openPostById = useCallback(
    async (id: number, highlight_comment_id?: number) => {
      // Task #115 — pré-seta o id de destaque ANTES do post entrar em
      // tela; CommentsPanel lê esse valor pra rolar quando os comments
      // carregarem. Se vier 0/undefined, limpa pra evitar carry-over.
      setHighlightCommentId(highlight_comment_id ?? null);
      const cached = posts.find((p) => p.id === id);
      if (cached) {
        setSelectedPost(cached);
        setShowComments(true);
        // Task #115 — sem isso o painel abre vazio quando vindo do perfil
        // (deep-link/search também). loadPostComments hidrata o painel.
        void loadPostComments(id);
        return;
      }
      const res = await api.get<{
        post: {
          id: number;
          author_name: string;
          author_avatar?: string | null;
          content: string;
          category: string;
          like_count: number;
          comment_count: number;
          share_count: number;
          is_pinned: boolean;
          user_liked: boolean;
          forum_id: number;
          forum_name?: string;
          forum_slug?: string;
          forum_icon?: string;
          author_id: number;
          created_at: string;
          title: string | null;
          images?: string[];
          // Task #122 — getPostDetail hidrata reações multi-emoji.
          reactions?: ReactionAggregate[];
          user_reaction?: string | null;
        };
      }>(`/api/community/posts/${id}`);
      if (res.success && res.data) {
        const p = res.data.post;
        setSelectedPost({
          id: p.id,
          author: p.author_name,
          avatar: p.author_avatar || "/placeholder-avatar.jpg",
          time: new Date(p.created_at).toLocaleDateString("pt-BR"),
          content: p.content,
          category: p.category || "",
          likes: p.like_count,
          comments: p.comment_count,
          shares: p.share_count,
          isPinned: p.is_pinned,
          userReacted: p.user_liked,
          visibility: "comunidade",
          forum_id: p.forum_id,
          forum_name: p.forum_name,
          forum_slug: p.forum_slug,
          forum_icon: p.forum_icon,
          author_id: p.author_id,
          images: Array.isArray(p.images) ? p.images : [],
          image_refs: [],
          is_saved: false,
          reactions: Array.isArray(p.reactions) ? p.reactions : [],
          user_reaction: p.user_reaction ?? null,
        });
        setShowComments(true);
        void loadPostComments(p.id);
      }
    },
    [posts, loadPostComments],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: number; highlight_comment_id?: number }>).detail;
      if (detail?.id) void openPostById(detail.id, detail.highlight_comment_id);
    };
    window.addEventListener("rayo:open-post", handler as EventListener);
    // Task #122 — popstate sincroniza activeDiscussion com a URL atual.
    // Garante que back/forward do navegador entrem/saiam da DiscussionPage
    // sem reload, e que /c/<slug> ainda funcione pelo handler abaixo.
    // Sincroniza ambos: discussão (`/c/<slug>/p/<id>`) e detalhe de
    // comunidade (`/c/<slug>`). Garante que back/forward do navegador
    // restaurem o ecrã correto sem reload nem desync de estado/URL.
    const onPop = () => {
      const path = window.location.pathname;
      const disc = parseDiscussionFromPath();
      setActiveDiscussion(disc);
      if (disc) {
        setActiveCommunitySlug(null);
      } else {
        const m = path.match(/^\/c\/([a-z0-9-]+)\/?$/i);
        setActiveCommunitySlug(m ? m[1].toLowerCase() : null);
      }
    };
    window.addEventListener("popstate", onPop);
    try {
      // Task #163 — chave migrada pra `rayo-pending-post`. Lê a nova
      // primeiro, cai pra legada como fallback de transição (sessions
      // que pegaram o set antigo via tab antiga ainda navegam ok).
      const pending =
        sessionStorage.getItem("rayo-pending-post") ??
        sessionStorage.getItem("raio-pending-post");
      if (pending) {
        sessionStorage.removeItem("rayo-pending-post");
        sessionStorage.removeItem("raio-pending-post");
        const pendingComment =
          sessionStorage.getItem("rayo-pending-post-comment") ??
          sessionStorage.getItem("raio-pending-post-comment");
        if (pendingComment) {
          sessionStorage.removeItem("rayo-pending-post-comment");
          sessionStorage.removeItem("raio-pending-post-comment");
        }
        void openPostById(
          Number(pending),
          pendingComment ? Number(pendingComment) : undefined,
        );
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener("rayo:open-post", handler as EventListener);
      window.removeEventListener("popstate", onPop);
    };
  }, [openPostById]);

  // Task #115 — re-tap na aba Comunidade volta ao topo (handler global em
  // App.tsx já rola a window). Aqui aproveitamos pra resetar o subreddit
  // ativo se houver, devolvendo o usuário ao Feed sem precisar do botão Voltar.
  // Task #193 — re-tap também limpa a busca tabbed (q/tab da URL).
  useEffect(() => {
    return onScrollTop(() => {
      setActiveCommunitySlug(null);
      clearSearch();
    }, "comunidade");
  }, [clearSearch]);

  // Task #92 — deep-link `/c/<slug>`. Recebe via sessionStorage
  // (`rayo-pending-community-slug`) ou CustomEvent `rayo:open-community`.
  // Setamos o slug ativo, e o render-tree mostra <CommunityDetailPage>
  // (subreddit-style com header, subscribe e tabs Posts/Sobre).
  const openCommunityBySlug = useCallback((slug: string) => {
    if (!slug) return;
    setActiveCommunitySlug(slug);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string }>).detail;
      if (detail?.slug) void openCommunityBySlug(detail.slug);
    };
    window.addEventListener("rayo:open-community", handler as EventListener);
    try {
      // Task #163 — fallback pra chave legada `raio-pending-community-slug`
      // cobre tabs com SPA antigo no mesmo device.
      const pending =
        sessionStorage.getItem("rayo-pending-community-slug") ??
        sessionStorage.getItem("raio-pending-community-slug");
      if (pending) {
        sessionStorage.removeItem("rayo-pending-community-slug");
        sessionStorage.removeItem("raio-pending-community-slug");
        void openCommunityBySlug(pending);
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener("rayo:open-community", handler as EventListener);
    };
  }, [openCommunityBySlug]);

  const loadForums = useCallback(async () => {
    setForumsLoading(true);
    setForumsError(null);
    try {
      const res = await api.get<{ forums: Forum[] }>("/api/community/forums");
      if (res.success && res.data) {
        setForums(res.data.forums);
      } else {
        setForumsError("Não foi possível carregar a comunidade");
      }
    } catch (err) {
      console.error("Error loading forums:", err);
      setForumsError("Não foi possível carregar a comunidade");
    } finally {
      setForumsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForums();
  }, [loadForums]);

  // Task #92 — "Em alta" puxa do servidor (likes+comments 48h).

  // Task #197 — recarrega o feed respeitando o escopo selecionado.
  // Declarado ANTES de submitComment pra evitar TDZ no useCallback que
  // depende dele.
  const reloadFeed = useCallback(
    () => loadPosts(feedScope === "minhas" ? "subscribed" : "all"),
    [loadPosts, feedScope],
  );

  // Task #197 — carrega o feed sempre que o escopo muda (ou no mount,
  // sobrescrevendo o load default que o AppContext dispara).
  useEffect(() => {
    void reloadFeed();
  }, [reloadFeed]);

  // Task #197 — sincroniza URL e sessionStorage com o escopo. `?escopo=geral`
  // é omitido (replace mode) pra não poluir histórico, igual ao padrão de
  // `?segmento=` em Academia.
  useEffect(() => {
    try {
      sessionStorage.setItem("rayo-community-feed-scope", feedScope);
    } catch { /* noop */ }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (feedScope === "geral") next.delete("escopo");
      else next.set("escopo", "minhas");
      return next;
    }, { replace: true });
  }, [feedScope, setSearchParams]);

  // Task #197 — URL → state: back/forward do navegador (ou navegação
  // externa que mude `?escopo=`) precisa atualizar o estado pra manter
  // a URL como fonte da verdade. Sem isso, voltar pra uma URL com
  // `?escopo=minhas` não restaura o toggle.
  useEffect(() => {
    const fromUrl = (searchParams.get("escopo") ?? "").toLowerCase();
    const next: FeedScope = fromUrl === "minhas" ? "minhas" : "geral";
    if (next !== feedScope) setFeedScope(next);
  }, [searchParams, feedScope]);

  // Task #197 — logout reseta pra "geral" (anônimo não tem assinaturas).
  useEffect(() => {
    if (!authUser && feedScope !== "geral") setFeedScope("geral");
  }, [authUser, feedScope]);

  const submitComment = useCallback(async (postId: number, content: string) => {
    const res = await api.post<{ comment: Omit<CommentData, "reactions" | "user_reaction"> & { reactions?: ReactionAggregate[]; user_reaction?: string | null } }>(`/api/community/posts/${postId}/comments`, { content });
    if (res.success && res.data) {
      // Task #122 — comentário recém-criado nunca tem reações ainda.
      const c = res.data!.comment;
      setPostComments(prev => [...prev, {
        ...c,
        reactions: Array.isArray(c.reactions) ? c.reactions : [],
        user_reaction: c.user_reaction ?? null,
      }]);
      await reloadFeed();
      return true;
    }
    return false;
  }, [reloadFeed]);

  // Task #122 — atualiza reações de um comentário no estado local. O
  // EmojiReactionPicker faz a requisição; aqui só sincronizamos o
  // CommentsPanel sem refetch (otimista, mas usando dados do server).
  const updateCommentReactions = useCallback(
    (commentId: number, next: { reactions: ReactionAggregate[]; userReaction: string | null }) => {
      setPostComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? {
                ...c,
                reactions: next.reactions,
                user_reaction: next.userReaction,
                like_count: next.reactions.reduce((acc, r) => acc + r.count, 0),
                user_liked: next.userReaction === "❤️",
              }
            : c,
        ),
      );
    },
    [],
  );

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([reloadFeed(), loadForums()]);
    } catch (error) {
      console.error("Erro ao atualizar feed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const groups = forums.map(f => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    members: Number(f.member_count) || 0,
    isJoined: !!f.is_subscribed,
    category: f.category,
    activeNow: 0,
    postsToday: parseInt(String(f.post_count)) || 0,
    image: f.cover_url || "",
    description: f.description,
    icon: f.icon,
    // Task #202 — campos extras pra badges nos cards.
    is_moderator: !!f.is_moderator,
    is_official: !!f.is_official,
    created_at: f.created_at ?? null,
  }));

  // Hashtags estáticas exibidas no sidebar do FeedView ("Tópicos em Alta").
  const trendingTopics: Array<{ topic: string; posts: number; trend: string }> = [
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 max-w-7xl mx-auto">
        <SkeletonLoader type="post" count={3} />
      </div>
    );
  }

  // Task #92 — quando há slug ativo, renderiza a vista dedicada da
  // comunidade (CommunityDetailPage) por cima de tudo na própria aba
  // Comunidade (sem reload). Voltar limpa o slug e volta pro Feed.
  if (activeCommunitySlug) {
    return (
      <div
        className="ra-page min-h-screen pt-4"
        style={{ background: "var(--rayo-sand-100)" }}
      >
        <CommunityDetailPage
          slug={activeCommunitySlug}
          onBack={() => setActiveCommunitySlug(null)}
          onOpenProfile={(uid) => openProfileById(uid)}
          onOpenPost={(id) => {
            // Task #122 — clicar num post da CommunityDetailPage entra
            // na DiscussionPage. URL é a fonte da verdade: pushState
            // canônica `/c/<slug>/p/<id>` e popstate sincroniza state.
            try {
              window.history.pushState({}, "", `/c/${activeCommunitySlug}/p/${id}`);
            } catch { /* noop */ }
            setActiveCommunitySlug(null);
            setActiveDiscussion({ postId: id, slug: activeCommunitySlug });
          }}
        />
      </div>
    );
  }

  // Task #122 — Discussão dedicada (`/c/<slug>/p/<id>`). Sobrepõe o feed
  // sem reload. Back é history-aware: history.back() pra restaurar a URL
  // anterior; quando não há histórico (deep-link com refresh), fallback
  // pra pushState("/") + revertir tab pra Home.
  if (activeDiscussion) {
    return (
      <div
        className="ra-page min-h-screen pt-2"
        style={{ background: "var(--rayo-sand-100)" }}
      >
        <DiscussionPage
          postId={activeDiscussion.postId}
          slug={activeDiscussion.slug}
          onBack={() => {
            // History-aware: se tem entrada anterior, usa back nativo
            // (popstate sincroniza activeDiscussion via URL). Se for
            // deep-link puro (history.length === 1), fallback pra Home.
            if (typeof window === "undefined") return;
            if (window.history.length > 1) {
              window.history.back();
            } else {
              try {
                window.history.pushState({}, "", "/");
              } catch { /* noop */ }
              setActiveDiscussion(null);
              onNavigate?.("home");
            }
          }}
        />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div
        className="ra-page min-h-screen"
        style={{ background: 'var(--rayo-sand-100)' }}
      >
        {/* NAVIGATION TABS - Sticky */}
        <div 
          className="sticky top-0 z-40"
          style={{ 
            background: 'var(--rayo-sand-100)',
            borderBottom: '1px solid var(--rayo-sand-300)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6" style={{ display: isSearching ? "none" : undefined }}>
            <div className="flex gap-1 pt-6 overflow-x-auto scrollbar-hide">
              <Button
                variant="ghost"
                className="relative px-6 py-3 rounded-none border-b-2 transition-all whitespace-nowrap"
                onClick={() => setCurrentView("feed")}
                style={{ 
                  fontWeight: currentView === "feed" ? 700 : 500,
                  borderColor: currentView === "feed" ? 'var(--rayo-terra-500)' : 'transparent',
                  color: currentView === "feed" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "feed") {
                    e.currentTarget.style.color = 'var(--rayo-forest-900)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "feed") {
                    e.currentTarget.style.color = 'var(--rayo-ink-400)';
                  }
                }}
              >
                Feed
              </Button>
              <Button
                variant="ghost"
                className="relative px-6 py-3 rounded-none border-b-2 transition-all whitespace-nowrap"
                onClick={() => setCurrentView("comunidades")}
                style={{ 
                  fontWeight: currentView === "comunidades" ? 700 : 500,
                  borderColor: currentView === "comunidades" ? 'var(--rayo-terra-500)' : 'transparent',
                  color: currentView === "comunidades" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "comunidades") {
                    e.currentTarget.style.color = 'var(--rayo-forest-900)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "comunidades") {
                    e.currentTarget.style.color = 'var(--rayo-ink-400)';
                  }
                }}
              >
                Comunidades
              </Button>
              <Button
                variant="ghost"
                className="relative px-6 py-3 rounded-none border-b-2 transition-all whitespace-nowrap"
                onClick={() => setCurrentView("conversas")}
                style={{ 
                  fontWeight: currentView === "conversas" ? 700 : 500,
                  borderColor: currentView === "conversas" ? 'var(--rayo-terra-500)' : 'transparent',
                  color: currentView === "conversas" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "conversas") {
                    e.currentTarget.style.color = 'var(--rayo-forest-900)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "conversas") {
                    e.currentTarget.style.color = 'var(--rayo-ink-400)';
                  }
                }}
              >
                <span className="relative inline-flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Mensagens
                  {unreadMessages > 0 && (
                    <span
                      aria-label={`${unreadMessages} mensagem${unreadMessages === 1 ? "" : "s"} não lida${unreadMessages === 1 ? "" : "s"}`}
                      style={{
                        marginLeft: 8,
                        minWidth: 18,
                        height: 18,
                        padding: "0 5px",
                        borderRadius: 9,
                        background: "var(--rayo-terra-500)",
                        color: "var(--rayo-sand-50)",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: "18px",
                        display: "inline-block",
                        textAlign: "center",
                      }}
                    >
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Task #93 — Header limpo: barra de busca clicável + botão "+"
            substituem o composer "No que pensando" e as pílulas flutuantes
            do MobileTopBar. Visível em todas as views da Comunidade. */}
        <section
          style={{
            background: 'var(--rayo-sand-50)',
            borderBottom: '1px solid var(--rayo-sand-300)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="max-w-2xl mx-auto flex items-center gap-2">
              {/* Task #193 — input real (substitui o botão que abria a
                  MobileSearchPage). Digitar mostra os 5 tabs Reddit-style
                  inline. ESC ou botão X limpa. */}
              <div
                className="flex-1 flex items-center gap-2"
                style={{
                  height: 44,
                  padding: '0 12px 0 16px',
                  borderRadius: 999,
                  background: 'var(--rayo-sand-100)',
                  border: '1px solid var(--rayo-sand-300)',
                }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--rayo-ink-400)' }} aria-hidden />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") clearSearch(); }}
                  placeholder="Buscar posts, comunidades, pessoas…"
                  aria-label="Buscar na comunidade"
                  className="flex-1 bg-transparent border-0 outline-none text-[15px]"
                  style={{ color: 'var(--rayo-forest-900)' }}
                  autoComplete="off"
                />
                {searchInput.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Limpar busca"
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 28, height: 28, borderRadius: 999,
                      background: 'var(--rayo-sand-300)',
                      color: 'var(--rayo-forest-900)',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePost(true)}
                className="flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: 'var(--rayo-terra-500)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(200,85,61,0.25)',
                }}
                aria-label="Criar publicação"
                title="Criar publicação"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Task #193 — quando há busca ativa, esconde feed/grupos/conversas
              e renderiza o painel tabbed Reddit-style. */}
          {isSearching && (
            <CommunitySearchResults q={urlQ} tab={urlTab} onTabChange={setSearchTab} />
          )}
          {!isSearching && currentView === "feed" && (
            <FeedView 
              posts={posts}
              onComment={(post) => {
                setSelectedPost(post);
                setShowComments(true);
                loadPostComments(post.id);
              }}
              onShare={(post) => {
                setSelectedPost(post);
                setShowShare(true);
              }}
              trendingTopics={trendingTopics}
              onMutated={reloadFeed}
              onEdit={(p) => setEditingPost(p)}
              feedScope={feedScope}
              onScopeChange={setFeedScope}
              isAuthenticated={!!authUser}
              hasSubscriptions={forums.some(f => f.is_subscribed)}
              onOpenComunidades={() => setCurrentView("comunidades")}
            />
          )}

          {!isSearching && currentView === "comunidades" && (
            <ComunidadesView 
              groups={groups}
              loading={forumsLoading}
              error={forumsError}
              onRetry={loadForums}
              isAuthenticated={!!authUser}
              onCreateCommunity={() => setShowCreateCommunity(true)}
            />
          )}

          {!isSearching && currentView === "conversas" && (
            <div className="-mx-6 -my-8">
              <ConversasPage />
            </div>
          )}
        </div>

        {/* Comments Panel */}
        {showComments && selectedPost && (
          <CommentsPanel
            post={selectedPost}
            comments={postComments}
            loadingComments={loadingComments}
            onClose={() => { setShowComments(false); setSelectedPost(null); setPostComments([]); setHighlightCommentId(null); }}
            onSubmitComment={(content) => submitComment(selectedPost.id, content)}
            onCommentReactionsChange={updateCommentReactions}
            highlightCommentId={highlightCommentId}
          />
        )}

        {/* Task #198 — Create Community Modal */}
        <CreateCommunityModal
          open={showCreateCommunity}
          onOpenChange={setShowCreateCommunity}
          onCreated={(slug) => {
            void loadForums();
            // Abre a comunidade recém-criada direto na CommunityDetailPage.
            openCommunityBySlug(slug);
          }}
        />

        {/* Create Post Modal */}
        {(showCreatePost || editingPost) && (
          <CreatePostModal
            open={showCreatePost || !!editingPost}
            onOpenChange={(open) => {
              setShowCreatePost(open);
              if (!open) setEditingPost(null);
            }}
            currentPage="comunidade"
            editingPost={editingPost}
          />
        )}
      </div>
    </PullToRefresh>
  );
}

// FEED VIEW
interface FeedViewProps {
  posts: any[];
  onComment: (post: any) => void;
  onShare: (post: any) => void;
  trendingTopics: any[];
  onMutated?: () => void;
  onEdit?: (post: any) => void;
  // Task #197 — segmented control "Geral" × "Minhas comunidades".
  feedScope: "geral" | "minhas";
  onScopeChange: (s: "geral" | "minhas") => void;
  isAuthenticated: boolean;
  hasSubscriptions: boolean;
  onOpenComunidades: () => void;
}

function FeedView({ posts, onComment, onShare, trendingTopics, onMutated, onEdit, feedScope, onScopeChange, isAuthenticated, hasSubscriptions, onOpenComunidades }: FeedViewProps) {
  // Task #197 — pílulas pra alternar escopo. Só renderiza "Minhas comunidades"
  // pra usuários logados (anônimo não tem assinaturas).
  const scopePillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 999,
    border: '1px solid',
    borderColor: active ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-200)',
    background: active ? 'var(--rayo-terra-500)' : 'transparent',
    color: active ? '#fff' : 'var(--rayo-ink-500)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  });
  const isEmptyMinhas = feedScope === "minhas" && posts.length === 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Feed */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 
            className="text-[24px]" 
            style={{ 
              fontWeight: 700, 
              color: 'var(--rayo-forest-900)' 
            }}
          >
            Feed da Comunidade
          </h2>
          <Badge 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--rayo-terra-100)',
              color: 'var(--rayo-terra-500)',
            }}
          >
            {posts.length} posts
          </Badge>
        </div>

        {/* Task #197 — segmented control de escopo */}
        <div
          role="tablist"
          aria-label="Escopo do feed"
          className="flex items-center gap-2 mb-4 flex-wrap"
        >
          <button
            type="button"
            role="tab"
            aria-selected={feedScope === "geral"}
            onClick={() => onScopeChange("geral")}
            style={scopePillStyle(feedScope === "geral")}
            data-testid="feed-scope-geral"
          >
            Geral
          </button>
          {isAuthenticated && (
            <button
              type="button"
              role="tab"
              aria-selected={feedScope === "minhas"}
              onClick={() => onScopeChange("minhas")}
              style={scopePillStyle(feedScope === "minhas")}
              data-testid="feed-scope-minhas"
            >
              Minhas comunidades
            </button>
          )}
        </div>

        {isEmptyMinhas ? (
          <div
            className="ra-card"
            style={{ padding: 32, textAlign: 'center' }}
          >
            <Users
              className="mx-auto mb-3"
              style={{ width: 40, height: 40, color: 'var(--rayo-terra-500)' }}
            />
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--rayo-forest-900)',
                marginBottom: 8,
              }}
            >
              {hasSubscriptions ? "Nenhum post por enquanto" : "Você ainda não acompanha nenhuma comunidade"}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: 'var(--rayo-ink-400)',
                marginBottom: 16,
                maxWidth: 360,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              {hasSubscriptions
                ? "As comunidades que você acompanha ainda não têm posts. Que tal puxar uma conversa por lá ou explorar mais comunidades?"
                : "Entre nas comunidades que combinam com você pra ver os posts dos membros aqui."}
            </p>
            <Button
              type="button"
              onClick={onOpenComunidades}
              style={{
                background: 'var(--rayo-terra-500)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              Explorar comunidades
            </Button>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              onComment={() => onComment(post)}
              onShare={() => onShare(post)}
              onMutated={onMutated}
              onEdit={onEdit}
            />
          ))
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Trending Topics */}
        <div className="ra-card" style={{ padding: 0 }}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp 
                className="w-5 h-5" 
                style={{ color: 'var(--rayo-terra-500)' }} 
              />
              <h3 
                className="text-[18px]" 
                style={{ 
                  fontWeight: 700, 
                  color: 'var(--rayo-forest-900)' 
                }}
              >
                Tópicos em Alta
              </h3>
            </div>
            <div className="ra-disc-list">
              {trendingTopics.map((topic, index) => (
                <button
                  key={index}
                  type="button"
                  className="ra-disc-item"
                >
                  <div className="ra-disc-avatar terra">#</div>
                  <div className="ra-disc-body">
                    <h4 className="ra-disc-title" style={{ color: 'var(--rayo-terra-500)' }}>
                      {topic.topic}
                    </h4>
                    <p className="ra-disc-snippet">{topic.posts} posts</p>
                  </div>
                  <span className="ra-tag terra">{topic.trend}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          className="ra-card"
          style={{
            background: 'var(--rayo-terra-100)',
            borderColor: 'var(--rayo-terra-500)',
            padding: 0,
          }}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles 
                className="w-5 h-5" 
                style={{ color: 'var(--rayo-terra-500)' }} 
              />
              <h3 
                className="text-[18px]" 
                style={{ 
                  fontWeight: 700, 
                  color: 'var(--rayo-forest-900)' 
                }}
              >
                Você esta semana
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="ra-metric" style={{ alignItems: 'center', textAlign: 'center', padding: 12 }}>
                <div className="ra-metric-value" style={{ fontSize: 20 }}>5</div>
                <div className="ra-metric-label">Posts criados</div>
              </div>
              <div className="ra-metric" style={{ alignItems: 'center', textAlign: 'center', padding: 12 }}>
                <div className="ra-metric-value" style={{ fontSize: 20 }}>28</div>
                <div className="ra-metric-label">Comentários</div>
              </div>
              <div className="ra-metric" style={{ alignItems: 'center', textAlign: 'center', padding: 12 }}>
                <div className="ra-metric-value" style={{ fontSize: 20 }}>142</div>
                <div className="ra-metric-label">Curtidas</div>
              </div>
              <div className="ra-metric" style={{ alignItems: 'center', textAlign: 'center', padding: 12 }}>
                <div className="ra-metric-value" style={{ fontSize: 20 }}>3</div>
                <div className="ra-metric-label">Comunidades ativas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// COMUNIDADES VIEW (Task #202 — renomeada de GruposView)
interface ComunidadesViewProps {
  groups: any[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isAuthenticated?: boolean;
  onCreateCommunity?: () => void;
}

// Tamanho da página: cresce em múltiplos desse valor a cada "Mostrar mais".
const EXPLORAR_PAGE_SIZE = 6;
type ComunidadesSubTab = "inscritas" | "explorar";
const COMUNIDADES_TAB_STORAGE = "rayo-community-comunidades-tab";

function ComunidadesView({ groups, loading, error, onRetry, isAuthenticated, onCreateCommunity }: ComunidadesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(EXPLORAR_PAGE_SIZE);

  const subscribedGroups = useMemo(() => groups.filter(g => g.isJoined), [groups]);
  const exploreGroups = useMemo(() => groups.filter(g => !g.isJoined), [groups]);

  // Sub-tab default: respeita preferência salva na sessão; senão "inscritas"
  // se o usuário tem ≥1 assinatura, senão "explorar". Como `groups` chega
  // async, marcamos `subTabUserSet` quando o usuário interage manualmente
  // pra que a inicialização auto-corrija ao chegar dados sem sobrescrever
  // escolha explícita.
  const storedTab = (() => {
    try {
      const v = sessionStorage.getItem(COMUNIDADES_TAB_STORAGE);
      if (v === "inscritas" || v === "explorar") return v as ComunidadesSubTab;
    } catch { /* noop */ }
    return null;
  })();
  const [subTab, setSubTab] = useState<ComunidadesSubTab>(storedTab ?? "explorar");
  const [subTabUserSet, setSubTabUserSet] = useState<boolean>(storedTab !== null);
  // Auto-corrige pra "inscritas" assim que os forums carregarem, se o
  // usuário não tem preferência salva nem mexeu manualmente.
  useEffect(() => {
    if (subTabUserSet) return;
    if (subscribedGroups.length > 0 && subTab !== "inscritas") {
      setSubTab("inscritas");
    }
  }, [subscribedGroups.length, subTab, subTabUserSet]);
  useEffect(() => {
    if (!subTabUserSet) return;
    try { sessionStorage.setItem(COMUNIDADES_TAB_STORAGE, subTab); } catch { /* noop */ }
  }, [subTab, subTabUserSet]);

  // Lista-base depende da sub-tab.
  const baseGroups = subTab === "inscritas" ? subscribedGroups : exploreGroups;

  // Categorias distintas extraídas da lista-base. Mantém ordem de primeira
  // aparição (estável entre renders) e ignora vazias.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const g of baseGroups) {
      const c = (g.category ?? "").trim();
      if (c && !seen.has(c)) { seen.add(c); ordered.push(c); }
    }
    return ordered;
  }, [baseGroups]);

  const filteredGroups = selectedCategory
    ? baseGroups.filter(g => g.category === selectedCategory)
    : baseGroups;

  const visibleGroups = filteredGroups.slice(0, visibleCount);
  const hasMore = visibleCount < filteredGroups.length;

  // Reseta paginação ao trocar de categoria/sub-tab.
  const onSelectCategory = useCallback((cat: string | null) => {
    setSelectedCategory(cat);
    setVisibleCount(EXPLORAR_PAGE_SIZE);
  }, []);
  const onChangeSubTab = useCallback((t: ComunidadesSubTab) => {
    setSubTab(t);
    setSubTabUserSet(true);
    setSelectedCategory(null);
    setVisibleCount(EXPLORAR_PAGE_SIZE);
  }, []);

  if (loading && groups.length === 0) {
    return (
      <div className="space-y-4">
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  if (error) {
    return <EmptyStateError onRetry={onRetry} />;
  }

  if (groups.length === 0) {
    return <EmptyStateNoCommunity />;
  }

  const subPillStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 999,
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    background: active ? "var(--rayo-terra-500)" : "var(--rayo-sand-100)",
    color: active ? "#fff" : "var(--rayo-ink-600)",
    border: `1px solid ${active ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)"}`,
    cursor: "pointer",
    transition: "all .15s ease",
  });

  return (
    <div className="space-y-6">
      {/* Header — Comunidades */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h2
            className="text-[28px] leading-tight"
            style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
          >
            Comunidades
          </h2>
          <p className="text-[14px] mt-1" style={{ color: 'var(--rayo-ink-400)' }}>
            Descubra comunidades sobre família, relacionamento, fé e propósito.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            style={{
              fontSize: '12px',
              fontWeight: 600,
              background: 'var(--rayo-terra-100)',
              color: 'var(--rayo-terra-500)',
            }}
          >
            {filteredGroups.length} {filteredGroups.length === 1 ? 'comunidade' : 'comunidades'}
          </Badge>
          {isAuthenticated && onCreateCommunity && (
            <Button size="sm" onClick={onCreateCommunity} className="gap-2">
              <Plus className="w-4 h-4" /> Criar
            </Button>
          )}
        </div>
      </div>

      {/* Sub-tabs Inscritas × Explorar */}
      {isAuthenticated && (
        <div className="flex gap-2" role="tablist" aria-label="Filtrar comunidades">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "inscritas"}
            onClick={() => onChangeSubTab("inscritas")}
            style={subPillStyle(subTab === "inscritas")}
          >
            Inscritas {subscribedGroups.length > 0 && `(${subscribedGroups.length})`}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "explorar"}
            onClick={() => onChangeSubTab("explorar")}
            style={subPillStyle(subTab === "explorar")}
          >
            Explorar {exploreGroups.length > 0 && `(${exploreGroups.length})`}
          </button>
        </div>
      )}

      {/* Chips de filtro por categoria — só quando há ≥2 categorias */}
      {categories.length >= 2 && (
        <div className="overflow-x-auto scrollbar-hide -mx-6 px-6" role="tablist" aria-label="Filtrar por categoria">
          <div className="flex gap-2 pb-2" style={{ width: 'max-content' }}>
            <CategoryChip
              label="Todas"
              active={selectedCategory === null}
              onClick={() => onSelectCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onClick={() => onSelectCategory(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grade única (estilo Reddit) */}
      {filteredGroups.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p style={{ color: 'var(--rayo-ink-400)' }}>
            {subTab === "inscritas"
              ? "Você ainda não entrou em nenhuma comunidade."
              : "Nenhuma comunidade nessa categoria por enquanto."}
          </p>
          {subTab === "inscritas" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangeSubTab("explorar")}
              style={{ fontWeight: 600 }}
            >
              Explorar comunidades
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleGroups.map((group) => (
              <CommunityCard key={group.id} group={group} />
            ))}
          </div>

          {hasMore && (
            <div className="pt-2 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((n) => n + EXPLORAR_PAGE_SIZE)}
                style={{ fontWeight: 600 }}
              >
                Mostrar mais
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Chip de filtro de categoria — estilo "pill" minimalista (Reddit-like).
function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="rayo-focus-ring transition-all duration-150"
      style={{
        padding: '6px 14px',
        borderRadius: 9999,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: active ? 'var(--rayo-terra-500)' : 'var(--rayo-sand-200)',
        color: active ? '#FFFFFF' : 'var(--rayo-forest-900)',
        border: '1px solid transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// Task #193 — helper de highlight inline. Quebra o texto em segmentos
// case-insensitive e envolve matches em <mark>. Termo < 2 chars ou vazio
// devolve o texto original sem nenhum nó extra.
function renderHighlighted(text: string | null | undefined, term: string | null | undefined): React.ReactNode {
  const t = (text ?? "").toString();
  const q = (term ?? "").trim();
  if (!t) return null;
  if (q.length < 2) return t;
  const lower = t.toLowerCase();
  const needle = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < t.length) {
    const idx = lower.indexOf(needle, i);
    if (idx < 0) { out.push(t.slice(i)); break; }
    if (idx > i) out.push(t.slice(i, idx));
    out.push(
      <mark key={key++} style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-500)", padding: "0 2px", borderRadius: 2 }}>
        {t.slice(idx, idx + needle.length)}
      </mark>,
    );
    i = idx + needle.length;
  }
  return out;
}

// POST CARD COMPONENT
interface PostCardProps {
  post: any;
  onComment: () => void;
  onShare: () => void;
  // Task #93 — recarregar lista após delete; abrir modal de edição.
  onMutated?: () => void;
  onEdit?: (post: any) => void;
  // Task #193 — highlight inline do termo buscado no corpo do post.
  highlightTerm?: string;
}

// Task #99 — exportado pra ser reusado em contextos escopados (ex.:
// TurmaCommunityTab). Requer AppProvider/AuthProvider no ascendente.
export function PostCard({ post, onComment, onShare, onMutated, onEdit, highlightTerm }: PostCardProps) {
  // Task #122 — estado local de reações; hidratado a partir do que veio
  // no payload (`/api/community/posts*` agora devolve `reactions[]` e
  // `user_reaction`). EmojiReactionPicker faz a request e devolve o novo
  // shape via onChange — atualizamos só localmente, sem refetch global.
  const [reactionState, setReactionState] = useState<{
    reactions: ReactionAggregate[];
    userReaction: string | null;
  }>({
    reactions: Array.isArray(post.reactions) ? post.reactions : [],
    userReaction: post.user_reaction ?? null,
  });
  useEffect(() => {
    setReactionState({
      reactions: Array.isArray(post.reactions) ? post.reactions : [],
      userReaction: post.user_reaction ?? null,
    });
  }, [post.id, post.reactions, post.user_reaction]);
  const { user: viewer } = useAuth();
  const isAuthor = !!(viewer && post.author_id && viewer.id === post.author_id);
  const isModeratorPlus = userHasRole(viewer, "moderator");
  // Task #198 — moderador local da comunidade (sem role global) também
  // pode excluir/ocultar; backend já autoriza via setPostHiddenWithAuth/
  // deletePost (isForumModerator OR moderator+ global).
  const canModerateLocal = !!post.viewer_can_moderate;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isModeratorPlus || canModerateLocal;
  const [savedLocal, setSavedLocal] = useState<boolean>(!!post.is_saved);
  useEffect(() => { setSavedLocal(!!post.is_saved); }, [post.is_saved]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const showReasonField = !isAuthor && (isModeratorPlus || canModerateLocal);

  useEffect(() => {
    if (!confirmDelete) setDeleteReason("");
  }, [confirmDelete]);

  const handleToggleSave = async () => {
    if (busy) return;
    const next = !savedLocal;
    setSavedLocal(next);
    setBusy(true);
    const res = await api.post<{ saved: boolean }>(`/api/community/posts/${post.id}/save`, { saved: next });
    setBusy(false);
    if (!res.success) {
      setSavedLocal(!next);
      enhancedToast.error({ title: "Falha ao salvar", description: res.error?.message || "Tente novamente", haptic: true });
      return;
    }
    enhancedToast.success({
      title: next ? "Salvo" : "Removido dos salvos",
      description: next ? "Você pode encontrá-lo na aba Salvos do seu perfil." : "",
      haptic: true,
    });
  };

  const handleShare = async () => {
    onShare();
    try {
      const url = `${window.location.origin}/?post=${post.id}`;
      if (navigator.share) {
        await navigator.share({ title: post.author ? `Post de ${post.author}` : "RAYO", text: post.content?.slice(0, 120) || "", url });
      } else {
        await navigator.clipboard.writeText(url);
        enhancedToast.success({ title: "Link copiado", description: "Compartilhe com quem quiser.", haptic: true });
      }
    } catch { /* user cancelled */ }
  };

  const performDelete = async (body?: { reason: string }) => {
    if (busy) return;
    setBusy(true);
    const res = await api.delete<{ ok: boolean }>(`/api/community/posts/${post.id}`, body);
    setBusy(false);
    setConfirmDelete(false);
    if (!res.success) {
      enhancedToast.error({ title: "Falha ao excluir", description: res.error?.message || "Tente novamente", haptic: true });
      return;
    }
    enhancedToast.success({ title: "Publicação excluída", description: "", haptic: true });
    onMutated?.();
  };

  // Task #164 — Click targets padrão Facebook. Wrapper do card abre a
  // discussão (mesmo destino do botão "Comentar"); avatar/nome → perfil
  // do autor; imagens → lightbox; c/<slug> → comunidade. Botões internos
  // (reagir/comentar/compartilhar/menu/save) usam stopBubble pra não
  // disparar o clique do card.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openDiscussion = () => onComment();
  const openAuthorProfile = () => openProfileById(post.author_id);
  const openForum = () => openCommunityBySlug(post.forum_slug ?? null);

  return (
    <div
      className="ra-card ra-card-hover"
      role="button"
      tabIndex={0}
      onClick={openDiscussion}
      onKeyDown={cardKeyHandler(openDiscussion)}
      aria-label={`Abrir discussão da publicação de ${post.author}`}
      style={{ cursor: 'pointer' }}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={stopBubble(openAuthorProfile)}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)]"
              aria-label={`Abrir perfil de ${post.author}`}
              disabled={!post.author_id}
              style={{ cursor: post.author_id ? 'pointer' : 'default' }}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.avatar} />
                <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopBubble(openAuthorProfile)}
                  disabled={!post.author_id}
                  className="text-[14px] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)] rounded"
                  style={{
                    fontWeight: 600,
                    color: 'var(--rayo-forest-900)',
                    cursor: post.author_id ? 'pointer' : 'default',
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                  }}
                  aria-label={`Abrir perfil de ${post.author}`}
                >
                  {post.author}
                </button>
                {post.isPinned && (
                  <Pin 
                    className="w-3 h-3" 
                    style={{ color: 'var(--rayo-terra-500)' }} 
                  />
                )}
              </div>
              <div 
                className="flex items-center gap-2 text-[12px] flex-wrap"
                style={{ color: 'var(--rayo-ink-400)' }}
              >
                {post.forum_slug && (
                  <>
                    <button
                      type="button"
                      onClick={stopBubble(openForum)}
                      className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)] rounded"
                      style={{
                        fontWeight: 600,
                        color: 'var(--rayo-terra-500)',
                        background: 'transparent',
                        border: 0,
                        padding: 0,
                        cursor: 'pointer',
                      }}
                      title={`Abrir c/${post.forum_slug}`}
                    >
                      {post.forum_icon ? `${post.forum_icon} ` : ""}c/{post.forum_slug}
                    </button>
                    <span>•</span>
                  </>
                )}
                <Clock className="w-3 h-3" />
                {/* Task #164 — timestamp como target dedicado (permalink
                    da discussão). Mesmo destino do corpo, mas com aria
                    e foco próprios pra leitores de tela. */}
                <button
                  type="button"
                  onClick={stopBubble(openDiscussion)}
                  className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)] rounded"
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                  aria-label={`Permalink da publicação · ${post.time}`}
                >
                  {post.time}
                </button>
                {post.category && (
                  <>
                    <span>•</span>
                    <Badge
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'var(--rayo-terra-100)',
                        color: 'var(--rayo-terra-500)',
                      }}
                    >
                      {post.category}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                style={{ color: 'var(--rayo-ink-400)' }}
                aria-label="Mais ações"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={handleToggleSave} disabled={busy}>
                {savedLocal ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
                {savedLocal ? "Remover dos salvos" : "Salvar"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              {(canEdit || canDelete) && <DropdownMenuSeparator />}
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit?.(post)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => {
                    if (isAuthor) {
                      void performDelete();
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir{!isAuthor && isModeratorPlus ? " (mod)" : ""}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
              <AlertDialogDescription>
                {showReasonField
                  ? "Você está removendo a publicação como moderador. O autor receberá uma notificação — opcionalmente, descreva o motivo abaixo."
                  : "Esta ação não pode ser desfeita. A publicação será removida do feed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {showReasonField && (
              <div className="grid gap-2 py-2">
                <Label htmlFor={`delete-reason-${post.id}`}>Motivo (opcional)</Label>
                <Textarea
                  id={`delete-reason-${post.id}`}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ex.: Conteúdo fora das diretrizes da comunidade."
                  maxLength={500}
                  rows={3}
                  disabled={busy}
                />
                <p className="text-[12px]" style={{ color: 'var(--rayo-ink-400)' }}>
                  {deleteReason.trim().length}/500 — será incluído na notificação enviada ao autor.
                </p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const trimmed = deleteReason.trim();
                  void performDelete(showReasonField && trimmed ? { reason: trimmed } : undefined);
                }}
                disabled={busy}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Title (quando presente) */}
        {post.title && (
          <h3
            className="text-[17px] font-bold mb-2 leading-snug"
            style={{ color: 'var(--rayo-forest-900)' }}
          >
            {renderHighlighted(post.title, highlightTerm)}
          </h3>
        )}

        {/* Content */}
        <p 
          className="text-[15px] mb-4 leading-relaxed" 
          style={{ color: 'var(--rayo-forest-900)' }}
        >
          {renderHighlighted(post.content, highlightTerm)}
        </p>

        {/* Images — Task #92: até 4 imagens em grid responsivo
            Task #164: cada imagem é um botão que abre o lightbox. */}
        {post.images && post.images.length > 0 && (
          <div
            className={`mb-4 grid gap-1 rounded-xl overflow-hidden ${
              post.images.length === 1
                ? "grid-cols-1"
                : post.images.length === 2
                ? "grid-cols-2"
                : "grid-cols-2"
            }`}
          >
            {post.images.slice(0, 4).map((src: string, i: number) => (
              <button
                type="button"
                key={i}
                onClick={stopBubble(() => setLightboxIndex(i))}
                className={`block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)] focus-visible:ring-inset ${
                  post.images.length === 3 && i === 0 ? "row-span-2" : ""
                }`}
                style={{ background: 'transparent', border: 0, padding: 0, cursor: 'zoom-in' }}
                aria-label={`Ver imagem ${i + 1} em tamanho real`}
              >
                <ImageWithFallback
                  src={src}
                  alt={`Imagem ${i + 1}`}
                  className="w-full h-full object-cover"
                  style={{ minHeight: post.images.length === 1 ? "auto" : 160 }}
                />
              </button>
            ))}
          </div>
        )}
        {lightboxIndex != null && post.images && post.images.length > 0 && (
          <PostImageLightbox
            images={post.images}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        {/* Actions — Task #122: Heart estático virou EmojiReactionPicker
            multi-emoji (❤️😂🙏💡🔥👏). Mantemos `likePost` como fallback
            só pra registrar o engagement se o picker falhar — mas a
            verdade do estado vive em reactionState. */}
        <div
          className="flex items-center gap-6 pt-3"
          style={{ borderTop: '1px solid var(--rayo-sand-300)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiReactionPicker
            targetType="post"
            targetId={post.id}
            reactions={reactionState.reactions}
            userReaction={reactionState.userReaction}
            onChange={setReactionState}
            variant="full"
            className="px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={stopBubble(onComment)}
            data-test="comment-btn"
            className="gap-2"
            style={{ color: 'var(--rayo-ink-400)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--rayo-forest-900)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--rayo-ink-400)';
            }}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-[13px]" style={{ fontWeight: 500 }}>
              {post.comments}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopBubble(onShare)}
            className="gap-2"
            style={{ color: 'var(--rayo-ink-400)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--rayo-forest-900)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--rayo-ink-400)';
            }}
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[13px]" style={{ fontWeight: 500 }}>
              {post.shares}
            </span>
          </Button>
          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
            <FavoriteIcon id={post.id} type="post" />
          </div>
        </div>

        {/* Task #122 — chips agregados POR EMOJI (atende o requisito de
            contadores agrupados, não só o total na action row). */}
        {reactionState.reactions.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <ReactionsSummary
              targetType="post"
              targetId={post.id}
              reactions={reactionState.reactions}
              userReaction={reactionState.userReaction}
              onChange={setReactionState}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// COMMUNITY CARD COMPONENT (Task #202 — renomeada de GroupCard)
interface CommunityCardProps {
  group: any;
}

function CommunityCard({ group }: CommunityCardProps) {
  const [isJoined, setIsJoined] = useState<boolean>(!!group.isJoined);
  const [members, setMembers] = useState<number>(Number(group.members) || 0);
  const [busy, setBusy] = useState(false);

  // Mantém estado em sincronia caso a lista recarregue.
  useEffect(() => {
    setIsJoined(!!group.isJoined);
    setMembers(Number(group.members) || 0);
  }, [group.isJoined, group.members]);

  // Task #117 — Token de cancelamento pra leave-undo. Se o usuário re-entra
  // dentro da janela de 5s, invalidamos o token e o `onConfirm` pendente
  // do toast vira no-op. Sem isso, o DELETE atrasado dispara DEPOIS do
  // novo POST e a inscrição some silenciosamente.
  const pendingLeaveTokenRef = useRef(0);

  const callSubscribe = useCallback(async (subscribe: boolean): Promise<boolean> => {
    if (!group.slug) return false;
    try {
      const res = subscribe
        ? await api.post<{ subscribed: boolean; member_count: number }>(
            `/api/community/forums/by-slug/${encodeURIComponent(group.slug)}/subscribe`,
            { subscribed: true },
          )
        : await api.delete<{ subscribed: boolean; member_count: number }>(
            `/api/community/forums/by-slug/${encodeURIComponent(group.slug)}/subscribe`,
          );
      if (!res.success) throw new Error(res.error?.message || "Falha ao atualizar inscrição");
      if (typeof res.data?.member_count === "number") {
        setMembers(res.data.member_count);
      }
      return true;
    } catch (err: any) {
      // Reverte otimismo em caso de erro real do servidor.
      setIsJoined(!subscribe);
      setMembers((m) => Math.max(0, m + (subscribe ? -1 : 1)));
      enhancedToast.error({ title: "Não foi possível atualizar a inscrição", description: err?.message });
      return false;
    }
  }, [group.slug]);

  const handleJoinGroup = async () => {
    if (busy || !group.slug) return;
    const next = !isJoined;
    // Otimismo visual imediato em ambos os fluxos.
    setIsJoined(next);
    setMembers((m) => Math.max(0, m + (next ? 1 : -1)));
    if (next) {
      // Entrar: invalida qualquer leave pendente — se o usuário saiu há
      // < 5s e clicou pra re-entrar, o DELETE atrasado é cancelado.
      pendingLeaveTokenRef.current += 1;
      setBusy(true);
      const ok = await callSubscribe(true);
      setBusy(false);
      if (ok) {
        enhancedToast.success({
          title: "Você entrou na comunidade! 🎉",
          description: `Bem-vindo à comunidade "${group.name}"`,
          haptic: true,
        });
      }
    } else {
      // Task #117 — Sair: janela de Undo de 5s. UI já refletiu a saída;
      // só chamamos DELETE quando o toast expira sem Desfazer.
      pendingLeaveTokenRef.current += 1;
      const myToken = pendingLeaveTokenRef.current;
      enhancedToast.undo({
        title: "Você saiu da comunidade",
        description: `Você não faz mais parte de "${group.name}"`,
        haptic: true,
        onConfirm: () => {
          // Token mudou = usuário re-entrou ou disparou outra ação;
          // ignoramos esse confirm pra não desfazer o re-join.
          if (pendingLeaveTokenRef.current !== myToken) return;
          void callSubscribe(false);
        },
        onUndo: () => {
          pendingLeaveTokenRef.current += 1;
          setIsJoined(true);
          setMembers((m) => m + 1);
        },
      });
    }
  };

  return (
    <div className="ra-card ra-card-hover overflow-hidden group" style={{ padding: 0 }}>
      {/* Group Image */}
      <div 
        className="relative h-32 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--rayo-terra-500) 0%, var(--rayo-terra-700) 100%)',
        }}
      >
        <ImageWithFallback
          src={group.image}
          alt={group.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        {/* Task #202 — stack de badges no topo: oficial · você modera · nova · membro */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {group.is_official && (
            <Badge style={{ fontSize: 10, fontWeight: 700, background: 'var(--rayo-forest-700)', color: '#fff' }}>
              Oficial
            </Badge>
          )}
          {group.is_moderator && (
            <Badge style={{ fontSize: 10, fontWeight: 700, background: 'var(--rayo-sand-50)', color: 'var(--rayo-forest-900)', border: '1px solid var(--rayo-sand-300)' }}>
              Você modera
            </Badge>
          )}
          {group.created_at && (Date.now() - new Date(group.created_at).getTime()) < 14 * 24 * 60 * 60 * 1000 && (
            <Badge style={{ fontSize: 10, fontWeight: 700, background: 'var(--rayo-sage-500)', color: '#fff' }}>
              Nova
            </Badge>
          )}
          {isJoined && (
            <Badge style={{ fontSize: 11, fontWeight: 600, background: 'var(--rayo-terra-500)', color: '#fff' }}>
              <CheckCircle className="w-3 h-3 mr-1" />
              Membro
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 
            className="text-[16px] mb-1 line-clamp-1" 
            style={{ 
              fontWeight: 600, 
              color: 'var(--rayo-forest-900)' 
            }}
          >
            {group.name}
          </h3>
          <span className="ra-tag terra">{group.category}</span>
        </div>

        <div 
          className="flex items-center justify-between mb-4 text-[12px]"
          style={{ color: 'var(--rayo-ink-400)' }}
        >
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{members.toLocaleString()} membros</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--rayo-sage-500)' }}
            ></div>
            <span>{group.activeNow} online</span>
          </div>
        </div>

        <Button
          onClick={handleJoinGroup}
          className="w-full"
          style={{ 
            fontWeight: 600,
            background: isJoined ? 'var(--rayo-sand-300)' : 'var(--rayo-terra-500)',
            color: isJoined ? 'var(--rayo-ink-700)' : '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            if (isJoined) {
              e.currentTarget.style.background = 'var(--rayo-sand-100)';
            } else {
              e.currentTarget.style.background = 'var(--rayo-terra-700)';
            }
          }}
          onMouseLeave={(e) => {
            if (isJoined) {
              e.currentTarget.style.background = 'var(--rayo-sand-300)';
            } else {
              e.currentTarget.style.background = 'var(--rayo-terra-500)';
            }
          }}
        >
          {isJoined ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Membro
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Participar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface CommentsPanelProps {
  post: any;
  comments: CommentData[];
  loadingComments: boolean;
  onClose: () => void;
  onSubmitComment: (content: string) => Promise<boolean>;
  // Task #122 — reações multi-emoji por comentário; o pai sincroniza
  // o estado quando o picker recebe a resposta do servidor.
  onCommentReactionsChange: (
    commentId: number,
    next: { reactions: ReactionAggregate[]; userReaction: string | null },
  ) => void;
  highlightCommentId?: number | null;
}

function CommentsPanel({ post, comments, loadingComments, onClose, onSubmitComment, onCommentReactionsChange, highlightCommentId }: CommentsPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Task #117 — confirma descarte se houver rascunho não enviado.
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const requestClose = useCallback(() => {
    if (commentText.trim().length > 0) setConfirmDiscard(true);
    else onClose();
  }, [commentText, onClose]);

  // Task #115 — body-scroll-lock enquanto o painel está aberto. Sem isso a
  // página de fundo rola atrás do overlay no mobile e os 80vh de altura
  // ficam confusos.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Task #115 — foco inicial: no desktop (pointer:fine), foca o input
  // pra usuário poder digitar imediatamente; no mobile, foca o botão de
  // fechar (não força abertura de teclado, mas mantém Tab/Esc utilizáveis).
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const isDesktop = typeof window !== "undefined"
      && window.matchMedia?.("(pointer: fine)").matches;
    if (isDesktop) inputRef.current?.focus();
    else closeBtnRef.current?.focus();
  }, []);

  // Task #115 — Esc fecha + focus-trap simples (Tab cycle entre elementos
  // focáveis dentro do sheet). Evita que Tab vaze pro fundo enquanto o
  // dialog está aberto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { requestClose(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  // Task #115 — swipe-down pra fechar o sheet no mobile. Arrasta a partir
  // do header (não da lista de comentários, que precisa rolar). Threshold:
  // > 80px OU velocidade > 0.5 px/ms = fecha. Animamos translateY durante
  // o gesto pra dar feedback tátil.
  const [dragY, setDragY] = useState(0);
  const dragStateRef = useRef<{ startY: number; startT: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    dragStateRef.current = { startY: e.touches[0].clientY, startT: Date.now() };
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const dy = e.touches[0].clientY - dragStateRef.current.startY;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const dy = e.changedTouches[0].clientY - dragStateRef.current.startY;
    const dt = Math.max(1, Date.now() - dragStateRef.current.startT);
    const velocity = dy / dt;
    dragStateRef.current = null;
    if (dy > 80 || velocity > 0.5) requestClose();
    else setDragY(0);
  };

  // Task #115 — quando o painel abre por um clique em "Comentários" no
  // perfil, rolamos até o comentário-alvo e aplicamos a classe
  // `rayo-comment-highlight` (animação CSS de 2s). Roda quando a lista
  // de comentários termina de carregar.
  useEffect(() => {
    if (loadingComments || !highlightCommentId) return;
    const node = document.querySelector<HTMLElement>(
      `[data-comment-id="${highlightCommentId}"]`,
    );
    if (!node) return;
    // Pequeno delay garante que o painel já fez layout antes do scroll.
    const t = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.classList.add("rayo-comment-highlight");
      window.setTimeout(() => node.classList.remove("rayo-comment-highlight"), 2200);
    }, 120);
    return () => window.clearTimeout(t);
  }, [loadingComments, highlightCommentId, comments.length]);

  const handleSubmit = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onSubmitComment(commentText.trim());
    if (ok) setCommentText("");
    setSubmitting(false);
  };

  function formatTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const mins = Math.floor((now - then) / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  // Task #115 — Renderizado via portal pra escapar do `transform: translateY`
  // que `PullToRefresh` aplica no wrapper de conteúdo. Um ancestral com
  // `transform` quebra `position: fixed` em descendentes (a fixed passa a
  // ser relativa ao ancestral transformado), e por isso o painel aparecia
  // "fora da viewport" no mobile.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Comentários"
      onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col"
        style={{
          background: 'var(--rayo-sand-100)',
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragY > 0 ? 'none' : 'transform 200ms ease-out',
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b touch-none"
          style={{ borderColor: 'var(--rayo-sand-300)' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <h3 className="text-[16px]" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
            Comentários ({post.comments})
          </h3>
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="icon"
            onClick={requestClose}
            aria-label="Fechar comentários"
          >
            <X className="w-5 h-5" style={{ color: 'var(--rayo-ink-400)' }} />
          </Button>
        </div>
        <DiscardDraftDialog
          open={confirmDiscard}
          onOpenChange={setConfirmDiscard}
          onConfirm={() => { setConfirmDiscard(false); setCommentText(""); onClose(); }}
          description="Você tem um comentário em rascunho. Se sair agora, vai perdê-lo."
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingComments ? (
            <div className="text-center py-8" style={{ color: 'var(--rayo-ink-400)' }}>Carregando...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--rayo-ink-400)' }}>
              Nenhum comentário ainda. Seja o primeiro!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} data-comment-id={c.id} className="flex gap-3 rounded-md p-1 -mx-1 transition-colors">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback style={{ background: 'var(--rayo-terra-100)', color: 'var(--rayo-terra-500)', fontSize: '12px' }}>
                    {c.author_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]" style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
                      {c.author_name}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--rayo-ink-400)' }}>
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--rayo-ink-700)' }}>
                    {c.content}
                  </p>
                  {/* Task #122 — reações multi-emoji em comentários
                      (variant compact). Sem botão Heart legado. */}
                  <div className="mt-1">
                    <EmojiReactionPicker
                      targetType="comment"
                      targetId={c.id}
                      reactions={c.reactions}
                      userReaction={c.user_reaction}
                      onChange={(next) => onCommentReactionsChange(c.id, next)}
                      variant="compact"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className="p-4 border-t flex flex-shrink-0 items-center gap-2"
          style={{
            borderColor: 'var(--rayo-sand-300)',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          }}
        >
          <Input
            ref={inputRef}
            placeholder="Escreva um comentário..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            className="flex-1"
            style={{ background: 'var(--rayo-sand-50)', color: 'var(--rayo-forest-900)' }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!commentText.trim() || submitting}
            style={{ background: 'var(--rayo-terra-500)', color: '#fff' }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
