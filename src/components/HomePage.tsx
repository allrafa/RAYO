// HomePage — recriada 1:1 com o mock attached_assets/RAYO_(1)/Home.html
// (Task #57). 11 seções editoriais, ordem fixa, todos os dados reais
// preservados (dashboard, homeFeed CMS, youtubeData, missões, posts).
import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  ArrowRight, BookOpen, Clock, Heart, MessageCircle,
  Target, MessagesSquare, Play,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { PullToRefresh } from "./PullToRefresh";
import { enhancedToast } from "./EnhancedToast";
import { useApp } from "./AppContext";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { TrilhaTransformacaoChat } from "./TrilhaTransformacao/TrilhaTransformacaoChat";
import { CentralConversasPage } from "./TrilhaTransformacao/CentralConversasPage";
import { SimpleQuizTest } from "./SimpleQuizTest";
import { MusicPage } from "./MusicPage";
import { PlaylistsExpandedPage } from "./PlaylistsExpandedPage";
import { HojeNoRaio } from "./home/HojeNoRaio";
import { RailCarousel } from "./home/RailCarousel";
import { UnifiedContinue } from "./home/UnifiedContinue";
import { PalavraDoDia } from "./home/PalavraDoDia";
import { SemanaViva } from "./home/SemanaViva";
import { AliancaCard } from "./home/AliancaCard";
import { StreakChip } from "./home/StreakChip";
import { PushPrompt } from "./PushPrompt";
import { useYouTubeData } from "./hooks/useYouTubeData";
import { YouTubeShortCard } from "./youtube/YouTubeShortCard";
import { YouTubePlayerWithPlaylist } from "./youtube/YouTubePlayerWithPlaylist";
import { YouTubePlaylistModal } from "./youtube/YouTubePlaylistModal";
import { YouTubeVideo, YouTubePlaylist, YouTubeShort } from "./youtube/YouTubeTypes";
import { fetchPlaylistVideos } from "./youtube/YouTubeService";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import "../styles/home-rayo.css";

interface DashboardData {
  greeting: { name: string; segments: string[] };
  recommendedSectionOrder?: string[];
  gamification: {
    level: number; levelTitle: string;
    xp: number; streak: number; longestStreak: number;
    xpForNextLevel: number; levelProgress: number;
  };
  weeklyXP: number;
  completedCoursesCount: number;
  coursesInProgress: Array<{
    id: number; title: string; thumbnail: string; category: string;
    instructor: string; duration: string; progress: number;
    completedLessons: number; totalLessons: number;
  }>;
  enrolledNotStarted: Array<{
    id: number; title: string; thumbnail: string; category: string;
    instructor: string; duration: string; progress: number;
    completedLessons: number; totalLessons: number;
  }>;
  recommendedCourses: Array<{
    id: number; title: string; description: string; thumbnail: string;
    category: string; lifeContext: string; level: string; duration: string;
    totalLessons: number; rating: number; students: number; instructor: string;
    isPremium: boolean;
  }>;
  recentPosts: Array<{
    id: number; content: string; category: string;
    likeCount: number; commentCount: number; createdAt: string;
    authorId?: number; authorName: string; authorAvatar?: string | null;
    forumName: string; forumIcon: string;
    forumSlug: string | null;
  }>;
  missions: Array<{
    id: number; title: string; description: string; type: string;
    actionCount: number; currentProgress: number; completed: boolean;
    rewardClaimed: boolean; rewardXP: number; icon: string;
  }>;
}

interface HomePageProps {
  userSegment: string;
  onNavigate?: (tab: string) => void;
  userName: string;
  /** @deprecated mantido por compat com App.tsx; valor real vem do dashboard. */
  userLevel?: number;
}

// CMS-managed home rails. Mirrors server/features/home-feed/service.ts.
type HomeFeedSectionKey = "recently_played" | "made_for_you" | "trending" | "podcasts";
interface HomeFeedRow {
  id: number; section: HomeFeedSectionKey;
  title: string; subtitle: string | null;
  image_url: string | null; gradient: string | null;
  badge_text: string | null; meta_text: string | null;
  progress: number | null; sort_order: number;
  // Task #171 — destino real do card.
  content_item_id: number | null;
  content_kind: string | null;
  link_url: string | null;
}
type HomeFeedSections = Record<HomeFeedSectionKey, HomeFeedRow[]>;

