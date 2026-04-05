import { Heart, MessageCircle, Share2, MoreHorizontal, Plus, TrendingUp, Users, Clock, Pin, Send, Search, Sparkles, Trophy, UserPlus, ChevronRight, CheckCircle, Lock, Globe, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { useState, useEffect, useCallback } from "react";
import { PullToRefresh } from "./PullToRefresh";
import { SkeletonLoader } from "./SkeletonLoader";
import { enhancedToast } from "./EnhancedToast";
import { useApp } from "./AppContext";
import { CreatePostModal } from "./CreatePostModal";
import { EmojiReactionPicker, useReactions } from "./EmojiReactionPicker";
import { FavoriteIcon } from "./FavoriteButton";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ConversasPage } from "./ConversasPage";
import { useTheme } from "./ThemeProvider";
import { api } from "../lib/api";

interface Forum {
  id: number;
  name: string;
  description: string;
  icon: string;
  life_context: string | null;
  category: string;
  post_count: string;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentView, setCurrentView] = useState<"feed" | "grupos" | "trending" | "conversas">("feed");
  
  const { posts, likePost, sharePost, loadPosts } = useApp();
  const { reactions, handleReaction } = useReactions();
  const { theme } = useTheme();
  const [forums, setForums] = useState<Forum[]>([]);
  const [postComments, setPostComments] = useState<CommentData[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const loadForums = useCallback(async () => {
    try {
      const res = await api.get<{ forums: Forum[] }>("/api/community/forums");
      if (res.success && res.data) {
        setForums(res.data.forums);
      }
    } catch (err) {
      console.error("Error loading forums:", err);
    }
  }, []);

  useEffect(() => {
    loadForums();
  }, [loadForums]);

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
    name: f.name,
    members: parseInt(f.post_count) || 0,
    isJoined: false,
    category: f.category,
    activeNow: 0,
    postsToday: 0,
    image: "",
    description: f.description,
    icon: f.icon,
  }));

  const trendingTopics = [
    { topic: "#ComunicacaoNaoViolenta", posts: 34, trend: "+12%" },
    { topic: "#FinancasConjuntas", posts: 28, trend: "+8%" },
    { topic: "#EducacaoPositiva", posts: 22, trend: "+15%" },
    { topic: "#IntimidadeNoCasamento", posts: 19, trend: "+5%" }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 max-w-7xl mx-auto">
        <SkeletonLoader type="post" count={3} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div 
        className="min-h-screen"
        style={{ background: 'var(--raio-bg-primary)' }}
      >
        {/* NAVIGATION TABS - Sticky */}
        <div 
          className="sticky top-0 z-40"
          style={{ 
            background: 'var(--raio-bg-primary)',
            borderBottom: '1px solid var(--raio-border-default)',
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
                  borderColor: currentView === "feed" ? 'var(--raio-accent-primary)' : 'transparent',
                  color: currentView === "feed" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "feed") {
                    e.currentTarget.style.color = 'var(--raio-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "feed") {
                    e.currentTarget.style.color = 'var(--raio-text-tertiary)';
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
                  borderColor: currentView === "grupos" ? 'var(--raio-accent-primary)' : 'transparent',
                  color: currentView === "grupos" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "grupos") {
                    e.currentTarget.style.color = 'var(--raio-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "grupos") {
                    e.currentTarget.style.color = 'var(--raio-text-tertiary)';
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
                  borderColor: currentView === "trending" ? 'var(--raio-accent-primary)' : 'transparent',
                  color: currentView === "trending" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "trending") {
                    e.currentTarget.style.color = 'var(--raio-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "trending") {
                    e.currentTarget.style.color = 'var(--raio-text-tertiary)';
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
                  borderColor: currentView === "conversas" ? 'var(--raio-accent-primary)' : 'transparent',
                  color: currentView === "conversas" ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  if (currentView !== "conversas") {
                    e.currentTarget.style.color = 'var(--raio-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== "conversas") {
                    e.currentTarget.style.color = 'var(--raio-text-tertiary)';
                  }
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Mensagens
              </Button>
            </div>
          </div>
        </div>

        {/* HERO SECTION - Minimal */}
        <section 
          style={{ 
            background: 'var(--raio-bg-secondary)',
            borderBottom: '1px solid var(--raio-border-default)'
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Input
                  placeholder='Buscar posts, grupos, tópicos...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[56px] pl-6 pr-16 rounded-full border-2 transition-colors"
                  style={{ 
                    fontSize: '16px',
                    background: 'var(--raio-bg-primary)',
                    borderColor: 'var(--raio-border-default)',
                    color: 'var(--raio-text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--raio-accent-primary)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--raio-border-default)';
                  }}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-[44px] w-[44px] rounded-full transition-all"
                  style={{
                    background: 'var(--raio-accent-primary)',
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--raio-accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--raio-accent-primary)';
                  }}
                >
                  <Search className="w-5 h-5" />
                </Button>
              </div>

              {/* Create Post Button */}
              <Button
                onClick={() => setShowCreatePost(true)}
                className="w-full h-[56px] rounded-full shadow-sm hover:shadow-md transition-all"
                style={{ 
                  fontWeight: 600,
                  background: 'var(--raio-accent-primary)',
                  color: '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--raio-accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--raio-accent-primary)';
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Nova Publicação
              </Button>
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
            />
          )}

          {currentView === "grupos" && (
            <GruposView 
              groups={groups}
              categories={categories}
            />
          )}

          {currentView === "trending" && (
            <TrendingView 
              posts={posts.filter(p => p.likes > 20)}
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
            onClose={() => { setShowComments(false); setSelectedPost(null); setPostComments([]); }}
            onSubmitComment={(content) => submitComment(selectedPost.id, content)}
            onLikeComment={toggleCommentLike}
          />
        )}

        {/* Create Post Modal */}
        {showCreatePost && (
          <CreatePostModal open={showCreatePost} onOpenChange={setShowCreatePost} currentPage="comunidade" />
        )}
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
}

function FeedView({ posts, reactions, onReact, onComment, onShare, trendingTopics }: FeedViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Feed */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 
            className="text-[24px]" 
            style={{ 
              fontWeight: 700, 
              color: 'var(--raio-text-primary)' 
            }}
          >
            Feed da Comunidade
          </h2>
          <Badge 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--raio-accent-light)',
              color: 'var(--raio-accent-primary)',
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
          />
        ))}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Trending Topics */}
        <Card 
          style={{
            borderColor: 'var(--raio-border-default)',
            background: 'var(--raio-bg-secondary)',
          }}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp 
                className="w-5 h-5" 
                style={{ color: 'var(--raio-accent-primary)' }} 
              />
              <h3 
                className="text-[18px]" 
                style={{ 
                  fontWeight: 700, 
                  color: 'var(--raio-text-primary)' 
                }}
              >
                Tópicos em Alta
              </h3>
            </div>
            <div className="space-y-3">
              {trendingTopics.map((topic, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div>
                    <div 
                      className="text-[14px]" 
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--raio-accent-primary)' 
                      }}
                    >
                      {topic.topic}
                    </div>
                    <div 
                      className="text-[12px]" 
                      style={{ color: 'var(--raio-text-tertiary)' }}
                    >
                      {topic.posts} posts
                    </div>
                  </div>
                  <Badge 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 600,
                      background: 'var(--raio-accent-light)',
                      color: 'var(--raio-accent-primary)',
                    }}
                  >
                    {topic.trend}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card 
          style={{
            background: 'var(--raio-accent-light)',
            borderColor: 'var(--raio-accent-primary)',
            borderWidth: '1px',
          }}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles 
                className="w-5 h-5" 
                style={{ color: 'var(--raio-accent-primary)' }} 
              />
              <h3 
                className="text-[18px]" 
                style={{ 
                  fontWeight: 700, 
                  color: 'var(--raio-text-primary)' 
                }}
              >
                Você esta semana
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="rounded-lg p-3 text-center"
                style={{
                  background: 'var(--raio-bg-secondary)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div 
                  className="text-[20px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  5
                </div>
                <div 
                  className="text-[11px]" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  Posts criados
                </div>
              </div>
              <div 
                className="rounded-lg p-3 text-center"
                style={{
                  background: 'var(--raio-bg-secondary)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div 
                  className="text-[20px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  28
                </div>
                <div 
                  className="text-[11px]" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  Comentários
                </div>
              </div>
              <div 
                className="rounded-lg p-3 text-center"
                style={{
                  background: 'var(--raio-bg-secondary)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div 
                  className="text-[20px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  142
                </div>
                <div 
                  className="text-[11px]" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  Curtidas
                </div>
              </div>
              <div 
                className="rounded-lg p-3 text-center"
                style={{
                  background: 'var(--raio-bg-secondary)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div 
                  className="text-[20px] mb-1" 
                  style={{ 
                    fontWeight: 700, 
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  3
                </div>
                <div 
                  className="text-[11px]" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  Grupos ativos
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// GRUPOS VIEW
interface GruposViewProps {
  groups: any[];
  categories: any[];
}

function GruposView({ groups, categories }: GruposViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredGroups = selectedCategory
    ? groups.filter(g => g.category === selectedCategory)
    : groups;

  return (
    <div className="space-y-8">
      {/* Categories Filter - Spotify Style */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-[24px]" 
            style={{ 
              fontWeight: 700, 
              color: 'var(--raio-text-primary)' 
            }}
          >
            Categorias
          </h2>
          <Badge 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--raio-accent-light)',
              color: 'var(--raio-accent-primary)',
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
                    ? 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)'
                    : 'var(--raio-bg-tertiary)',
                  color: !selectedCategory ? '#FFFFFF' : 'var(--raio-text-primary)',
                  transform: !selectedCategory ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: !selectedCategory ? 'var(--raio-shadow-lg)' : 'none',
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
                    boxShadow: selectedCategory === category.name ? 'var(--raio-shadow-lg)' : 'none',
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
              color: 'var(--raio-text-primary)' 
            }}
          >
            Meus Grupos
          </h2>
          <Badge 
            style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              background: 'var(--raio-accent-primary)',
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
            color: 'var(--raio-text-primary)' 
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

// TRENDING VIEW
interface TrendingViewProps {
  posts: any[];
  reactions: any;
  onReact: (postId: number, emoji: string) => void;
  onComment: (post: any) => void;
  onShare: (post: any) => void;
  trendingTopics: any[];
}

function TrendingView({ posts, reactions, onReact, onComment, onShare, trendingTopics }: TrendingViewProps) {
  return (
    <div className="space-y-6">
      <div 
        className="rounded-2xl p-6 text-white"
        style={{
          background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
          boxShadow: 'var(--raio-shadow-glow)',
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post}
              reactions={reactions}
              onReact={onReact}
              onComment={() => onComment(post)}
              onShare={() => onShare(post)}
            />
          ))}
        </div>

        <div className="space-y-4">
          <Card 
            style={{
              borderColor: 'var(--raio-border-default)',
              background: 'var(--raio-bg-secondary)',
            }}
          >
            <div className="p-6">
              <h3 
                className="text-[18px] mb-4" 
                style={{ 
                  fontWeight: 700, 
                  color: 'var(--raio-text-primary)' 
                }}
              >
                Hashtags em Alta
              </h3>
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span 
                      className="text-[14px]" 
                      style={{ 
                        fontWeight: 600,
                        color: 'var(--raio-accent-primary)' 
                      }}
                    >
                      {topic.topic}
                    </span>
                    <Badge 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: 'var(--raio-accent-light)',
                        color: 'var(--raio-accent-primary)',
                      }}
                    >
                      {topic.trend}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
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
}

function PostCard({ post, reactions, onReact, onComment, onShare }: PostCardProps) {
  const { likePost } = useApp();

  return (
    <Card 
      className="hover:shadow-md transition-shadow"
      style={{
        borderColor: 'var(--raio-border-default)',
        background: 'var(--raio-bg-secondary)',
      }}
    >
      <CardContent className="p-6">
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
                    color: 'var(--raio-text-primary)' 
                  }}
                >
                  {post.author}
                </span>
                {post.isPinned && (
                  <Pin 
                    className="w-3 h-3" 
                    style={{ color: 'var(--raio-accent-primary)' }} 
                  />
                )}
              </div>
              <div 
                className="flex items-center gap-2 text-[12px]"
                style={{ color: 'var(--raio-text-tertiary)' }}
              >
                <Clock className="w-3 h-3" />
                <span>{post.time}</span>
                <span>•</span>
                <Badge 
                  style={{ 
                    fontSize: '10px', 
                    fontWeight: 600,
                    background: 'var(--raio-accent-light)',
                    color: 'var(--raio-accent-primary)',
                  }}
                >
                  {post.category}
                </Badge>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            style={{ color: 'var(--raio-text-tertiary)' }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <p 
          className="text-[15px] mb-4 leading-relaxed" 
          style={{ color: 'var(--raio-text-primary)' }}
        >
          {post.content}
        </p>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <ImageWithFallback
              src={post.images[0]}
              alt="Post image"
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Actions */}
        <div 
          className="flex items-center gap-6 pt-3"
          style={{ borderTop: '1px solid var(--raio-border-default)' }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likePost(post.id)}
            className="gap-2"
            style={{
              color: post.userReacted ? '#FF5A5F' : 'var(--raio-text-tertiary)',
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
            style={{ color: 'var(--raio-text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--raio-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--raio-text-tertiary)';
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
            style={{ color: 'var(--raio-text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--raio-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--raio-text-tertiary)';
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
      </CardContent>
    </Card>
  );
}

// GROUP CARD COMPONENT
interface GroupCardProps {
  group: any;
}

function GroupCard({ group }: GroupCardProps) {
  const [isJoined, setIsJoined] = useState(group.isJoined);

  const handleJoinGroup = () => {
    setIsJoined(!isJoined);
    enhancedToast.success({
      title: isJoined ? "Você saiu do grupo" : "Você entrou no grupo! 🎉",
      description: isJoined ? `Você não faz mais parte de "${group.name}"` : `Bem-vindo ao grupo "${group.name}"`,
      haptic: true
    });
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all overflow-hidden group"
      style={{
        borderColor: 'var(--raio-border-default)',
        background: 'var(--raio-bg-secondary)',
      }}
    >
      {/* Group Image */}
      <div 
        className="relative h-32 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
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
              background: 'var(--raio-accent-primary)',
              color: '#FFFFFF',
            }}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Membro
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="mb-3">
          <h3 
            className="text-[16px] mb-1 line-clamp-1" 
            style={{ 
              fontWeight: 600, 
              color: 'var(--raio-text-primary)' 
            }}
          >
            {group.name}
          </h3>
          <Badge 
            style={{ 
              fontSize: '11px', 
              fontWeight: 600,
              background: 'var(--raio-accent-light)',
              color: 'var(--raio-accent-primary)',
            }}
          >
            {group.category}
          </Badge>
        </div>

        <div 
          className="flex items-center justify-between mb-4 text-[12px]"
          style={{ color: 'var(--raio-text-tertiary)' }}
        >
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{group.members.toLocaleString()} membros</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--raio-success)' }}
            ></div>
            <span>{group.activeNow} online</span>
          </div>
        </div>

        <Button
          onClick={handleJoinGroup}
          className="w-full"
          style={{ 
            fontWeight: 600,
            background: isJoined ? 'var(--raio-bg-tertiary)' : 'var(--raio-accent-primary)',
            color: isJoined ? 'var(--raio-text-secondary)' : '#FFFFFF',
          }}
          onMouseEnter={(e) => {
            if (isJoined) {
              e.currentTarget.style.background = 'var(--raio-bg-primary)';
            } else {
              e.currentTarget.style.background = 'var(--raio-accent-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (isJoined) {
              e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
            } else {
              e.currentTarget.style.background = 'var(--raio-accent-primary)';
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
      </CardContent>
    </Card>
  );
}

interface CommentsPanelProps {
  post: any;
  comments: CommentData[];
  loadingComments: boolean;
  onClose: () => void;
  onSubmitComment: (content: string) => Promise<boolean>;
  onLikeComment: (commentId: number) => void;
}

function CommentsPanel({ post, comments, loadingComments, onClose, onSubmitComment, onLikeComment }: CommentsPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col"
        style={{ background: 'var(--raio-bg-primary)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--raio-border-default)' }}>
          <h3 className="text-[16px]" style={{ fontWeight: 700, color: 'var(--raio-text-primary)' }}>
            Comentários ({post.comments})
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <MoreHorizontal className="w-5 h-5" style={{ color: 'var(--raio-text-tertiary)' }} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingComments ? (
            <div className="text-center py-8" style={{ color: 'var(--raio-text-tertiary)' }}>Carregando...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--raio-text-tertiary)' }}>
              Nenhum comentário ainda. Seja o primeiro!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback style={{ background: 'var(--raio-accent-light)', color: 'var(--raio-accent-primary)', fontSize: '12px' }}>
                    {c.author_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px]" style={{ fontWeight: 600, color: 'var(--raio-text-primary)' }}>
                      {c.author_name}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--raio-text-tertiary)' }}>
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-[13px] mt-1" style={{ color: 'var(--raio-text-secondary)' }}>
                    {c.content}
                  </p>
                  <button
                    onClick={() => onLikeComment(c.id)}
                    className="flex items-center gap-1 mt-1 text-[12px] transition-colors"
                    style={{ color: c.user_liked ? 'var(--raio-accent-primary)' : 'var(--raio-text-tertiary)' }}
                  >
                    <Heart className="w-3 h-3" fill={c.user_liked ? 'currentColor' : 'none'} />
                    {c.like_count > 0 && <span>{c.like_count}</span>}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t flex items-center gap-2" style={{ borderColor: 'var(--raio-border-default)' }}>
          <Input
            placeholder="Escreva um comentário..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            className="flex-1"
            style={{ background: 'var(--raio-bg-secondary)', color: 'var(--raio-text-primary)' }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!commentText.trim() || submitting}
            style={{ background: 'var(--raio-accent-primary)', color: '#fff' }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
