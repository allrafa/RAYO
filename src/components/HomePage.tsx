import { Play, BookOpen, Users, TrendingUp, Star, Clock, ArrowRight, Award, RefreshCw, Heart, Shuffle, MoreHorizontal, Plus, MessageCircle, Sparkles, Target, Brain, Flame, Zap, Trophy, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { PullToRefresh } from "./PullToRefresh";
import { SkeletonLoader } from "./SkeletonLoader";
import { enhancedToast } from "./EnhancedToast";
import { useApp } from "./AppContext";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { TrilhaTransformacaoChat } from "./TrilhaTransformacao/TrilhaTransformacaoChat";
import { CentralConversasPage } from "./TrilhaTransformacao/CentralConversasPage";
import { SmartRecommendations } from "./SmartRecommendations";
import { QuizPage } from "./QuizPage";
import { SimpleQuizTest } from "./SimpleQuizTest";
import { MusicPage } from "./MusicPage";
import { PlaylistsExpandedPage } from "./PlaylistsExpandedPage";
import { useState, useEffect, useCallback, useMemo } from "react";
import raioLogoFull from "figma:asset/91df98d68db1bbd58de3db20caeed5acda1da6fc.png";
import { useYouTubeData } from "./hooks/useYouTubeData";
import { useVideoProgress } from "./hooks/useVideoProgress";
import { YouTubeVideoCard } from "./youtube/YouTubeVideoCard";
import { YouTubePlaylistCard } from "./youtube/YouTubePlaylistCard";
import { YouTubeShortCard } from "./youtube/YouTubeShortCard";
import { YouTubePlayerWithPlaylist } from "./youtube/YouTubePlayerWithPlaylist";
import { YouTubeMockBanner } from "./youtube/YouTubeMockBanner";
import { YouTubePlaylistModal } from "./youtube/YouTubePlaylistModal";
import { YouTubeVideo, YouTubePlaylist, YouTubeShort } from "./youtube/YouTubeTypes";
import { fetchPlaylistVideos } from "./youtube/YouTubeService";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

interface DashboardData {
  greeting: { name: string; segments: string[] };
  gamification: {
    level: number;
    levelTitle: string;
    xp: number;
    streak: number;
    longestStreak: number;
    xpForNextLevel: number;
    levelProgress: number;
  };
  weeklyXP: number;
  completedCoursesCount: number;
  coursesInProgress: Array<{
    id: number;
    title: string;
    thumbnail: string;
    category: string;
    instructor: string;
    duration: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
  }>;
  enrolledNotStarted: Array<{
    id: number;
    title: string;
    thumbnail: string;
    category: string;
    instructor: string;
    duration: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
  }>;
  recommendedCourses: Array<{
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    category: string;
    lifeContext: string;
    level: string;
    duration: string;
    totalLessons: number;
    rating: number;
    students: number;
    instructor: string;
    isPremium: boolean;
  }>;
  recentPosts: Array<{
    id: number;
    content: string;
    category: string;
    likeCount: number;
    commentCount: number;
    createdAt: string;
    authorName: string;
    forumName: string;
    forumIcon: string;
  }>;
  missions: Array<{
    id: number;
    title: string;
    description: string;
    type: string;
    actionCount: number;
    currentProgress: number;
    completed: boolean;
    rewardClaimed: boolean;
    rewardXP: number;
    icon: string;
  }>;
}

interface HomePageProps {
  userSegment: string;
  userName: string;
  userLevel: number;
}

// ── Home Feed (CMS-managed rails) ────────────────────────────────────
// Mirrors server/features/home-feed/service.ts. Rows are mapped to the
// shape consumed by the local <ContentCard /> (image/duration/chart/etc).
type HomeFeedSectionKey =
  | "recently_played"
  | "made_for_you"
  | "trending"
  | "podcasts";

interface HomeFeedRow {
  id: number;
  section: HomeFeedSectionKey;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  gradient: string | null;
  badge_text: string | null;
  meta_text: string | null;
  progress: number | null;
  sort_order: number;
}

type HomeFeedSections = Record<HomeFeedSectionKey, HomeFeedRow[]>;

interface HomeCard {
  title: string;
  subtitle: string;
  image: string;
  gradient?: string;
  duration?: string;
  progress?: number;
  chart?: string;
  views?: string;
  type?: string;
  episodes?: string;
}

function mapRowToCard(row: HomeFeedRow): HomeCard {
  const card: HomeCard = {
    title: row.title,
    subtitle: row.subtitle ?? "",
    image: row.image_url ?? "",
  };
  if (row.gradient) card.gradient = row.gradient;
  if (row.progress !== null) card.progress = row.progress;
  switch (row.section) {
    case "recently_played":
      if (row.badge_text) card.duration = row.badge_text;
      break;
    case "trending":
      if (row.badge_text) card.chart = row.badge_text;
      if (row.meta_text) card.views = row.meta_text;
      break;
    case "podcasts":
      if (row.badge_text) card.type = row.badge_text;
      if (row.meta_text) card.episodes = row.meta_text;
      break;
    case "made_for_you":
    default:
      if (row.badge_text) card.duration = row.badge_text;
      break;
  }
  return card;
}

export function HomePage({ userSegment, userName, userLevel }: HomePageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<'communication' | 'conflict' | null>(null);
  const [isInMusicPage, setIsInMusicPage] = useState(false);
  const [isInPlaylistsExpanded, setIsInPlaylistsExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | YouTubeShort | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playerPlaylist, setPlayerPlaylist] = useState<YouTubePlaylist | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  // Home rails (Tocados recentemente / Feito para você / Em alta / Podcasts)
  // are sourced from the CMS via /api/home-feed (Task #20). Producers manage
  // these cards in Admin → Home / Destaques.
  const [homeFeed, setHomeFeed] = useState<HomeFeedSections | null>(null);
  const [homeFeedLoading, setHomeFeedLoading] = useState(true);
  const { user: authUser } = useAuth();
  
  const { data: youtubeData, loading: youtubeLoading } = useYouTubeData();
  const { getInProgressVideos } = useVideoProgress();

  const loadDashboard = useCallback(async () => {
    if (!authUser) {
      setDashboardLoading(false);
      return;
    }
    try {
      const res = await api.get<DashboardData>("/api/dashboard");
      if (res.success && res.data) {
        setDashboard(res.data);
      }
    } catch (err) {
      console.error("[HomePage] Failed to load dashboard:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const loadHomeFeed = useCallback(async () => {
    setHomeFeedLoading(true);
    try {
      const res = await api.get<{ sections: HomeFeedSections }>("/api/home-feed");
      if (res.success && res.data) {
        setHomeFeed(res.data.sections);
      } else {
        setHomeFeed(null);
      }
    } catch (err) {
      console.error("[HomePage] Failed to load home feed:", err);
      setHomeFeed(null);
    } finally {
      setHomeFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomeFeed();
  }, [loadHomeFeed]);

  useEffect(() => {
    if (currentQuiz) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [currentQuiz]);




  const { 
    userData, 
    courses, 
    startCourse, 
    isInOrbChat, 
    setIsInOrbChat, 
    isInCentralConversas, 
    setIsInCentralConversas,
    setCurrentVideoId,
    setIsInVideoPage,
    setCurrentCourseId,
    setIsInCourseDetail
  } = useApp();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadDashboard(), loadHomeFeed()]);
    } catch (error) {
      console.error("Erro na atualização:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistClick = async (playlist: YouTubePlaylist) => {
    setSelectedPlaylist(playlist);
    setLoadingPlaylist(true);
    
    try {
      const videos = await fetchPlaylistVideos(playlist.id);
      setPlaylistVideos(videos);
    } catch (error) {
      console.error("Erro ao carregar playlist:", error);
      enhancedToast.error("Erro ao carregar playlist");
    } finally {
      setLoadingPlaylist(false);
    }
  };

  // CMS-managed home rails. Empty arrays render as honest empty states
  // (or skeletons while loading); legacy mocks were removed in Task #20.
  const homeCategories = useMemo(() => {
    const sections = homeFeed ?? {
      recently_played: [],
      made_for_you: [],
      trending: [],
      podcasts: [],
    };
    return {
      recentlyPlayed: sections.recently_played.map(mapRowToCard),
      madeForYou: sections.made_for_you.map(mapRowToCard),
      trending: sections.trending.map(mapRowToCard),
      podcasts: sections.podcasts.map(mapRowToCard),
    };
  }, [homeFeed]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <SkeletonLoader type="card" count={4} />
      </div>
    );
  }

  const handlePlayVideo = () => {
    setCurrentVideoId("1");
    setIsInVideoPage(true);
  };

  // Renders a horizontal rail of CMS-managed home cards. Handles loading
  // (skeletons) and empty (honest empty state) states so producers know
  // when a section needs content.
  const HomeFeedRail = ({
    items,
    size = "medium",
    emptyHint,
  }: {
    items: HomeCard[];
    size?: "small" | "medium" | "large";
    emptyHint: string;
  }) => {
    const cardWidth = size === "large" ? "w-60" : size === "small" ? "w-40" : "w-48";
    const cardHeight = size === "large" ? "h-60" : size === "small" ? "h-40" : "h-48";

    if (homeFeedLoading) {
      return (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${cardWidth} shrink-0`}>
                <div className={`${cardHeight} rounded-lg bg-muted animate-pulse mb-3`} />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse mb-1" />
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 pb-2 transition-all duration-300 ease-out" style={{ width: 'max-content' }}>
          {items.map((item, index) => (
            <div key={index} className="hover:brightness-105 active:opacity-80 transition-all duration-200 ease-out">
              <ContentCard item={item} size={size} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ContentCard = ({ item, size = "medium" }: { item: any, size?: "small" | "medium" | "large" }) => {
    const cardClass = size === "large" ? "w-60" : size === "small" ? "w-40" : "w-48";
    const heightClass = size === "large" ? "h-60" : size === "small" ? "h-40" : "h-48";
    
    const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 100]);
      }
      handlePlayVideo();
    };
    
    return (
      <div className={`${cardClass} shrink-0 group cursor-pointer`}>
        <div className={`relative ${heightClass} rounded-lg overflow-hidden mb-3 bg-muted shadow-lg hover:shadow-xl transition-all duration-300`}>
          {item.gradient ? (
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
          ) : (
            <ImageWithFallback
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          
          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Play button overlay */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-90 transition-all duration-300 scale-0 group-hover:scale-100">
            <button
              onClick={handlePlayClick}
              className="h-14 w-14 rounded-full bg-white/90 hover:bg-white text-black hover:text-black p-0 shadow-xl backdrop-blur-sm hover:scale-110 transition-all duration-200 flex items-center justify-center"
            >
              <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
            </button>
          </div>

          {/* Progress bar for recently played */}
          {item.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div 
                className="h-full bg-primary"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}

          {/* Chart position */}
          {item.chart && (
            <div className="absolute top-2 left-2">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                {item.chart}
              </div>
            </div>
          )}

          {/* Duration or type badge */}
          {(item.duration || item.type) && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-black/70 text-white text-xs px-2 py-1">
                {item.duration || item.type}
              </Badge>
            </div>
          )}

          {/* Hover glow effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary/20 via-transparent to-transparent"></div>
        </div>
        
        <div className="px-1">
          <h3 className="font-body font-medium text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="font-body text-xs text-muted-foreground line-clamp-1">
            {item.subtitle || item.views || item.episodes}
          </p>
        </div>
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background">
        {/* Hero Section inspirado no Spotify */}
        <div className="relative h-96 md:h-[28rem] overflow-hidden">
          {/* Background com cards em mosaico */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            {/* Grid de cards de fundo */}
            <div className="absolute top-8 -right-12 w-72 h-56 opacity-20 overflow-hidden">
              <div className="grid grid-cols-3 gap-2 h-full p-2 rotate-12 scale-100">
                {/* Row 1 */}
                <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1596510914965-9ae08acae566?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseSUyMHRvZ2V0aGVyJTIwYm9uZGluZ3xlbnwxfHx8fDE3NTk2MzYxNDN8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Família feliz"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1631337034560-28f2a00ab3d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjByb21hbnRpYyUyMGVtYnJhY2UlMjBzdW5zZXR8ZW58MXx8fHwxNzU5NjM2MTQ2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Casal romântico"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1548972774-1d09980f8e8e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJlbnRzJTIwY2hpbGRyZW4lMjBwbGF5aW5nJTIwaG9tZXxlbnwxfHx8fDE3NTk2MzYxNTB8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Pais brincando"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Row 2 */}
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1749235878214-8a3079c72e5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwY291cGxlJTIwbG92ZSUyMGNlbGVicmF0aW9ufGVufDF8fHx8MTc1OTYzNjE1M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Casamento"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1758874961105-37e0cba8c9dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjBkaW5uZXIlMjB0b2dldGhlciUyMGJvbmRpbmd8ZW58MXx8fHwxNzU5NjM2MTU3fDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Jantar em família"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1689028538816-43e20bb203b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBob2xkaW5nJTIwaGFuZHMlMjB3YWxraW5nfGVufDF8fHx8fDE3NTk1ODMxNTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Casal caminhando"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Row 3 */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                  <div className="h-full flex items-center justify-center text-white text-xs">
                    Transformação
                  </div>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-green-500 rounded-lg">
                  <div className="h-full flex items-center justify-center text-white text-xs">
                    Relacionamentos
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-lg">
                  <div className="h-full flex items-center justify-center text-white text-xs">
                    Família RAIO
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overlay gradient */}
          {/* RAIO Premium Mosaic Background */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Grid de conteúdos em mosaico - inspirado no Spotify */}
            <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-60 will-change-transform">
              {/* Row 1 */}
              <div className="bg-gradient-to-br from-raio-forest-500 to-raio-forest-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                💑 Relacionamento
              </div>
              <div className="bg-gradient-to-br from-raio-gold-500 to-raio-gold-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                💰 Finanças
              </div>
              <div className="bg-gradient-to-br from-raio-coral-500 to-raio-coral-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                ❤️ Intimidade
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🙏 Fé
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                📚 Cursos
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🎯 Metas
              </div>
              
              {/* Row 2 */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🌱 Crescimento
              </div>
              <div className="bg-gradient-to-br from-pink-500 to-pink-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                👥 Comunidade
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🤖 Conselheiro
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                📖 Trilhas
              </div>
              <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                💪 Desafios
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                ⭐ Premium
              </div>
              
              {/* Row 3 */}
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                📱 App
              </div>
              <div className="bg-gradient-to-br from-lime-500 to-lime-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🎵 Playlists
              </div>
              <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🧠 Mindset
              </div>
              <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                👶 Filhos
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🏠 Casa
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                ✨ Transformação
              </div>
              
              {/* Row 4 */}
              <div className="bg-gradient-to-br from-slate-500 to-slate-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                📊 Métricas
              </div>
              <div className="bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                💎 Exclusivo
              </div>
              <div className="bg-gradient-to-br from-sky-500 to-sky-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🎓 Academia
              </div>
              <div className="bg-gradient-to-br from-stone-500 to-stone-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🔧 Ferramentas
              </div>
              <div className="bg-gradient-to-br from-neutral-500 to-neutral-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                📈 Progresso
              </div>
              <div className="bg-gradient-to-br from-zinc-500 to-zinc-700 rounded-lg flex items-center justify-center text-white font-bold text-xs p-2">
                🎖️ Conquistas
              </div>
            </div>
            
            {/* Gradient Overlay - similar ao Spotify */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20 will-change-transform" />
            
            {/* Extra overlay para melhor legibilidade */}
            {/* Spotify-inspired Premium Banner Layout */}
            <div className="absolute inset-0">
              {/* 3D Mosaic Background - Fotos de Família */}
              <div className="absolute inset-0 perspective-1000 photo-mosaic-3d">
                {/* Grid com perspectiva 3D */}
                <div className="absolute inset-0 transform-gpu rotate-y-12 scale-110 origin-center opacity-50">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 h-full p-4 transform -rotate-12">
                    
                    {/* Row 1 - Família Feliz */}
                    <div className="photo-card-3d transform rotate-6 hover:rotate-3">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1624448445915-97154f5e688c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseSUyMHBvcnRyYWl0fGVufDF8fHx8MTc1OTYxOTM4Nnww&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Família Feliz" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform -rotate-3 hover:rotate-0">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1641034189433-d2e405da28de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXRoZXIlMjBkYXVnaHRlciUyMHBsYXlpbmd8ZW58MXx8fHwxNzU5NjQ0Mjg2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Pai e Filha" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform rotate-8 hover:rotate-4">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1613186420419-868111e7ac07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RoZXIlMjBjaGlsZCUyMGhvbWVzY2hvb2x8ZW58MXx8fHwxNzU5NjQ0Mjg5fDA&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Homeschool" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform -rotate-5 hover:-rotate-2">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1598133775469-50f06d14a0c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBsYXVnaGluZyUyMHRvZ2V0aGVyfGVufDF8fHx8MTc1OTYyMTc5M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Casal Feliz" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform rotate-4 hover:rotate-1 hidden sm:block">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1627203030417-33b1129033d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXJnZSUyMGZhbWlseSUyMGdyb3VwfGVufDF8fHx8MTc1OTY0NDI5NHww&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Família Grande" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform -rotate-7 hover:-rotate-3 hidden sm:block">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1551498800-17cbc39c85bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjByZWFkaW5nJTIwdG9nZXRoZXJ8ZW58MXx8fHwxNzU5NjQ0Mjk4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Leitura em Família" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Row 2 - Repetir padrão */}
                    <div className="photo-card-3d transform -rotate-8 hover:-rotate-4">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1598133775469-50f06d14a0c6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBsYXVnaGluZyUyMHRvZ2V0aGVyfGVufDF8fHx8MTc1OTYyMTc5M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Casal" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform rotate-5 hover:rotate-2">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1624448445915-97154f5e688c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseSUyMHBvcnRyYWl0fGVufDF8fHx8MTc1OTYxOTM4Nnww&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Família" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform -rotate-2 hover:rotate-1">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1641034189433-d2e405da28de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXRoZXIlMjBkYXVnaHRlciUyMHBsYXlpbmd8ZW58MXx8fHwxNzU5NjQ0Mjg2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Pai e Filha" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform rotate-7 hover:rotate-3">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1613186420419-868111e7ac07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RoZXIlMjBjaGlsZCUyMGhvbWVzY2hvb2x8ZW58MXx8fHwxNzU5NjQ0Mjg5fDA&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Aprendizado" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform -rotate-9 hover:-rotate-5 hidden sm:block">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1627203030417-33b1129033d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXJnZSUyMGZhbWlseSUyMGdyb3VwfGVufDF8fHx8MTc1OTY0NDI5NHww&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="União Familiar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    <div className="photo-card-3d transform rotate-3 hover:rotate-0 hidden sm:block">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-2xl premium-card-hover">
                        <ImageWithFallback 
                          src="https://images.unsplash.com/photo-1551498800-17cbc39c85bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjByZWFkaW5nJTIwdG9nZXRoZXJ8ZW58MXx8fHwxNzU5NjQ0Mjk4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                          alt="Momentos Especiais" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Gradient Overlay - Spotify Style */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/90" />
              
              {/* Premium Brand Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-raio-forest-500/20 via-transparent to-raio-gold-500/20" />
            </div>
          </div>
          
          {/* Premium Content Layout - Spotify Style */}
          {/* TransformationPromo_Screen - Inspirational Background */}
          <div className="absolute inset-0">
            {/* Background Image */}
            <ImageWithFallback 
              src="https://images.unsplash.com/photo-1758273240403-052b3c99f636?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Vuc2VsaW5nJTIwdGhlcmFweSUyMHNlc3Npb24lMjBjYWxtfGVufDF8fHx8MTc1OTY0NDg1MXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Pessoa sendo aconselhada em ambiente calmo" 
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Gradient - From transparent to dark */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black/80" />
          </div>

          {/* Content Container - Auto Layout Vertical */}
          <div className="absolute inset-0 flex flex-col justify-center items-start p-6 max-w-sm mx-auto space-y-4">
            
            {/* Header - Logo RAIO */}
            <div className="flex items-center mb-2">
              <img 
                src={raioLogoFull}
                alt="RAIO"
                className="h-8 w-auto object-contain"
                style={{
                  filter: 'brightness(0) invert(1)', // Torna a logo branca
                }}
              />
            </div>

            {/* Headline - Main emotional connection */}
            <h1 className="font-display text-white font-bold text-3xl sm:text-4xl leading-tight mb-4">
              Diga qual é o seu problema que você está vivendo hoje.
            </h1>

            {/* Subheadline - Solution statement */}
            <p className="text-white/80 font-body text-base leading-relaxed mb-6 max-w-xs">
              Temos um conselheiro pronto para te aconselhar.
            </p>

            {/* CTA Button - Transformation focused */}
            <Button 
              size="lg"
              className="font-body bg-raio-gold-500 text-black hover:bg-yellow-400 rounded-3xl font-medium px-8 py-4 text-base shadow-lg hover:shadow-xl transition-all duration-200"
              style={{ backgroundColor: '#F5B800' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FFD633';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F5B800';
              }}
              onClick={() => {
                if ('vibrate' in navigator) {
                  navigator.vibrate([50, 50, 100]);
                }
                setIsInOrbChat(true);
              }}
            >
              Começar a transformação
            </Button>
          </div>
          
          {/* Botão de Central de Conversas no canto */}
          <div className="absolute top-4 right-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setIsInCentralConversas(true)}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Dashboard Loading State */}
        {dashboardLoading && authUser && (
          <div className="px-4 mt-8 mb-6">
            <SkeletonLoader type="card" count={1} />
          </div>
        )}

        {/* Dashboard Stats Cards */}
        {dashboard && (
          <div className="px-4 mt-8 mb-6">
            <h2 className="font-display text-xl font-semibold mb-4">
              {getGreeting()}, {dashboard.greeting.name}!
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50">
                <div className="flex flex-col items-center gap-1">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-2xl font-bold text-orange-600">{dashboard.gamification.streak}</span>
                  <span className="text-xs text-muted-foreground">Sequência</span>
                </div>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
                <div className="flex flex-col items-center gap-1">
                  <Trophy className="w-5 h-5 text-purple-500" />
                  <span className="text-2xl font-bold text-purple-600">{dashboard.gamification.level}</span>
                  <span className="text-xs text-muted-foreground">{dashboard.gamification.levelTitle}</span>
                </div>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
                <div className="flex flex-col items-center gap-1">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  <span className="text-2xl font-bold text-emerald-600">{dashboard.weeklyXP}</span>
                  <span className="text-xs text-muted-foreground">XP semanal</span>
                </div>
              </Card>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Nível {dashboard.gamification.level} → {dashboard.gamification.level + 1}</span>
                <span>{dashboard.gamification.xp} / {dashboard.gamification.xpForNextLevel} XP</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${dashboard.gamification.levelProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Continue de onde parou - Cursos em progresso */}
        {dashboard && dashboard.coursesInProgress.length > 0 && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Continue de onde parou</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
                {dashboard.coursesInProgress.map((course) => (
                  <Card
                    key={course.id}
                    className="w-64 shrink-0 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                    onClick={() => {
                      setCurrentCourseId(course.id);
                      setIsInCourseDetail(true);
                    }}
                  >
                    <div className="relative h-36 overflow-hidden">
                      <ImageWithFallback
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                        <div className="h-full bg-primary rounded-r-full" style={{ width: `${course.progress}%` }} />
                      </div>
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white text-xs">{Math.round(course.progress)}%</Badge>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1 mb-1">{course.title}</h3>
                      <p className="text-xs text-muted-foreground">{course.completedLessons}/{course.totalLessons} aulas</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recomendado para você */}
        {dashboard && dashboard.recommendedCourses.length > 0 && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Recomendado para você</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
                {dashboard.recommendedCourses.map((course) => (
                  <Card
                    key={course.id}
                    className="w-52 shrink-0 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden group"
                    onClick={() => {
                      setCurrentCourseId(course.id);
                      setIsInCourseDetail(true);
                    }}
                  >
                    <div className="relative h-32 overflow-hidden">
                      <ImageWithFallback
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {course.isPremium && (
                        <Badge className="absolute top-2 left-2 bg-yellow-500 text-black text-xs">Premium</Badge>
                      )}
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white text-xs">{course.duration}</Badge>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{course.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{course.rating.toFixed(1)}</span>
                        <span className="mx-1">·</span>
                        <span>{course.totalLessons} aulas</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Missões Ativas */}
        {dashboard && dashboard.missions.length > 0 && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Missões do dia</h2>
            </div>
            <div className="space-y-2">
              {dashboard.missions.filter(m => m.type === 'daily').slice(0, 3).map((mission) => (
                <Card key={mission.id} className={`p-3 ${mission.completed ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{mission.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm line-clamp-1">{mission.title}</span>
                        {mission.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${mission.completed ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, (mission.currentProgress / mission.actionCount) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{mission.currentProgress}/{mission.actionCount}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">+{mission.rewardXP} XP</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Discussões Ativas */}
        {dashboard && dashboard.recentPosts.length > 0 && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Discussões ativas</h2>
            </div>
            <div className="space-y-2">
              {dashboard.recentPosts.slice(0, 3).map((post) => (
                <Card key={post.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex gap-3">
                    <span className="text-xl shrink-0">{post.forumIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2 mb-1">{post.content}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{post.authorName}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likeCount}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.commentCount}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Continuar assistindo - Vídeos YouTube em progresso */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4 mt-8">
            <h2 className="font-display text-xl font-semibold">Continuar assistindo</h2>
          </div>
          
          {youtubeLoading ? (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-[280px] lg:w-[320px] flex-shrink-0">
                  <div className="aspect-video bg-muted rounded-lg animate-pulse mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {(() => {
                const inProgressVideoIds = getInProgressVideos();
                const inProgressVideos = youtubeData?.videos.filter(video => 
                  inProgressVideoIds.some(p => p.videoId === video.id)
                ) || [];
                
                if (inProgressVideos.length === 0) {
                  // Fallback: mostrar últimos vídeos do canal
                  const latestVideos = youtubeData?.videos.slice(0, 6) || [];
                  return (
                    <div className="overflow-x-auto scrollbar-hide">
                      <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
                        {latestVideos.map((video) => (
                          <YouTubeVideoCard
                            key={video.id}
                            video={video}
                            onClick={setSelectedVideo}
                            showProgress={false}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
                      {inProgressVideos.map((video) => (
                        <YouTubeVideoCard
                          key={video.id}
                          video={video}
                          onClick={setSelectedVideo}
                          showProgress={true}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Shorts RAIO */}
        {!youtubeLoading && youtubeData && youtubeData.shorts.length > 0 && (
          <div className="px-4 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Shorts RAIO</h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                {youtubeData.shorts.map((short) => (
                  <YouTubeShortCard
                    key={short.id}
                    short={short}
                    onClick={setSelectedVideo}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tocados recentemente — CMS-managed rail (Task #20) */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Tocados recentemente</h2>
          </div>
          <HomeFeedRail
            items={homeCategories.recentlyPlayed}
            size="medium"
            emptyHint="Sem itens recentes em destaque. Adicione cards em Admin → Home / Destaques."
          />
        </div>

        {/* Feito para você - Playlists do YouTube */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Feito para você</h2>
          </div>
          
          {youtubeLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {youtubeData && youtubeData.playlists.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {youtubeData.playlists.map((playlist) => (
                    <YouTubePlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onClick={handlePlaylistClick}
                    />
                  ))}
                </div>
              ) : (
                // Fallback: cards curados pelo CMS (Admin → Home / Destaques).
                <HomeFeedRail
                  items={homeCategories.madeForYou}
                  size="large"
                  emptyHint="Nenhuma playlist em destaque ainda. Producers podem adicionar cards em Admin → Home / Destaques."
                />
              )}
            </>
          )}
        </div>

        {/* Em alta */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Em alta no RAIO</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setIsInPlaylistsExpanded(true);
              }}
            >
              Ver tudo
            </Button>
          </div>
          <HomeFeedRail
            items={homeCategories.trending}
            size="medium"
            emptyHint="Sem destaques 'Em alta' no momento. Adicione cards em Admin → Home / Destaques."
          />
        </div>

        {/* Smart Recommendations */}
        {/* Quizzes de Autoconhecimento */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Descubra seu perfil</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                enhancedToast.info({
                  title: "🧠 Mais quizzes em breve!",
                  description: "Novos testes de autoconhecimento chegando",
                  haptic: true
                });
              }}
            >
              Ver tudo
            </Button>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2 transition-all duration-300 ease-out" style={{ width: 'max-content' }}>
              
              {/* Card 1: Quiz de Comunicação */}
              <div className="hover:brightness-105 active:opacity-80 transition-all duration-200 ease-out">
                <Card 
                  className="w-48 cursor-pointer border-0 bg-gradient-to-br from-raio-coral-500 to-raio-coral-600 text-white overflow-hidden"
                  onClick={() => {
                    setCurrentQuiz('communication');
                  }}
                >
                  <div className="relative p-4 h-28">
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        <Brain className="w-3 h-3 mr-1" />
                        Quiz
                      </Badge>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <h3 className="font-semibold text-sm mb-1">Comunicação no Relacionamento</h3>
                      <div className="flex items-center text-xs opacity-90">
                        <Clock className="w-3 h-3 mr-1" />
                        5 perguntas
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white/10 rounded-full" />
                  </div>
                </Card>
              </div>

              {/* Card 2: Quiz de Gestão de Conflitos */}
              <div className="hover:brightness-105 active:opacity-80 transition-all duration-200 ease-out">
                <Card 
                  className="w-48 cursor-pointer border-0 bg-gradient-to-br from-raio-gold-500 to-raio-gold-600 text-white overflow-hidden"
                  onClick={() => {
                    setCurrentQuiz('conflict');
                  }}
                >
                  <div className="relative p-4 h-28">
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        <Target className="w-3 h-3 mr-1" />
                        Quiz
                      </Badge>
                    </div>
                    <div className="flex flex-col justify-end h-full">
                      <h3 className="font-semibold text-sm mb-1">Gestão de Conflitos</h3>
                      <div className="flex items-center text-xs opacity-90">
                        <Users className="w-3 h-3 mr-1" />
                        5 perguntas
                      </div>
                    </div>
                    <div className="absolute -top-2 -left-2 w-10 h-10 bg-white/10 rounded-full" />
                  </div>
                </Card>
              </div>



            </div>
          </div>
        </div>

        {/* Podcasts */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Podcasts para você</h2>
            <Button variant="ghost" size="sm">Ver tudo</Button>
          </div>
          <HomeFeedRail
            items={homeCategories.podcasts}
            size="medium"
            emptyHint="Nenhum podcast em destaque ainda. Adicione cards em Admin → Home / Destaques."
          />
        </div>

        {/* Adicionar conteúdo - CTA */}
        <div className="px-4 mb-20">
          <Card className="p-6 text-center border-dashed border-2">

          </Card>
        </div>

        {/* Floating action button */}
        <div className="fixed bottom-24 right-4 z-40">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14"
            onClick={() => {
              // Lógica de reprodução será implementada
            }}
          >
            <Shuffle className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal 
        open={showCreatePlaylist} 
        onOpenChange={setShowCreatePlaylist} 
      />

      {/* Trilha da Transformação Chat - Full Screen */}
      {isInOrbChat && (
        <div className="fixed inset-0 z-50">
          <TrilhaTransformacaoChat 
            onClose={() => setIsInOrbChat(false)}
            onOpenCentralConversas={() => {
              setIsInOrbChat(false);
              setIsInCentralConversas(true);
            }}
          />
        </div>
      )}

      {/* Quiz Page - Full Screen Modal */}
      {currentQuiz && (
        <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
          <SimpleQuizTest
            quizType={currentQuiz}
            onBack={() => setCurrentQuiz(null)}
          />
        </div>
      )}

      {/* Music Page - Full Screen */}
      {isInMusicPage && (
        <div className="fixed inset-0 z-50 bg-background">
          <MusicPage onBack={() => setIsInMusicPage(false)} />
        </div>
      )}

      {/* Central de Conversas - Full Screen */}
      {isInCentralConversas && (
        <div className="fixed inset-0 z-50">
          <CentralConversasPage
            onClose={() => setIsInCentralConversas(false)}
            onStartNewConversation={() => {
              setIsInCentralConversas(false);
              setIsInOrbChat(true);
            }}
            onContinueConversation={(sessionId) => {
              setIsInCentralConversas(false);
              setIsInOrbChat(true);
            }}
          />
        </div>
      )}

      {/* Playlists Expandidas - Full Screen */}
      <PlaylistsExpandedPage
        isOpen={isInPlaylistsExpanded}
        onClose={() => setIsInPlaylistsExpanded(false)}
      />

      {/* YouTube Player - Full Screen */}
      {selectedVideo && (
        <YouTubePlayerWithPlaylist
          video={selectedVideo}
          playlist={playerPlaylist || undefined}
          playlistVideos={playlistVideos}
          onClose={() => {
            setSelectedVideo(null);
            setPlayerPlaylist(null);
            setPlaylistVideos([]);
          }}
          onVideoChange={(newVideo) => {
            setSelectedVideo(newVideo);
          }}
          autoplay={true}
        />
      )}

      {/* YouTube Playlist Modal */}
      <YouTubePlaylistModal
        playlist={selectedPlaylist}
        videos={playlistVideos}
        isOpen={selectedPlaylist !== null}
        onClose={() => {
          setSelectedPlaylist(null);
          setPlaylistVideos([]);
        }}
        onVideoClick={(video) => {
          // Quando clicar em um vídeo do modal da playlist, 
          // abre o player com a playlist completa
          setSelectedVideo(video);
          setPlayerPlaylist(selectedPlaylist);
          setSelectedPlaylist(null);
        }}
        loading={loadingPlaylist}
      />

      {/* YouTube Mock Banner - Informativo */}
      <YouTubeMockBanner />
    </PullToRefresh>
  );
}