// ── Helpers ──────────────────────────────────────────────────────
function formatDateBR(): string {
  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "AGORA";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `HÁ ${minutes}MIN`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `HÁ ${hours}H`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `HÁ ${days}D`;
  return `HÁ ${Math.floor(days / 7)}SEM`;
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "·";
}

// Round-robin fallback gradient class for cards without image_url.
function fallbackClass(prefix: string, idx: number, options: string[]): string {
  return `${prefix}-${options[idx % options.length]}`;
}

// ── Section header ───────────────────────────────────────────────
function SecHead({
  eyebrow, title, action,
}: {
  eyebrow: string;
  title: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rh-sec-head">
      <div>
        <div className="rh-sec-eyebrow">{eyebrow}</div>
        <h2 className="rh-sec-title">{title}</h2>
      </div>
      {action && (
        <button type="button" className="rh-sec-action" onClick={action.onClick}>
          {action.label}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function HomePage({ userName, userSegment, onNavigate }: HomePageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<"communication" | "conflict" | null>(null);
  const [isInMusicPage, setIsInMusicPage] = useState(false);
  const [isInPlaylistsExpanded, setIsInPlaylistsExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | YouTubeShort | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<YouTubePlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [playerPlaylist, setPlayerPlaylist] = useState<YouTubePlaylist | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [todayRefreshKey, setTodayRefreshKey] = useState(0);
  // Hoje no RAYO: undefined enquanto não soubermos; false esconde a section
  // inteira (incluindo aside) quando o item é nulo/skipped.
  const [hojeVisible, setHojeVisible] = useState<boolean>(true);
  const [homeFeed, setHomeFeed] = useState<HomeFeedSections | null>(null);
  const { user: authUser } = useAuth();
  const { data: youtubeData, loading: youtubeLoading } = useYouTubeData();

  const {
    isInOrbChat, setIsInOrbChat,
    isInCentralConversas, setIsInCentralConversas,
    setCurrentCourseId, setIsInCourseDetail,
    setCurrentVideoId, setIsInVideoPage,
  } = useApp();

  // Task #171 — roteia um card editorial pro destino certo, em ordem
  // de prioridade: conteúdo vinculado (player interno ou turma) →
  // link interno/externo → toast "Em breve". Sem fallback genérico
  // pra página de explorar — admin precisa configurar o destino, ou o
  // card mostra mensagem honesta. As actions "Ver tudo" / "Toda a
  // biblioteca" do header da seção continuam abrindo PlaylistsExpanded/
  // MusicPage; só os cards individuais respeitam essa regra.
  const openHomeFeedCard = useCallback((row: HomeFeedRow) => {
    // Conteúdo vinculado tem prioridade. O backend só permite content_kind
    // em {audio, video, reels, curso} — qualquer outro tipo nem chega aqui.
    if (row.content_item_id && row.content_kind) {
      const k = row.content_kind;
      if (k === "audio" || k === "video" || k === "reels") {
        setCurrentVideoId(String(row.content_item_id));
        setIsInVideoPage(true);
        return;
      }
      if (k === "curso") {
        setCurrentCourseId(row.content_item_id);
        setIsInCourseDetail(true);
        // TurmaShell renderiza dentro da aba Academia — sem trocar de
        // aba, o detalhe não aparece quando o clique vem da Home.
        onNavigate?.("academia");
        return;
      }
    }
    if (row.link_url) {
      const url = row.link_url;
      if (/^https?:\/\//i.test(url)) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else if (url.startsWith("/")) {
        window.location.assign(url);
      }
      return;
    }
    // Sem destino configurado: mensagem honesta. NÃO caímos mais pra
    // PlaylistsExpanded/MusicPage genérica — isso era o bug original.
    enhancedToast.info("Em breve");
  }, [setCurrentVideoId, setIsInVideoPage, setCurrentCourseId, setIsInCourseDetail, onNavigate]);

  // ── Data loaders ───────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    if (!authUser) { setDashboardLoading(false); return; }
    try {
      const res = await api.get<DashboardData>("/api/dashboard");
      if (res.success && res.data) setDashboard(res.data);
    } catch (err) {
      console.error("[HomePage] Failed to load dashboard:", err);
    } finally {
      setDashboardLoading(false);
    }
  }, [authUser]);

  const loadHomeFeed = useCallback(async () => {
    try {
      const res = await api.get<{ sections: HomeFeedSections }>("/api/home-feed");
      if (res.success && res.data) setHomeFeed(res.data.sections);
      else setHomeFeed(null);
    } catch (err) {
      console.error("[HomePage] Failed to load home feed:", err);
      setHomeFeed(null);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { void loadHomeFeed(); }, [loadHomeFeed]);

  useEffect(() => {
    if (currentQuiz) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [currentQuiz]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadDashboard(), loadHomeFeed()]);
      setTodayRefreshKey((k) => k + 1);
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

  const homeCategories = useMemo(() => ({
    madeForYou: homeFeed?.made_for_you ?? [],
    trending: homeFeed?.trending ?? [],
    podcasts: homeFeed?.podcasts ?? [],
  }), [homeFeed]);

  // ── Greeting / hero copy ───────────────────────────────────────
  const primarySegment = dashboard?.greeting.segments?.[0] ?? userSegment;

  // ── Derived data for sections ──────────────────────────────────
  const courseFallbacks = ["finance", "couple", "kids", "communication"];
  const colFallbacks = ["a", "b", "c"];
  const altaFallbacks = ["a", "b", "c"];
  const podFallbacks = ["a", "b", "c", "d"];

  // Recommendation cards (top 5 from dashboard + youtubeData.playlists)
  const recommendedCourses = dashboard?.recommendedCourses?.slice(0, 5) ?? [];
  const discussions = dashboard?.recentPosts?.slice(0, 3) ?? [];
  const trending = homeCategories.trending.slice(0, 3);
  const podcasts = homeCategories.podcasts.slice(0, 4);
  // Task #171 — admin-curado tem prioridade sobre YouTube auto. Sem isso,
  // qualquer playlist disponível no YouTube esconderia os cards
  // configurados no admin.
  const collections = (
    homeCategories.madeForYou.length
      ? homeCategories.madeForYou.slice(0, 3).map((row, i) => ({
          id: `cms-${row.id}`,
          title: row.title,
          subtitle: row.subtitle ?? "",
          image_url: row.image_url,
          badge_text: row.badge_text ?? "",
          eyebrow: row.subtitle ?? row.title,
          fallbackIdx: i,
          onClick: () => openHomeFeedCard(row),
        }))
      : (youtubeData?.playlists ?? []).slice(0, 3).map((p, i) => ({
          id: `yt-${p.id}`,
          title: p.title,
          subtitle: p.description ?? "",
          image_url: p.thumbnail?.high ?? null,
          badge_text: `${p.itemCount ?? 0} vídeos`,
          eyebrow: p.title,
          fallbackIdx: i,
          onClick: () => handlePlaylistClick(p),
        }))
  );
  const shorts = youtubeData?.shorts?.slice(0, 5) ?? [];
  const dailyMissions = dashboard?.missions?.filter((m) => m.type === "daily") ?? [];
  const completedDaily = dailyMissions.filter((m) => m.completed).length;
  const totalDailyXP = dailyMissions
    .filter((m) => m.completed)
    .reduce((s, m) => s + m.rewardXP, 0);

  // Color rotation for discussion avatars
  const avatarColors: Array<"sage" | "terra" | "forest" | "ochre"> =
    ["sage", "terra", "forest", "ochre"];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="rh-root">
        <div className="rh-content">

          {/* ── HOJE COM DEUS (ENGAGEMENT_PLAN E1/E2/E4) ──────────
              Cluster espiritual do topo: eyebrow + chama de sequência,
              Palavra do dia e semana viva — uma section só pra que o
              gap de 36px do rh-content não desconecte as peças. */}
          {authUser && (
            <section className="rh-sec" style={{ gap: 14 }} aria-label="Hoje com Deus">
              <div className="flex items-center justify-between">
                <div className="rh-sec-eyebrow" style={{ marginBottom: 0 }}>
                  Hoje com Deus
                </div>
                <StreakChip streak={dashboard?.gamification.streak ?? 0} />
              </div>
              <PalavraDoDia onEngaged={() => { void loadDashboard(); }} />
              <SemanaViva refreshKey={dashboard?.gamification.xp ?? 0} />
              <AliancaCard refreshKey={dashboard?.gamification.xp ?? 0} />
            </section>
          )}

          {/* ── HOJE NO RAYO ────────────────────────────────── */}
          {/* Mantém HojeNoRaio SEMPRE montado pra preservar lifecycle
              (refreshKey/skip/day rollover). A section toda some via
              `display:none` quando o filho avisa que não há item. */}
          {authUser && (
            <section
              className="rh-sec"
              style={hojeVisible ? undefined : { display: "none" }}
              aria-hidden={!hojeVisible}
            >
              <SecHead
                eyebrow={`Editorial · ${formatDateBR()}`}
                title={<>Hoje <span className="rh-light">no</span> RAYO</>}
                action={{ label: "Arquivo editorial", onClick: () => onNavigate?.("academia") }}
              />
              <div className="rh-hoje">
                <HojeNoRaio
                  refreshKey={todayRefreshKey}
                  userId={authUser.id}
                  onCompleted={() => { void loadDashboard(); }}
                  onVisibilityChange={setHojeVisible}
                  onTabChange={onNavigate}
                />
                {/* Aside: agenda do dia (sage = roda de conversa, ochre = desafio) */}
                <div className="rh-hoje-aside">
                  <button
                    type="button"
                    className="rh-hoje-tile sage"
                    onClick={() => onNavigate?.("comunidade")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="rh-hoje-tile-icon"><MessagesSquare className="w-4 h-4" /></div>
                      <span className="rh-hoje-tile-eyebrow">Agenda · hoje</span>
                    </div>
                    <div>
                      <div className="rh-hoje-tile-title">Roda de conversa: limites no namoro</div>
                      <div className="rh-hoje-tile-foot">
                        <span>20h · Comunidade</span>
                        <span className="rh-arrow">Entrar →</span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="rh-hoje-tile ochre"
                    onClick={() => onNavigate?.("perfil")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="rh-hoje-tile-icon"><Target className="w-4 h-4" /></div>
                      <span className="rh-hoje-tile-eyebrow">Desafio · 7 dias</span>
                    </div>
                    <div>
                      <div className="rh-hoje-tile-title">Uma palavra de afeto antes de dormir</div>
                      <div className="rh-hoje-tile-foot">
                        <span>Dia {Math.min(7, (dashboard?.gamification.streak ?? 0) % 8 || 1)} de 7</span>
                        <span className="rh-arrow">Acompanhar →</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ── ATIVAR NOTIFICAÇÕES (push) ──────────────────── */}
          <PushPrompt />

          {/* ── CONTINUE DE ONDE PAROU (UX_PLAN.md J1) ──────── */}
          <UnifiedContinue onOpenAcademia={() => onNavigate?.("academia")} />

          {/* ── RECOMENDADO ─────────────────────────────────── */}
          {recommendedCourses.length > 0 && (
            <section className="rh-sec">
              <SecHead
                eyebrow={primarySegment ? `Para você · ${primarySegment}` : "Para você"}
                title={<>Recomendado <span className="rh-light">para você</span></>}
                action={{ label: "Ver todos", onClick: () => onNavigate?.("academia") }}
              />
              <RailCarousel
                className="ra-rail rh-course-grid"
                ariaLabel="Cursos recomendados — deslize horizontalmente"
              >
                {recommendedCourses.map((course, i) => (
                  <button
                    key={course.id}
                    type="button"
                    className="rh-course"
                    onClick={() => {
                      setCurrentCourseId(course.id);
                      setIsInCourseDetail(true);
                    }}
                  >
                    <div className={`rh-course-img ${course.thumbnail ? "" : fallbackClass("fallback", i, courseFallbacks)}`}>
                      {course.thumbnail && (
                        <ImageWithFallback src={course.thumbnail} alt="" loading="lazy" />
                      )}
                      {course.isPremium && <span className="rh-course-tag premium">Premium</span>}
                      {course.duration && <span className="rh-course-tag dur">{course.duration}</span>}
                    </div>
                    <div className="rh-course-body">
                      <div className="rh-course-title">{course.title}</div>
                      <div className="rh-course-meta">
                        <span className="rh-star">★</span>
                        {course.rating.toFixed(1)} · {course.totalLessons} AULAS
                      </div>
                    </div>
                  </button>
                ))}
              </RailCarousel>
            </section>
          )}

          {/* ── DISCUSSÕES ATIVAS ───────────────────────────── */}
          {discussions.length > 0 && (
            <section className="rh-sec">
              <SecHead
                eyebrow="Comunidade · em tempo real"
                title={<>Discussões <span className="rh-light">ativas</span></>}
                action={{ label: "Ver feed completo", onClick: () => onNavigate?.("comunidade") }}
              />
              <div className="rh-disc-list">
                {discussions.map((post, i) => {
                  const color = avatarColors[i % avatarColors.length];
                  return (
                    <button
                      key={post.id}
                      type="button"
                      className="rh-disc"
                      onClick={() => {
                        // Task #122 — pushState pra URL canônica
                        // `/c/<slug>/p/<id>` ANTES de trocar de aba; a
                        // ComunidadePage lê o pathname no mount e
                        // renderiza a DiscussionPage. Sem forum_slug
                        // não fabricamos URL falsa — caímos pro feed
                        // genérico da Comunidade (fallback contratual).
                        if (post.forumSlug) {
                          try {
                            window.history.pushState({}, "", `/c/${post.forumSlug}/p/${post.id}`);
                          } catch { /* noop */ }
                        }
                        onNavigate?.("comunidade");
                      }}
                    >
                      <div className={`rh-disc-avatar ${color}`}>
                        {post.authorAvatar ? (
                          <ImageWithFallback
                            src={post.authorAvatar}
                            alt=""
                            loading="lazy"
                            className="rh-disc-avatar-img"
                          />
                        ) : (
                          avatarInitials(post.authorName || "·")
                        )}
                      </div>
                      <div className="rh-disc-body">
                        <div className="rh-disc-text">{post.content}</div>
                        <div className="rh-disc-meta">
                          <span>{(post.authorName || "ANÔNIMO").toUpperCase()}</span>
                          <span className="rh-disc-meta-divider" />
                          <span>{timeAgo(post.createdAt)}</span>
                          {post.forumName && (
                            <>
                              <span className="rh-disc-meta-divider" />
                              <span style={{ color: "var(--rayo-sage-700)" }}>
                                #{post.forumName.toUpperCase()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="rh-disc-stats">
                        <div className={`rh-disc-stat${post.likeCount > 0 ? " liked" : ""}`}>
                          <Heart className="w-3.5 h-3.5" fill={post.likeCount > 0 ? "currentColor" : "none"} />
                          {post.likeCount}
                        </div>
                        <div className="rh-disc-stat">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {post.commentCount}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── FEITO PARA VOCÊ ─────────────────────────────── */}
          {collections.length > 0 && (
            <section className="rh-sec">
              <SecHead
                eyebrow="Coleções · curadoria"
                title={<>Feito <span className="rh-light">para você</span></>}
                action={{ label: "Ver coleções", onClick: () => setIsInPlaylistsExpanded(true) }}
              />
              <RailCarousel
                className="ra-rail rh-col-grid"
                ariaLabel="Coleções — deslize horizontalmente"
              >
                {collections.map((col, i) => (
                  <button
                    key={col.id}
                    type="button"
                    className="rh-col"
                    onClick={col.onClick}
                  >
                    <div className={`rh-col-img ${col.image_url ? "" : fallbackClass("fallback", i, colFallbacks)}`}>
                      {col.image_url && <img src={col.image_url} alt="" loading="lazy" />}
                      {col.badge_text && <span className="rh-col-img-tag">{col.badge_text}</span>}
                      {col.eyebrow && <span className="rh-col-img-eyebrow">{col.eyebrow}</span>}
                    </div>
                    <div className="rh-col-body">
                      <div className="rh-col-title">{col.title}</div>
                      {col.subtitle && <div className="rh-col-desc">{col.subtitle}</div>}
                      <div className="rh-col-foot">
                        <span className="rh-col-author">Curadoria · RAYO</span>
                        <span className="rh-col-action">Iniciar →</span>
                      </div>
                    </div>
                  </button>
                ))}
              </RailCarousel>
            </section>
          )}

          {/* ── EM ALTA ─────────────────────────────────────── */}
          {trending.length > 0 && (
            <section className="rh-sec">
              <SecHead
                eyebrow="Trending · esta semana"
                title={<>Em alta <span className="rh-light">no</span> RAYO</>}
                action={{ label: "Ver tudo", onClick: () => setIsInPlaylistsExpanded(true) }}
              />
              <RailCarousel
                className="ra-rail rh-alta-grid"
                ariaLabel="Em alta — deslize horizontalmente"
              >
                {trending.map((row, i) => (
                  <button
                    key={row.id}
                    type="button"
                    className="rh-alta"
                    onClick={() => openHomeFeedCard(row)}
                  >
                    <div className={`rh-alta-img ${row.image_url ? "" : fallbackClass("fallback", i, altaFallbacks)}`}>
                      {row.image_url && <img src={row.image_url} alt="" loading="lazy" />}
                    </div>
                    <div className="rh-alta-rank">{String(i + 1).padStart(2, "0")}</div>
                    <div className="rh-alta-body">
                      <div className="rh-alta-title">{row.title}</div>
                      {row.subtitle && <div className="rh-alta-desc">{row.subtitle}</div>}
                    </div>
                  </button>
                ))}
              </RailCarousel>
            </section>
          )}

          {/* ── PODCASTS ────────────────────────────────────── */}
          {podcasts.length > 0 && (
            <section className="rh-sec">
              <SecHead
                eyebrow="Áudio · sob demanda"
                title={<>Podcasts <span className="rh-light">para você</span></>}
                action={{ label: "Toda a biblioteca", onClick: () => setIsInMusicPage(true) }}
              />
              <RailCarousel
                className="ra-rail rh-pod-grid"
                ariaLabel="Podcasts — deslize horizontalmente"
              >
                {podcasts.map((row, i) => (
                  <button
                    key={row.id}
                    type="button"
                    className="rh-pod"
                    onClick={() => openHomeFeedCard(row)}
                  >
                    <div className={`rh-pod-img ${row.image_url ? "" : fallbackClass("fallback", i, podFallbacks)}`}>
                      {row.image_url && <img src={row.image_url} alt="" loading="lazy" />}
                      {row.badge_text && <span className="rh-pod-tag">{row.badge_text}</span>}
                      <span className="rh-pod-play"><Play className="w-3.5 h-3.5" fill="currentColor" /></span>
                    </div>
                    <div className="rh-pod-title">{row.title}</div>
                    {(row.subtitle || row.meta_text) && (
                      <div className="rh-pod-desc">{row.subtitle || row.meta_text}</div>
                    )}
                  </button>
                ))}
              </RailCarousel>
            </section>
          )}

          {/* ── SHORTS ──────────────────────────────────────── */}
          {!youtubeLoading && shorts.length > 0 && (
            <section className="rh-sec">
              <SecHead
                eyebrow="Pílulas · 60 segundos"
                title={<>Shorts <span className="rh-light">RAYO</span></>}
                action={{ label: "Ver tudo", onClick: () => setIsInPlaylistsExpanded(true) }}
              />
              <RailCarousel
                className="ra-rail rh-shorts-grid"
                ariaLabel="Shorts — deslize horizontalmente"
              >
                {shorts.map((short) => (
                  <YouTubeShortCard
                    key={short.id}
                    short={short}
                    onClick={setSelectedVideo}
                  />
                ))}
              </RailCarousel>
            </section>
          )}

          {/* ── QUIZZES ─────────────────────────────────────── */}
          <section className="rh-sec">
            <SecHead
              eyebrow="Quizzes · perfil & missões"
              title={<>Descubra <span className="rh-light">seu</span> perfil</>}
            />
            <RailCarousel
              className="ra-rail rh-quiz-grid"
              ariaLabel="Quizzes — deslize horizontalmente"
            >
              <button
                type="button"
                className="rh-quiz terra"
                onClick={() => setCurrentQuiz("communication")}
              >
                <span className="rh-quiz-tag">
                  <Clock className="w-3 h-3" /> Quiz · 2 min
                </span>
                <div className="rh-quiz-body">
                  <div className="rh-quiz-title">
                    Comunicação <span className="rh-light">no</span><br />relacionamento
                  </div>
                  <div className="rh-quiz-meta">5 perguntas · +20 XP</div>
                </div>
              </button>
              <button
                type="button"
                className="rh-quiz forest"
                onClick={() => setCurrentQuiz("conflict")}
              >
                <span className="rh-quiz-tag">
                  <Target className="w-3 h-3" /> Quiz · 2 min
                </span>
                <div className="rh-quiz-body">
                  <div className="rh-quiz-title">
                    Gestão <span className="rh-light">de</span><br />conflitos
                  </div>
                  <div className="rh-quiz-meta">5 perguntas · +20 XP</div>
                </div>
              </button>
            </RailCarousel>
          </section>

          {/* ── MISSÕES ─────────────────────────────────────── */}
          {dailyMissions.length > 0 && (
            <section>
              <div className="rh-missions">
                <div className="rh-missions-head">
                  <div>
                    <div className="rh-sec-eyebrow" style={{ marginBottom: 6 }}>
                      Missões do dia · Renovam à 00h
                    </div>
                    <h2 className="rh-missions-head-title">
                      Mantenha <span className="rh-light">a chama</span> acesa
                    </h2>
                  </div>
                  <div className="rh-missions-head-progress">
                    {completedDaily} / {dailyMissions.length} CONCLUÍDAS · +{totalDailyXP} XP HOJE
                  </div>
                </div>
                {dailyMissions.slice(0, 5).map((mission, i) => {
                  const variant = (["", "terra", "ochre"] as const)[i % 3];
                  const pct = mission.actionCount > 0
                    ? Math.min(100, (mission.currentProgress / mission.actionCount) * 100)
                    : 0;
                  return (
                    <div key={mission.id} className="rh-mission">
                      <div className={`rh-mission-icon${variant ? ` ${variant}` : ""}`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="rh-mission-title">{mission.title}</div>
                        {mission.description && (
                          <div className="rh-mission-desc">{mission.description}</div>
                        )}
                      </div>
                      <div className="rh-mission-progress">
                        <div className="rh-mission-progress-bar">
                          <div
                            className={mission.completed ? "done" : ""}
                            style={{ width: `${mission.completed ? 100 : pct}%` }}
                          />
                        </div>
                        <div className={`rh-mission-progress-text${mission.completed ? " done" : ""}`}>
                          {mission.completed
                            ? "CONCLUÍDA ✓"
                            : `${mission.currentProgress} / ${mission.actionCount}`}
                        </div>
                      </div>
                      <div className={`rh-mission-xp${mission.completed ? " done" : ""}`}>
                        +{mission.rewardXP} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Espaço pra navbar mobile */}
          <div className="h-16" aria-hidden />
        </div>
      </div>

      {/* ── Modais & full-screen overlays ───────────────────── */}
      {/* CreatePlaylistModal preservado — usado por PlaylistsExpanded e
          YouTubePlayerWithPlaylist via context shared. */}
      <CreatePlaylistModal open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist} />

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

      {currentQuiz && (
        <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
          <SimpleQuizTest quizType={currentQuiz} onBack={() => setCurrentQuiz(null)} />
        </div>
      )}

      {isInMusicPage && (
        <div className="fixed inset-0 z-50 bg-background">
          <MusicPage onBack={() => setIsInMusicPage(false)} />
        </div>
      )}

      {isInCentralConversas && (
        <div className="fixed inset-0 z-50">
          <CentralConversasPage
            onClose={() => setIsInCentralConversas(false)}
            onStartNewConversation={() => {
              setIsInCentralConversas(false);
              setIsInOrbChat(true);
            }}
            onContinueConversation={() => {
              setIsInCentralConversas(false);
              setIsInOrbChat(true);
            }}
          />
        </div>
      )}

      <PlaylistsExpandedPage
        isOpen={isInPlaylistsExpanded}
        onClose={() => setIsInPlaylistsExpanded(false)}
      />

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
          onVideoChange={(newVideo) => setSelectedVideo(newVideo)}
          autoplay
        />
      )}

      <YouTubePlaylistModal
        playlist={selectedPlaylist}
        videos={playlistVideos}
        isOpen={selectedPlaylist !== null}
        onClose={() => {
          setSelectedPlaylist(null);
          setPlaylistVideos([]);
        }}
        onVideoClick={(video) => {
          setSelectedVideo(video);
          setPlayerPlaylist(selectedPlaylist);
          setSelectedPlaylist(null);
        }}
        loading={loadingPlaylist}
      />


      {/* isLoading state suppressed in JSX (PullToRefresh handles its own indicator) */}
      {isLoading && null}
    </PullToRefresh>
  );
}
