import { Play, Users, Star, Clock, Heart, MessageCircle, Target, Brain, Flame, Zap, Trophy, CheckCircle2 } from "lucide-react";
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
        {/* Hero — single editorial layer (Task #42, Faxina). Substitui as
            três camadas sobrepostas (mosaico colorido + grid 3D rotacionado +
            foto de aconselhamento) por uma única composição editorial:
            imagem + overlay + saudação + headline + CTA. */}
        <div className="relative h-[22rem] md:h-[26rem] overflow-hidden">
          {/* Background editorial */}
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1758273240403-052b3c99f636?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Vuc2VsaW5nJTIwdGhlcmFweSUyMHNlc3Npb24lMjBjYWxtfGVufDF8fHx8MTc1OTY0NDg1MXww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Família caminhando junto em direção à transformação"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          {/* Overlay legível em qualquer tema (texto sempre branco) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/90" />
          {/* Brilho sutil de marca (token RAIO accent) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 50% at 80% 20%, var(--raio-accent-glow-soft), transparent 70%)',
            }}
          />

          {/* Conteúdo */}
          <div className="relative z-10 h-full flex flex-col justify-between p-6 max-w-2xl mx-auto">
            {/* Topo: logo + saudação personalizada */}
            <div className="flex items-center gap-3 pt-1">
              <img
                src={raioLogoFull}
                alt="RAIO"
                className="h-7 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="text-white/85 text-xs font-medium pl-3 border-l border-white/30">
                {getGreeting()}
                {authUser ? `, ${dashboard?.greeting.name ?? userName}` : ''}
              </span>
            </div>

            {/* Base: copy + CTA */}
            <div className="space-y-3 max-w-md">
              <h1 className="font-display-serif text-white text-3xl sm:text-4xl leading-[1.1]">
                Sua família, mais forte a cada dia.
              </h1>
              <p className="font-body text-white/80 text-sm sm:text-base leading-relaxed">
                Conteúdo, comunidade e práticas para iluminar todas as fases — Solteiro,
                Namoro, Noivos, Casados e Pais.
              </p>
              <Button
                size="lg"
                className="font-body bg-raio-gold-500 text-black hover:bg-raio-gold-600 rounded-3xl font-medium px-7 py-4 text-base shadow-lg transition-all duration-200 mt-2"
                onClick={() => {
                  if ('vibrate' in navigator) {
                    navigator.vibrate([50, 50, 100]);
                  }
                  setIsInOrbChat(true);
                }}
              >
                Falar com o conselheiro
              </Button>
            </div>
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
          <div className="px-4 mt-6 mb-6">
            {/* Saudação foi promovida para o hero (Task #42); aqui ficam só os stats. */}
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
            {/* "Ver tudo" oculto até existir destino real (Task #42). */}
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
            <h2 className="font-display text-xl font-semibold">Podcasts para você</h2>
            {/* "Ver tudo" oculto até existir destino real (Task #42). */}
          </div>
          <HomeFeedRail
            items={homeCategories.podcasts}
            size="medium"
            emptyHint="Nenhum podcast em destaque ainda. Adicione cards em Admin → Home / Destaques."
          />
        </div>

        {/* Espaço para a navbar mobile não cobrir o último rail (Task #42) */}
        <div className="h-20" aria-hidden="true" />
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