import { Heart, MessageCircle, Share2, MoreHorizontal, Plus, TrendingUp, Users, Clock, Pin, Send, Search, Sparkles, Trophy, UserPlus, ChevronRight, CheckCircle, Lock, Globe, Mail, Image as ImageIcon, Video, Smile, Bookmark, BookmarkCheck, Pencil, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { MobileSearchPage } from "./MobileSearchPage";
import { userHasRole } from "./AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { onScrollTop } from "../lib/scrollTop";
import { PullToRefresh } from "./PullToRefresh";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyStateError, EmptyStateNoCommunity } from "./EmptyState";
import { enhancedToast } from "./EnhancedToast";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { CreatePostModal } from "./CreatePostModal";
import { EmojiReactionPicker, useReactions } from "./EmojiReactionPicker";
import { FavoriteIcon } from "./FavoriteButton";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ConversasPage } from "./ConversasPage";
import { CommunityDetailPage } from "./CommunityDetailPage";
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
}

interface TrendingPost {
  id: number;
  title: string;
  likes: number;
  comments: number;
  forum_id: number | null;
  forum_slug: string | null;
  forum_name: string | null;
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
}

export function ComunidadePage() {
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  // Task #93 — modal de edição reusa o CreatePostModal com `editingPost`.
  const [editingPost, setEditingPost] = useState<any>(null);
  // Task #93 — barra de busca clicável abre a MobileSearchPage existente.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState<"feed" | "grupos" | "trending" | "conversas">("feed");
  // Task #92 — Community detail page por slug. Quando setado, sobrepõe
  // tudo (header de tabs + composer escondidos) e renderiza CommunityDetailPage.
  const [activeCommunitySlug, setActiveCommunitySlug] = useState<string | null>(null);
  
  const { posts, likePost, sharePost, loadPosts } = useApp();
  const { user: authUser } = useAuth();
  const { reactions, handleReaction } = useReactions();
  const { theme } = useTheme();
  const [forums, setForums] = useState<Forum[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
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
          content: string;
          category: string;
          like_count: number;
          comment_count: number;
          share_count: number;
          is_pinned: boolean;
          user_liked: boolean;
          forum_id: number;
          forum_name?: string;
          author_id: number;
          created_at: string;
          title: string | null;
        };
      }>(`/api/community/posts/${id}`);
      if (res.success && res.data) {
        const p = res.data.post;
        setSelectedPost({
          id: p.id,
          author: p.author_name,
          avatar: "/placeholder-avatar.jpg",
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
          author_id: p.author_id,
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
    window.addEventListener("raio:open-post", handler as EventListener);
    try {
      const pending = sessionStorage.getItem("raio-pending-post");
      if (pending) {
        sessionStorage.removeItem("raio-pending-post");
        const pendingComment = sessionStorage.getItem("raio-pending-post-comment");
        if (pendingComment) sessionStorage.removeItem("raio-pending-post-comment");
        void openPostById(
          Number(pending),
          pendingComment ? Number(pendingComment) : undefined,
        );
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener("raio:open-post", handler as EventListener);
    };
  }, [openPostById]);

  // Task #115 — re-tap na aba Comunidade volta ao topo (handler global em
  // App.tsx já rola a window). Aqui aproveitamos pra resetar o subreddit
  // ativo se houver, devolvendo o usuário ao Feed sem precisar do botão Voltar.
  useEffect(() => {
    return onScrollTop(() => {
      setActiveCommunitySlug(null);
    }, "comunidade");
  }, []);

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
      const pending = sessionStorage.getItem("rayo-pending-community-slug");
      if (pending) {
        sessionStorage.removeItem("rayo-pending-community-slug");
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
  const loadTrendingPosts = useCallback(async () => {
    setTrendingLoading(true);
    try {
      const res = await api.get<{ posts: any[] }>("/api/community/posts/trending?limit=20");
      if (res.success) setTrendingPosts(res.data?.posts ?? []);
    } finally {
      setTrendingLoading(false);
    }
  }, []);
  useEffect(() => {
    if (currentView !== "trending") return;
    void loadTrendingPosts();
  }, [currentView, loadTrendingPosts]);

  const submitComment = useCallback(async (postId: number, content: string) => {
    const res = await api.post<{ comment: CommentData }>(`/api/community/posts/${postId}/comments`, { content });
    if (res.success && res.data) {
      setPostComments(prev => [...prev, res.data!.comment]);
      await loadPosts();
      return true;
    }
    return false;
  }, [loadPosts]);

  const toggleCommentLike = useCallback(async (commentId: number) => {
    const res = await api.post<{ liked: boolean }>(`/api/community/comments/${commentId}/like`);
    if (res.success && res.data) {
      setPostComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, user_liked: res.data!.liked, like_count: res.data!.liked ? c.like_count + 1 : c.like_count - 1 }
          : c
      ));
    }
  }, []);

  const handleReactionWithFeedback = (postId: number, emoji: string) => {
    handleReaction(postId, emoji);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadPosts(), loadForums()]);
    } catch (error) {
      console.error("Erro ao atualizar feed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = forums.map(f => ({
    id: f.category.toLowerCase().replace(/\s+/g, '-'),
    name: f.name,
    icon: f.icon,
    gradient: "from-[#3B82F6] to-[#2563EB]",
    count: parseInt(f.post_count) || 0
  }));

  const groups = forums.map(f => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    members: Number(f.member_count) || 0,
    isJoined: !!f.is_subscribed,
    category: f.category,
    activeNow: 0,
    postsToday: parseInt(String(f.post_count)) || 0,
    image: "",
    description: f.description,
    icon: f.icon,
  }));

  // Trending topics legados — não exibidos mais (Em alta usa /posts/trending).
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
          onOpenPost={(id) => {
            setActiveCommunitySlug(null);
            void openPostById(id);
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
          <div className="max-w-7xl mx-auto px-6">
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
                onClick={() => setCurrentView("grupos")}
                style={{ 
                  fontWeight: currentView === "grupos" ? 700 : 500,
                  borderColor: currentView === "grupos" ? 'var(--rayo-terra-500)' : 'transparent',
                  color: currentView === "grupos" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "grupos") {
                    e.currentTarget.style.color = 'var(--rayo-forest-900)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "grupos") {
                    e.currentTarget.style.color = 'var(--rayo-ink-400)';
                  }
                }}
              >
                Grupos
              </Button>
              <Button
                variant="ghost"
                className="relative px-6 py-3 rounded-none border-b-2 transition-all whitespace-nowrap"
                onClick={() => setCurrentView("trending")}
                style={{ 
                  fontWeight: currentView === "trending" ? 700 : 500,
                  borderColor: currentView === "trending" ? 'var(--rayo-terra-500)' : 'transparent',
                  color: currentView === "trending" ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "trending") {
                    e.currentTarget.style.color = 'var(--rayo-forest-900)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "trending") {
                    e.currentTarget.style.color = 'var(--rayo-ink-400)';
                  }
                }}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Em Alta
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
                <MessageCircle className="w-4 h-4 mr-2" />
                Mensagens
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
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex-1 flex items-center gap-3 text-left transition-colors"
                style={{
                  height: 44,
                  padding: '0 16px',
                  borderRadius: 999,
                  background: 'var(--rayo-sand-100)',
                  border: '1px solid var(--rayo-sand-300)',
                  color: 'var(--rayo-ink-400)',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
                aria-label="Buscar na comunidade"
              >
                <Search className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Buscar comunidades, posts, pessoas…</span>
              </button>
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
          {currentView === "feed" && (
            <FeedView 
              posts={posts}
              reactions={reactions}
              onReact={handleReactionWithFeedback}
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
              onMutated={loadPosts}
              onEdit={(p) => setEditingPost(p)}
            />
          )}

          {currentView === "grupos" && (
            <GruposView 
              groups={groups}
              categories={categories}
              loading={forumsLoading}
              error={forumsError}
              onRetry={loadForums}
            />
          )}

          {currentView === "trending" && (
            <TrendingView 
              posts={trendingPosts}
              loading={trendingLoading}
              reactions={reactions}
              onReact={handleReactionWithFeedback}
              onComment={(post) => {
                setSelectedPost(post);
                setShowComments(true);
                loadPostComments(post.id);
              }}
              onShare={(post) => {
                setSelectedPost(post);
                setShowShare(true);
              }}
              onMutated={loadTrendingPosts}
              onEdit={(p) => setEditingPost(p)}
            />
          )}

          {currentView === "conversas" && (
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
            onLikeComment={toggleCommentLike}
            highlightCommentId={highlightCommentId}
          />
        )}

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
        <MobileSearchPage
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onTabChange={() => setSearchOpen(false)}
        />
      </div>
    </PullToRefresh>
  );
}

// FEED VIEW
interface FeedViewProps {
  posts: any[];
  reactions: any;
  onReact: (postId: number, emoji: string) => void;
  onComment: (post: any) => void;
  onShare: (post: any) => void;
  trendingTopics: any[];
  onMutated?: () => void;
  onEdit?: (post: any) => void;
}

function FeedView({ posts, reactions, onReact, onComment, onShare, trendingTopics, onMutated, onEdit }: FeedViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Feed */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-6">
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

        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post}
            reactions={reactions}
            onReact={onReact}
            onComment={() => onComment(post)}
            onShare={() => onShare(post)}
            onMutated={onMutated}
            onEdit={onEdit}
          />
        ))}
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
                <div className="ra-metric-label">Grupos ativos</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// GRUPOS VIEW
interface GruposViewProps {
  groups: any[];
  categories: any[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function GruposView({ groups, categories, loading, error, onRetry }: GruposViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredGroups = selectedCategory
    ? groups.filter(g => g.category === selectedCategory)
    : groups;

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

  return (
    <div className="space-y-8">
      {/* Categories Filter - Spotify Style */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-[24px]" 
            style={{ 
              fontWeight: 700, 
              color: 'var(--rayo-forest-900)' 
            }}
          >
            Categorias
          </h2>
          <Badge 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--rayo-terra-100)',
              color: 'var(--rayo-terra-500)',
            }}
          >
            {filteredGroups.length} grupos
          </Badge>
        </div>
        
        {/* Horizontal Scrollable Cards */}
        <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
          <div className="flex gap-4 pb-2 transition-all duration-300 ease-out" style={{ width: 'max-content' }}>
            {/* Card "Todos" */}
            <div className="hover:brightness-105 active:opacity-80 transition-all duration-200 ease-out">
              <Card 
                className="w-48 cursor-pointer border-0 overflow-hidden transition-all"
                style={{
                  background: !selectedCategory 
                    ? 'linear-gradient(135deg, var(--rayo-terra-500) 0%, var(--rayo-terra-700) 100%)'
                    : 'var(--rayo-sand-300)',
                  color: !selectedCategory ? '#FFFFFF' : 'var(--rayo-forest-900)',
                  transform: !selectedCategory ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: !selectedCategory ? '0 10px 24px rgba(12,59,46,0.10)' : 'none',
                }}
                onClick={() => setSelectedCategory(null)}
                onMouseEnter={(e) => {
                  if (selectedCategory) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory) {
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <div className="relative p-4 h-28">
                  {!selectedCategory && (
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant="secondary" 
                        className="border-0" 
                        style={{ 
                          fontSize: '10px', 
                          fontWeight: 600,
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: '#FFFFFF',
                        }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    </div>
                  )}
                  <div className="flex flex-col justify-end h-full">
                    <div className="text-[32px] mb-1">🌟</div>
                    <h3 className="text-[14px] mb-1" style={{ fontWeight: 600 }}>Todos os Grupos</h3>
                    <div className="flex items-center text-[11px] opacity-90">
                      <Users className="w-3 h-3 mr-1" />
                      {groups.length} grupos
                    </div>
                  </div>
                  <div 
                    className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full" 
                    style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  />
                </div>
              </Card>
            </div>

            {/* Category Cards */}
            {categories.map((category) => (
              <div 
                key={category.id}
                className="hover:brightness-105 active:opacity-80 transition-all duration-200 ease-out"
              >
                <Card 
                  className={`w-48 cursor-pointer border-0 bg-gradient-to-br ${category.gradient} text-white overflow-hidden transition-all`}
                  style={{
                    transform: selectedCategory === category.name ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: selectedCategory === category.name ? '0 10px 24px rgba(12,59,46,0.10)' : 'none',
                  }}
                  onClick={() => setSelectedCategory(category.name)}
                  onMouseEnter={(e) => {
                    if (selectedCategory !== category.name) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategory !== category.name) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <div className="relative p-4 h-28">
                    {selectedCategory === category.name && (
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant="secondary" 
                          className="border-0" 
                          style={{ 
                            fontSize: '10px', 
                            fontWeight: 600,
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#FFFFFF',
                          }}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-col justify-end h-full">
                      <div className="text-[32px] mb-1">{category.icon}</div>
                      <h3 className="text-[14px] mb-1" style={{ fontWeight: 600 }}>{category.name}</h3>
                      <div className="flex items-center text-[11px] opacity-90">
                        <Users className="w-3 h-3 mr-1" />
                        {category.count.toLocaleString()} membros
                      </div>
                    </div>
                    <div 
                      className="absolute -top-2 -left-2 w-12 h-12 rounded-full" 
                      style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My Groups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-[24px]" 
            style={{ 
              fontWeight: 700, 
              color: 'var(--rayo-forest-900)' 
            }}
          >
            Meus Grupos
          </h2>
          <Badge 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--rayo-terra-500)',
              color: '#FFFFFF',
            }}
          >
            {groups.filter(g => g.isJoined).length} grupos
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.filter(g => g.isJoined).map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </div>

      {/* Discover Groups */}
      <div>
        <h2 
          className="text-[24px] mb-4" 
          style={{ 
            fontWeight: 700, 
            color: 'var(--rayo-forest-900)' 
          }}
        >
          Descubra Novos Grupos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.filter(g => !g.isJoined).map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}

// TRENDING VIEW — Task #92: posts vêm de /api/community/posts/trending
// (ranking por likes+comments nas últimas 48h, calculado no servidor).
interface TrendingViewProps {
  posts: any[];
  loading?: boolean;
  reactions: any;
  onReact: (postId: number, emoji: string) => void;
  onComment: (post: any) => void;
  onShare: (post: any) => void;
  onMutated?: () => void;
  onEdit?: (post: any) => void;
}

function TrendingView({ posts, loading, reactions, onReact, onComment, onShare, onMutated, onEdit }: TrendingViewProps) {
  return (
    <div className="space-y-6">
      <div 
        className="rounded-2xl p-6 text-white"
        style={{
          background: 'linear-gradient(135deg, var(--rayo-terra-500) 0%, var(--rayo-terra-700) 100%)',
          boxShadow: '0 0 0 3px rgba(200,85,61,0.18)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-8 h-8" />
          <h2 className="text-[28px]" style={{ fontWeight: 700 }}>
            Conteúdo em Alta
          </h2>
        </div>
        <p className="text-[16px] text-white/90">
          Os posts mais curtidos e comentados da comunidade esta semana
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          {loading && (
            <div className="ra-card p-6 text-center" style={{ color: 'var(--rayo-ink-400)' }}>
              Carregando os posts em alta…
            </div>
          )}
          {!loading && posts.length === 0 && (
            <div className="ra-card p-6 text-center" style={{ color: 'var(--rayo-ink-400)' }}>
              Ainda não há posts em alta nas últimas 48h.
            </div>
          )}
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              reactions={reactions}
              onReact={onReact}
              onComment={() => onComment(post)}
              onShare={() => onShare(post)}
              onMutated={onMutated}
              onEdit={onEdit}
            />
          ))}
        </div>

        {/* Sidebar legada de hashtags removida (Task #92). */}
      </div>
    </div>
  );
}

// POST CARD COMPONENT
interface PostCardProps {
  post: any;
  reactions: any;
  onReact: (postId: number, emoji: string) => void;
  onComment: () => void;
  onShare: () => void;
  // Task #93 — recarregar lista após delete; abrir modal de edição.
  onMutated?: () => void;
  onEdit?: (post: any) => void;
}

// Task #99 — exportado pra ser reusado em contextos escopados (ex.:
// TurmaCommunityTab). Requer AppProvider/AuthProvider no ascendente.
export function PostCard({ post, reactions, onReact, onComment, onShare, onMutated, onEdit }: PostCardProps) {
  const { likePost } = useApp();
  const { user: viewer } = useAuth();
  const isAuthor = !!(viewer && post.author_id && viewer.id === post.author_id);
  const isModeratorPlus = userHasRole(viewer, "moderator");
  const canEdit = isAuthor;
  const canDelete = isAuthor || isModeratorPlus;
  const [savedLocal, setSavedLocal] = useState<boolean>(!!post.is_saved);
  useEffect(() => { setSavedLocal(!!post.is_saved); }, [post.is_saved]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const showReasonField = !isAuthor && isModeratorPlus;

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

  return (
    <div className="ra-card ra-card-hover">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.avatar} />
              <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="text-[14px]" 
                  style={{ 
                    fontWeight: 600, 
                    color: 'var(--rayo-forest-900)' 
                  }}
                >
                  {post.author}
                </span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          sessionStorage.setItem("rayo-pending-community-slug", post.forum_slug);
                        } catch { /* noop */ }
                        window.dispatchEvent(new CustomEvent("rayo:open-community", { detail: { slug: post.forum_slug } }));
                      }}
                      className="hover:underline"
                      style={{ fontWeight: 600, color: 'var(--rayo-terra-500)' }}
                      title={`Abrir c/${post.forum_slug}`}
                    >
                      {post.forum_icon ? `${post.forum_icon} ` : ""}c/{post.forum_slug}
                    </button>
                    <span>•</span>
                  </>
                )}
                <Clock className="w-3 h-3" />
                <span>{post.time}</span>
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

        {/* Content */}
        <p 
          className="text-[15px] mb-4 leading-relaxed" 
          style={{ color: 'var(--rayo-forest-900)' }}
        >
          {post.content}
        </p>

        {/* Images — Task #92: até 4 imagens em grid responsivo */}
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
              <div
                key={i}
                className={
                  post.images.length === 3 && i === 0
                    ? "row-span-2"
                    : ""
                }
              >
                <ImageWithFallback
                  src={src}
                  alt={`Imagem ${i + 1}`}
                  className="w-full h-full object-cover"
                  style={{ minHeight: post.images.length === 1 ? "auto" : 160 }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div 
          className="flex items-center gap-6 pt-3"
          style={{ borderTop: '1px solid var(--rayo-sand-300)' }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likePost(post.id)}
            className="gap-2"
            style={{
              color: post.userReacted ? '#FF5A5F' : 'var(--rayo-ink-400)',
            }}
          >
            <Heart className={`w-4 h-4 ${post.userReacted ? 'fill-[#FF5A5F]' : ''}`} />
            <span className="text-[13px]" style={{ fontWeight: 500 }}>
              {post.likes}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onComment}
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
            onClick={onShare}
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
          <div className="ml-auto">
            <FavoriteIcon id={post.id} type="post" />
          </div>
        </div>
      </div>
    </div>
  );
}

// GROUP CARD COMPONENT
interface GroupCardProps {
  group: any;
}

function GroupCard({ group }: GroupCardProps) {
  const [isJoined, setIsJoined] = useState<boolean>(!!group.isJoined);
  const [members, setMembers] = useState<number>(Number(group.members) || 0);
  const [busy, setBusy] = useState(false);

  // Mantém estado em sincronia caso a lista recarregue.
  useEffect(() => {
    setIsJoined(!!group.isJoined);
    setMembers(Number(group.members) || 0);
  }, [group.isJoined, group.members]);

  const handleJoinGroup = async () => {
    if (busy || !group.slug) return;
    const next = !isJoined;
    setBusy(true);
    setIsJoined(next);
    setMembers((m) => Math.max(0, m + (next ? 1 : -1)));
    try {
      const res = next
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
      enhancedToast.success({
        title: next ? "Você entrou no grupo! 🎉" : "Você saiu do grupo",
        description: next ? `Bem-vindo ao grupo "${group.name}"` : `Você não faz mais parte de "${group.name}"`,
        haptic: true,
      });
    } catch (err: any) {
      // Reverte otimismo em caso de erro.
      setIsJoined(!next);
      setMembers((m) => Math.max(0, m + (next ? -1 : 1)));
      enhancedToast.error({ title: "Não foi possível atualizar a inscrição", description: err?.message });
    } finally {
      setBusy(false);
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
        {isJoined && (
          <Badge 
            className="absolute top-3 right-3" 
            style={{ 
              fontSize: '11px', 
              fontWeight: 600,
              background: 'var(--rayo-terra-500)',
              color: '#FFFFFF',
            }}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Membro
          </Badge>
        )}
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
  onLikeComment: (commentId: number) => void;
  highlightCommentId?: number | null;
}

function CommentsPanel({ post, comments, loadingComments, onClose, onSubmitComment, onLikeComment, highlightCommentId }: CommentsPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Task #115 — body-scroll-lock enquanto o painel está aberto. Sem isso a
  // página de fundo rola atrás do overlay no mobile e os 80vh de altura
  // ficam confusos.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Task #115 — foco inicial no botão de fechar pra garantir que Esc/Tab
  // funcionem como esperado num dialog (a11y mínima sem focus-trap completo).
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // Esc fecha (a11y).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col"
        style={{ background: 'var(--rayo-sand-100)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--rayo-sand-300)' }}>
          <h3 className="text-[16px]" style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}>
            Comentários ({post.comments})
          </h3>
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar comentários"
          >
            <X className="w-5 h-5" style={{ color: 'var(--rayo-ink-400)' }} />
          </Button>
        </div>

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
                  <button
                    onClick={() => onLikeComment(c.id)}
                    className="flex items-center gap-1 mt-1 text-[12px] transition-colors"
                    style={{ color: c.user_liked ? 'var(--rayo-terra-500)' : 'var(--rayo-ink-400)' }}
                  >
                    <Heart className="w-3 h-3" fill={c.user_liked ? 'currentColor' : 'none'} />
                    {c.like_count > 0 && <span>{c.like_count}</span>}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t flex flex-shrink-0 items-center gap-2" style={{ borderColor: 'var(--rayo-sand-300)' }}>
          <Input
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
