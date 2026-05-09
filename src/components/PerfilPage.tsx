import { useState, useEffect, useCallback, useRef } from "react";
import { 
  User, Bell, Heart, Trophy, Zap, 
  ChevronRight, LogOut, Moon, Sun, Globe, 
  Shield, MessageSquare,
  Award, Target, Crown, Camera, Share2, CheckCircle2,
  BookOpen, Users, Download, Trash2,
  ShieldAlert
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Progress } from "./ui/progress";
import { useApp } from "./AppContext";
import { useAuth, userHasRole } from "./AuthContext";
import { useAccessibility } from "./AccessibilityContext";
import { useTheme } from "./ThemeProvider";
import { toast } from "sonner@2.0.3";
import { FavoritosPage } from "./youtube/FavoritosPage";
import { BibliotecaWithBookReader } from "./BibliotecaWithBookReader";
import { useVideoProgress } from "./hooks/useVideoProgress";
import { api } from "../lib/api";
import { EditProfileModal, ChangePasswordModal, LanguageModal } from "./perfil/PerfilModals";
import { UserProfilePage } from "./UserProfilePage";

const LANGUAGE_LABELS: Record<string, string> = {
  "pt-BR": "Português",
  "en": "Inglês",
};

interface PerfilPageProps {
  /** Optional navigator so producer+ can jump to the Admin shell from
      the mobile profile (Admin no longer has a slot in the bottom navbar
      after Task #41). */
  onNavigate?: (tab: string) => void;
}

export function PerfilPage({ onNavigate }: PerfilPageProps = {}) {
  const { userData, books } = useApp();
  const { settings } = useAccessibility();
  const { theme, setTheme } = useTheme();
  const { logout, user, updatePreferences, uploadAvatar } = useAuth();
  const canAccessAdmin = userHasRole(user, "producer");
  // Task #45 — preferências vivem em users.notification_preferences (JSONB)
  // no formato nested `{ notifications: {...}, language }`. Fallbacks
  // tolerantes para perfis legados que tinham flat keys.
  const notificationsEnabled =
    user?.notification_preferences?.notifications?.push ??
    user?.notification_preferences?.push ??
    true;
  const language: "pt-BR" | "en" =
    (user?.notification_preferences?.language as "pt-BR" | "en") || "pt-BR";
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const { favoriteVideos } = useVideoProgress();
  // Task #45 — modais e estados auxiliares.
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Task #45 — preview otimista do avatar: criamos um objectURL local
  // assim que o usuário escolhe um arquivo e mostramos imediatamente
  // no header. Se o upload falhar, voltamos pro avatar do servidor.
  // Sucesso: limpamos o preview e o user atualizado já traz a nova URL.
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  interface ActivityStats {
    libraryCount: number;
    communitiesCount: number;
    favoritesCount: number;
    councilSessionsCount?: number;
  }
  const [activity, setActivity] = useState<ActivityStats | null>(null);

  interface MissionData {
    id: number;
    title: string;
    description: string;
    type: "daily" | "weekly";
    currentProgress: number;
    targetProgress: number;
    completed: boolean;
    rewardClaimed: boolean;
    xpReward: number;
  }
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [claimingMissionId, setClaimingMissionId] = useState<number | null>(null);

  const reloadMissions = useCallback(async () => {
    const res = await api.get<{ missions: MissionData[] }>("/api/gamification/missions");
    if (res.success && res.data) setMissions(res.data.missions);
  }, []);

  useEffect(() => {
    api
      .get<{ stats: ActivityStats }>("/api/users/me/activity-stats")
      .then((res) => {
        if (res.success && res.data) setActivity(res.data.stats);
      });
    void reloadMissions();
  }, [reloadMissions]);

  const handleSelectLanguage = useCallback(
    async (lang: "pt-BR" | "en") => {
      const res = await updatePreferences({ language: lang });
      if (res.success) {
        toast.success(`Idioma definido: ${LANGUAGE_LABELS[lang] || lang}`);
      } else {
        toast.error(res.error || "Erro ao salvar idioma");
      }
    },
    [updatePreferences],
  );

  const handleAvatarPick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem muito grande (máx. 2 MB).");
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setPendingAvatarPreview(previewUrl);
      setUploadingAvatar(true);
      const res = await uploadAvatar(file);
      setUploadingAvatar(false);
      // Libera o objectURL e limpa o preview — em sucesso o user
      // recém-hidratado já traz avatar_url novo; em falha, volta para
      // o avatar antigo do servidor.
      URL.revokeObjectURL(previewUrl);
      setPendingAvatarPreview(null);
      if (res.success) toast.success("Foto de perfil atualizada!");
      else toast.error(res.error || "Erro ao enviar foto");
    },
    [uploadAvatar],
  );

  // Task #45 — alterna o tema localmente (ThemeProvider) e persiste no
  // perfil para que outros dispositivos do mesmo usuário hidratem o
  // valor no boot.
  const handleToggleTheme = useCallback(async () => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const res = await updatePreferences({ theme: next });
    if (!res.success) {
      // Reverte UI se a persistência falhar para manter coerência.
      setTheme(theme);
      toast.error(res.error || "Erro ao salvar tema");
    }
  }, [theme, setTheme, updatePreferences]);

  const handleToggleNotifications = useCallback(
    async (checked: boolean) => {
      const res = await updatePreferences({ notifications: { push: checked } });
      if (res.success) {
        toast.success(checked ? "Notificações ativadas" : "Notificações desativadas");
      } else {
        toast.error(res.error || "Erro ao salvar preferência");
      }
    },
    [updatePreferences],
  );

  const handleShareProfile = useCallback(async () => {
    if (!user) return;
    // Task #45 — formato `${APP_URL}/u/<id>`. Quando aberto, App.tsx
    // detecta `/u/:id`, troca pra aba Perfil e dispara o deep-link via
    // sessionStorage `raio-pending-profile` (mesmo contrato da busca).
    const baseUrl =
      (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ||
      window.location.origin;
    const url = `${baseUrl}/u/${user.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }, [user]);

  // Task #45 — destinos de suporte vêm de env (Vite). Se nada estiver
  // configurado, o item somem em vez de virar "Em breve".
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || "";
  const supportWhatsappUrl = (import.meta.env.VITE_SUPPORT_WHATSAPP_URL as string | undefined) || "";
  const supportItem: { icon: any; label: string; onClick: () => void } | null =
    supportEmail
      ? {
          icon: MessageSquare,
          label: "Falar com Suporte",
          onClick: () => {
            window.location.href = `mailto:${supportEmail}?subject=Suporte%20RAIO`;
          },
        }
      : supportWhatsappUrl
      ? {
          icon: MessageSquare,
          label: "Falar com Suporte (WhatsApp)",
          onClick: () => {
            window.open(supportWhatsappUrl, "_blank", "noopener,noreferrer");
          },
        }
      : null;

  const handleClaimMission = useCallback(
    async (missionId: number) => {
      setClaimingMissionId(missionId);
      const res = await api.post<{ success: boolean; xpAwarded: number }>(
        `/api/gamification/missions/${missionId}/claim`,
      );
      setClaimingMissionId(null);
      if (res.success && res.data) {
        toast.success(`+${res.data.xpAwarded} XP!`);
        await reloadMissions();
      } else {
        toast.error(res.error?.message || "Recompensa indisponível");
      }
    },
    [reloadMissions],
  );

  interface GamificationProfile {
    xp: number;
    level: number;
    levelTitle: string;
    streak: number;
    longestStreak: number;
    xpForNextLevel: number;
    xpInCurrentLevel: number;
    xpNeededForNext: number;
    progressPercentage: number;
    totalBadges: number;
  }

  interface BadgeData {
    id: number;
    name: string;
    title: string;
    description: string;
    icon: string;
    tier: string;
    earned: boolean;
    earnedAt: string | null;
  }

  const [gamProfile, setGamProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  // Task #92 — Suas comunidades + Seguindo no perfil próprio.
  const [myCommunities, setMyCommunities] = useState<Array<{ id: number; name: string; slug: string; icon?: string | null; member_count: number }>>([]);
  const [myFollows, setMyFollows] = useState<{ followers_count: number; following_count: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const [c, f] = await Promise.all([
        api.get<{ forums: typeof myCommunities }>(`/api/community/forums/me`),
        api.get<{ followers_count: number; following_count: number }>(`/api/users/${user.id}/follows`),
      ]);
      if (cancelled) return;
      if (c.success && c.data) setMyCommunities(c.data.forums);
      if (f.success && f.data) setMyFollows({
        followers_count: f.data.followers_count,
        following_count: f.data.following_count,
      });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  // Task #44 — deep-link de busca de pessoas: quando o usuário clica
  // num resultado kind="user", buscamos o perfil público mínimo via
  // /api/users/:id/public e renderizamos no topo (overlay simples
  // dentro da própria PerfilPage). Não há rota dedicada de perfil
  // alheio ainda, então o overlay é o destino "real" — pode ser
  // promovido a uma página própria sem mudar o contrato do helper.
  interface PublicProfile {
    id: number;
    name: string;
    segments: string[];
    level: number;
    xp: number;
    streak: number;
    totalBadges: number;
    joinedAt: string;
  }
  const [otherProfile, setOtherProfile] = useState<PublicProfile | null>(null);
  const [otherProfileLoading, setOtherProfileLoading] = useState(false);
  const [otherProfileError, setOtherProfileError] = useState<string | null>(
    null,
  );

  const loadOtherProfile = useCallback(async (id: number) => {
    setOtherProfile(null);
    setOtherProfileError(null);
    setOtherProfileLoading(true);
    const res = await api.get<{ user: PublicProfile }>(
      `/api/users/${id}/public`,
    );
    if (res.success && res.data) {
      setOtherProfile(res.data.user);
    } else {
      setOtherProfileError(
        res.error?.message || "Não foi possível carregar este perfil.",
      );
    }
    setOtherProfileLoading(false);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: number }>).detail;
      if (detail?.id) void loadOtherProfile(detail.id);
    };
    window.addEventListener("raio:open-profile", handler as EventListener);
    try {
      const pending = sessionStorage.getItem("raio-pending-profile");
      if (pending) {
        sessionStorage.removeItem("raio-pending-profile");
        void loadOtherProfile(Number(pending));
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener(
        "raio:open-profile",
        handler as EventListener,
      );
    };
  }, [loadOtherProfile]);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api.get<{ profile: GamificationProfile }>("/api/gamification/profile").then((res) => {
      if (res.success && res.data) setGamProfile(res.data.profile);
    });
    api.get<{ badges: BadgeData[] }>("/api/gamification/badges").then((res) => {
      if (res.success && res.data) setBadges(res.data.badges);
    });
  }, []);

  const currentLevel = gamProfile?.level ?? userData.level ?? 1;
  const currentXP = gamProfile?.xp ?? userData.points ?? 0;
  const currentStreak = gamProfile?.streak ?? userData.streak ?? 0;
  const earnedBadges = badges.filter((b) => b.earned);
  
  // Calcular total de itens na biblioteca
  const enrolledBooks = books.filter(book => book.isEnrolled);
  const totalLibraryItems = (userData.enrolledCourses?.length || 0) + enrolledBooks.length;
  
  // Se está mostrando favoritos, renderiza a página de favoritos
  if (showFavoritos) {
    return <FavoritosPage onBack={() => setShowFavoritos(false)} />;
  }
  
  // Se está mostrando biblioteca, renderiza a página de biblioteca
  if (showBiblioteca) {
    return <BibliotecaWithBookReader onBack={() => setShowBiblioteca(false)} />;
  }

  const stats = [
    { 
      icon: Trophy, 
      label: "Nível", 
      value: `${currentLevel} - ${gamProfile?.levelTitle || "Iniciante"}`,
      colorVar: "var(--rayo-terra-500)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: `${currentXP} XP total`
    },
    { 
      icon: Zap, 
      label: "XP", 
      value: currentXP,
      colorVar: "var(--rayo-terra-500)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: gamProfile ? `${gamProfile.xpForNextLevel - currentXP} para próximo nível` : ""
    },
    { 
      icon: Target, 
      label: "Sequência", 
      value: `${currentStreak} dias`,
      colorVar: "var(--rayo-terra-500)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: `Recorde: ${gamProfile?.longestStreak || currentStreak} dias`
    },
    { 
      icon: Award, 
      label: "Conquistas", 
      value: earnedBadges.length,
      colorVar: "var(--rayo-terra-500)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: `${badges.length} disponíveis`
    },
  ];

  // Task #45 — contrato: { libraryCount, communitiesCount,
  // favoritesCount, councilSessionsCount? }. Favoritos do servidor +
  // favoritos locais de vídeo. councilSessionsCount só aparece se o
  // backend devolver (tabela existe).
  const totalFavorites = (activity?.favoritesCount ?? 0) + favoriteVideos.length;
  const activityStats: Array<{
    icon: any;
    label: string;
    value: number;
    onClick?: () => void;
  }> = [
    {
      icon: BookOpen,
      label: "Biblioteca",
      value: activity?.libraryCount ?? totalLibraryItems,
      onClick: () => setShowBiblioteca(true),
    },
    {
      icon: Users,
      label: "Comunidades",
      value: activity?.communitiesCount ?? 0,
    },
    {
      icon: Heart,
      label: "Favoritos",
      value: totalFavorites,
      onClick: () => setShowFavoritos(true),
    },
    ...(activity?.councilSessionsCount !== undefined
      ? [{
          icon: MessageSquare,
          label: "Sessões Conselheiro",
          value: activity.councilSessionsCount,
        }]
      : []),
  ];

  // Task #45 — toda ação aqui é real (editar, alternar tema, idioma
  // persistido, suporte env-driven, troca de senha). "Em breve!" foi
  // banido. Itens sem destino configurado simplesmente somem.
  const menuSections = [
    {
      title: "Conta",
      items: [
        { icon: User, label: "Editar Perfil", onClick: () => setShowEditProfile(true) },
        { icon: Share2, label: "Compartilhar perfil", onClick: handleShareProfile },
        { icon: Bell, label: "Notificações", hasSwitch: true },
        ...(canAccessAdmin && onNavigate
          ? [{ icon: ShieldAlert, label: "Painel Admin", onClick: () => onNavigate("admin") }]
          : []),
      ]
    },
    {
      title: "Preferências",
      items: [
        { icon: theme === 'dark' ? Moon : Sun, label: "Modo Escuro", hasSwitch: true, switchValue: theme === 'dark', onSwitchChange: handleToggleTheme },
        {
          icon: Globe,
          label: "Idioma",
          value: LANGUAGE_LABELS[language] || "Português",
          onClick: () => setShowLanguage(true),
        },
      ]
    },
    {
      title: "Suporte",
      items: [
        ...(supportItem ? [supportItem] : []),
        { icon: Shield, label: "Trocar senha", onClick: () => setShowChangePassword(true) },
      ]
    }
  ];

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const res = await api.post<{ message: string; export: Record<string, unknown> }>("/api/lgpd/data-export");
      if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data.export, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `raio-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Seus dados foram exportados com sucesso!");
      } else {
        toast.error(res.error?.message || "Erro ao exportar dados");
      }
    } catch {
      toast.error("Erro ao exportar dados. Tente novamente.");
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await api.post("/api/lgpd/data-deletion");
      if (res.success) {
        toast.success("Sua conta foi removida conforme a LGPD.");
        await logout();
      } else {
        toast.error(res.error?.message || "Erro ao excluir conta");
      }
    } catch {
      toast.error("Erro ao excluir conta. Tente novamente.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const progressPercentage = gamProfile?.progressPercentage ?? 0;
  const xpInCurrentLevel = gamProfile?.xpInCurrentLevel ?? 0;
  const xpNeededForNext = gamProfile?.xpNeededForNext ?? 100;

  return (
    <div
      className="ra-page min-h-screen pb-24 lg:pb-8"
      style={{ background: 'var(--rayo-sand-100)' }}
    >
      {(otherProfile || otherProfileLoading || otherProfileError) && (
        <div className="mx-auto max-w-md lg:max-w-7xl px-4 lg:px-8 pt-3">
          {/* Task #92 — overlay agora usa UserProfilePage com tabs Reddit-style. */}
          {otherProfileLoading && (
            <div
              className="rounded-xl p-4 mb-3"
              style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
            >
              <p className="text-sm text-muted-foreground">Carregando perfil…</p>
            </div>
          )}
          {otherProfileError && !otherProfileLoading && (
            <div
              className="rounded-xl p-4 mb-3 flex items-start justify-between gap-3"
              style={{ background: "var(--rayo-sand-50)", border: "1px solid var(--rayo-sand-300)" }}
            >
              <p className="text-sm text-destructive">{otherProfileError}</p>
              <button
                type="button"
                onClick={() => setOtherProfileError(null)}
                className="text-xs underline text-muted-foreground"
              >
                fechar
              </button>
            </div>
          )}
          {otherProfile && (
            <div className="mb-3">
              <UserProfilePage
                userId={otherProfile.id}
                onClose={() => {
                  setOtherProfile(null);
                  setOtherProfileError(null);
                }}
                onNavigateToCommunity={() => onNavigate?.("comunidade")}
              />
            </div>
          )}
        </div>
      )}
      {/* Desktop Layout */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          
          {/* Coluna Principal - Desktop (8 colunas) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header com Avatar e Info */}
            <div 
              className="relative lg:rounded-2xl overflow-hidden"
              style={{ 
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, var(--rayo-terra-700) 0%, var(--rayo-terra-500) 100%)'
                  : 'linear-gradient(135deg, var(--rayo-terra-500) 0%, var(--rayo-terra-700) 100%)'
              }}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJoLTJ2LTJ6bTAtNHYyaC0ydi0yaDF2LTFoMXptMC00djJoLTJ2LTJoMnptLTQgMHYyaC0ydi0yaDJ6bS00IDB2MmgtMnYtMmgyem0tNCAwdjJoLTJ2LTJoMnptLTQgMHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bTQtOHYyaC0ydi0yaDJ6bTAtNHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
              
              <div className="relative pt-12 pb-20 lg:pb-16 px-6">
                {/* Mobile/Desktop Layout */}
                <div className="lg:flex lg:items-start lg:gap-6 max-w-md lg:max-w-none mx-auto">
                  {/* Avatar com botão de câmera para upload */}
                  <div className="text-center lg:text-left lg:flex-shrink-0">
                    <div className="relative inline-block mx-auto lg:mx-0 mb-4 lg:mb-0">
                      <Avatar
                        className="w-24 h-24 lg:w-32 lg:h-32 ring-4 shadow-xl"
                        style={{ ringColor: 'var(--rayo-sand-100)' }}
                      >
                        {(pendingAvatarPreview || user?.avatar_url) && (
                          <AvatarImage
                            src={pendingAvatarPreview || user!.avatar_url!}
                            alt={user?.name || "Avatar"}
                          />
                        )}
                        <AvatarFallback
                          className="text-2xl lg:text-4xl"
                          style={{
                            background: 'var(--rayo-sand-100)',
                            color: 'var(--rayo-terra-500)'
                          }}
                        >
                          {(user?.name || userData.name)?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={handleAvatarPick}
                        disabled={uploadingAvatar}
                        aria-label="Alterar foto de perfil"
                        className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-60"
                        style={{
                          background: 'var(--rayo-terra-500)',
                          color: '#fff',
                          border: '2px solid var(--rayo-sand-100)',
                        }}
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarFile}
                      />
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="text-center lg:text-left lg:flex-1">
                    <h1 className="text-white text-2xl lg:text-3xl mb-1" style={{ fontWeight: 700 }}>
                      {userData.name || 'Usuário'}
                    </h1>
                    
                    <p className="text-white/80 text-sm lg:text-base mb-4">
                      {userData.segments?.[0] === 'solteiro' ? '💚 Solteiro' :
                       userData.segments?.[0] === 'namoro' ? '💕 Namoro' :
                       userData.segments?.[0] === 'noivos' ? '💍 Noivos' :
                       userData.segments?.[0] === 'casados' ? '👰‍♀️ Casados' :
                       userData.segments?.[0] === 'pais' ? '👶 Pais' : '💚 Membro RAYO'}
                    </p>

                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-4 lg:mb-6">
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                        Nível {currentLevel}
                      </Badge>
                    </div>

                    {/* Task #45 — bio editável (renderiza só se preenchida) */}
                    {user?.bio && (
                      <p
                        className="text-white/85 text-sm lg:text-base mb-4 lg:mb-6 mx-auto lg:mx-0 max-w-md"
                        style={{ lineHeight: 1.5 }}
                      >
                        {user.bio}
                      </p>
                    )}

                    {/* Progress Bar - Desktop Only */}
                    <div className="hidden lg:block bg-white/10 backdrop-blur-sm rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/90 text-sm" style={{ fontWeight: 600 }}>
                          Progresso para Nível {currentLevel + 1}
                        </span>
                        <span className="text-white/90 text-sm" style={{ fontWeight: 600 }}>
                          {xpInCurrentLevel}/{xpNeededForNext} XP
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2 bg-white/20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 -mt-12 lg:-mt-8 mb-6 lg:mb-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card 
                      key={index} 
                      className="ra-card ra-card-hover p-4 lg:p-5 shadow-lg border-0 desktop-card-hover"
                      style={{ background: 'var(--rayo-sand-50)' }}
                    >
                      <div className="flex flex-col lg:gap-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: stat.bgVar }}
                          >
                            <Icon 
                              className="w-5 h-5 lg:w-6 lg:h-6" 
                              style={{ color: stat.colorVar }}
                            />
                          </div>
                          <div className="lg:hidden">
                            <p 
                              className="text-xs" 
                              style={{ color: 'var(--rayo-ink-700)' }}
                            >
                              {stat.label}
                            </p>
                            <p 
                              className="text-lg" 
                              style={{ 
                                fontWeight: 700,
                                color: 'var(--rayo-forest-900)'
                              }}
                            >
                              {stat.value}
                            </p>
                          </div>
                        </div>
                        <div className="hidden lg:block">
                          <p 
                            className="text-sm mb-1" 
                            style={{ color: 'var(--rayo-ink-700)' }}
                          >
                            {stat.label}
                          </p>
                          <p 
                            className="text-2xl mb-1" 
                            style={{ 
                              fontWeight: 700,
                              color: 'var(--rayo-forest-900)'
                            }}
                          >
                            {stat.value}
                          </p>
                          <p 
                            className="text-xs" 
                            style={{ color: 'var(--rayo-ink-400)' }}
                          >
                            {stat.trend}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Earned Badges */}
            {earnedBadges.length > 0 && (
              <div className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 mb-6 lg:mb-8">
                <Card
                  className="p-4 lg:p-6 border-0 shadow-md"
                  style={{ background: 'var(--rayo-sand-50)' }}
                >
                  <h3
                    className="text-lg mb-4"
                    style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}
                  >
                    Conquistas Obtidas
                  </h3>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {earnedBadges.map((badge) => {
                      const tierColors: Record<string, string> = {
                        bronze: 'var(--rayo-terra-500)',
                        silver: '#94a3b8',
                        gold: '#eab308',
                        platinum: '#8b5cf6',
                        premium: '#06b6d4',
                      };
                      return (
                        <div
                          key={badge.id}
                          className="flex flex-col items-center text-center gap-1"
                          title={badge.description}
                        >
                          <div
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center text-xl lg:text-2xl"
                            style={{
                              background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              border: `2px solid ${tierColors[badge.tier] || tierColors.bronze}`,
                            }}
                          >
                            {badge.icon}
                          </div>
                          <span
                            className="text-[10px] lg:text-xs leading-tight"
                            style={{ color: 'var(--rayo-ink-700)', fontWeight: 500 }}
                          >
                            {badge.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Task #92 — Suas comunidades + Seguindo (perfil próprio Reddit-style) */}
            <div className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 mb-6 lg:mb-8">
              <Card
                className="p-4 lg:p-6 border-0 shadow-md"
                style={{ background: 'var(--rayo-sand-50)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg" style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}>
                    Suas comunidades
                  </h3>
                  {myFollows && (
                    <span className="text-xs" style={{ color: 'var(--rayo-ink-400)' }}>
                      Seguindo: <strong>{myFollows.following_count}</strong> · Seguidores:{" "}
                      <strong>{myFollows.followers_count}</strong>
                    </span>
                  )}
                </div>
                {myCommunities.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--rayo-ink-400)' }}>
                    Você ainda não entrou em nenhuma comunidade. Explore na aba Comunidade.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {myCommunities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          try {
                            sessionStorage.setItem("rayo-pending-community-slug", c.slug);
                          } catch { /* noop */ }
                          window.dispatchEvent(new CustomEvent("rayo:open-community", { detail: { slug: c.slug } }));
                          onNavigate?.("comunidade");
                        }}
                        className="rounded-lg p-3 text-left flex items-center gap-2 hover:bg-[var(--rayo-sand-200)] transition-colors"
                        style={{ background: 'var(--rayo-sand-100)', border: '1px solid var(--rayo-sand-300)' }}
                      >
                        <div className="text-xl">{c.icon || "💬"}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--rayo-forest-900)' }}>
                            c/{c.slug}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.member_count} {c.member_count === 1 ? "membro" : "membros"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Task #45 — Missões da semana (consome /api/gamification/missions) */}
            <div className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 mb-6 lg:mb-8">
              <Card
                className="p-4 lg:p-6 border-0 shadow-md"
                style={{ background: 'var(--rayo-sand-50)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className="text-lg"
                    style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}
                  >
                    Missões da semana
                  </h3>
                  {missions.length > 0 && (
                    <span className="text-xs" style={{ color: 'var(--rayo-ink-400)' }}>
                      {missions.filter((m) => m.completed).length}/{missions.length} concluídas
                    </span>
                  )}
                </div>
                {missions.length === 0 ? (
                  <div
                    className="text-center py-6 rounded-lg"
                    style={{
                      background: 'var(--rayo-sand-300)',
                      border: '1px dashed var(--rayo-sand-300)',
                    }}
                  >
                    <Target
                      className="w-8 h-8 mx-auto mb-2"
                      style={{ color: 'var(--rayo-ink-400)' }}
                    />
                    <p
                      className="text-sm mb-1"
                      style={{ color: 'var(--rayo-forest-900)', fontWeight: 600 }}
                    >
                      Nenhuma missão por aqui ainda
                    </p>
                    <p className="text-xs" style={{ color: 'var(--rayo-ink-400)' }}>
                      Volte em breve — novas missões aparecem toda semana.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {missions.map((mission) => {
                      const pct = Math.min(
                        100,
                        Math.round((mission.currentProgress / Math.max(mission.targetProgress, 1)) * 100),
                      );
                      const canClaim = mission.completed && !mission.rewardClaimed;
                      return (
                        <div
                          key={mission.id}
                          className="p-3 lg:p-4 rounded-lg"
                          style={{
                            background: 'var(--rayo-sand-300)',
                            border: '1px solid var(--rayo-sand-300)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {mission.rewardClaimed && (
                                  <CheckCircle2
                                    className="w-4 h-4 flex-shrink-0"
                                    style={{ color: 'var(--rayo-terra-500)' }}
                                  />
                                )}
                                <p
                                  className="text-sm"
                                  style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}
                                >
                                  {mission.title}
                                </p>
                              </div>
                              <p className="text-xs" style={{ color: 'var(--rayo-ink-700)' }}>
                                {mission.description}
                              </p>
                            </div>
                            <Badge
                              className="flex-shrink-0"
                              style={{
                                background: 'var(--rayo-sand-50)',
                                color: 'var(--rayo-terra-500)',
                                border: '1px solid var(--rayo-sand-300)',
                              }}
                            >
                              +{mission.xpReward} XP
                            </Badge>
                          </div>
                          <Progress value={pct} className="h-1.5 mb-2" />
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className="text-xs"
                              style={{ color: 'var(--rayo-ink-400)' }}
                            >
                              {mission.currentProgress}/{mission.targetProgress}
                            </span>
                            {canClaim ? (
                              <Button
                                size="sm"
                                onClick={() => handleClaimMission(mission.id)}
                                disabled={claimingMissionId === mission.id}
                              >
                                {claimingMissionId === mission.id ? "Resgatando..." : "Resgatar"}
                              </Button>
                            ) : mission.rewardClaimed ? (
                              <span
                                className="text-xs"
                                style={{ color: 'var(--rayo-ink-400)' }}
                              >
                                Resgatada
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* All Badges (Locked & Unlocked) */}
            {badges.length > 0 && (
              <div className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 mb-6 lg:mb-8">
                <Card
                  className="p-4 lg:p-6 border-0 shadow-md"
                  style={{ background: 'var(--rayo-sand-50)' }}
                >
                  <h3
                    className="text-lg mb-4"
                    style={{ fontWeight: 600, color: 'var(--rayo-forest-900)' }}
                  >
                    Todas as Conquistas
                  </h3>
                  <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
                    {badges.map((badge) => {
                      const tierColors: Record<string, string> = {
                        bronze: 'var(--rayo-terra-500)',
                        silver: '#94a3b8',
                        gold: '#eab308',
                        platinum: '#8b5cf6',
                        premium: '#06b6d4',
                      };
                      return (
                        <div
                          key={badge.id}
                          className="flex flex-col items-center text-center gap-1"
                          title={badge.description}
                          style={{ opacity: badge.earned ? 1 : 0.35 }}
                        >
                          <div
                            className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-lg lg:text-xl"
                            style={{
                              background: badge.earned
                                ? (theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                                : (theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                              border: `2px solid ${badge.earned ? (tierColors[badge.tier] || tierColors.bronze) : 'var(--rayo-sand-300)'}`,
                            }}
                          >
                            {badge.icon}
                          </div>
                          <span
                            className="text-[10px] leading-tight"
                            style={{ color: 'var(--rayo-ink-400)', fontWeight: 500 }}
                          >
                            {badge.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Activity Stats - Desktop Only */}
            <div className="hidden lg:block px-0 mb-8">
              <Card 
                className="ra-card p-6 border-0 shadow-md"
                style={{ background: 'var(--rayo-sand-50)' }}
              >
                <h3 
                  className="text-lg mb-4" 
                  style={{ 
                    fontWeight: 600,
                    color: 'var(--rayo-forest-900)'
                  }}
                >
                  Atividade Recente
                </h3>
                <div className="grid grid-cols-4 gap-6">
                  {activityStats.map((item, index) => {
                    const Icon = item.icon;
                    const Wrapper = item.onClick ? 'button' : 'div';
                    return (
                      <Wrapper 
                        key={index} 
                        className={`text-center ${item.onClick ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                        onClick={item.onClick}
                      >
                        <Icon 
                          className="w-8 h-8 mx-auto mb-2" 
                          style={{ color: 'var(--rayo-terra-500)' }}
                        />
                        <p 
                          className="text-2xl mb-1" 
                          style={{ 
                            fontWeight: 700,
                            color: 'var(--rayo-forest-900)'
                          }}
                        >
                          {item.value}
                        </p>
                        <p 
                          className="text-xs" 
                          style={{ color: 'var(--rayo-ink-700)' }}
                        >
                          {item.label}
                        </p>
                      </Wrapper>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Menu Sections - Mobile Only */}
            <div className="lg:hidden max-w-md mx-auto px-6 space-y-6">
              {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h3 
                    className="text-sm mb-3 px-2" 
                    style={{ 
                      fontWeight: 600,
                      color: 'var(--rayo-ink-700)'
                    }}
                  >
                    {section.title}
                  </h3>
                  <Card 
                    className="border-0 shadow-md overflow-hidden"
                    style={{ background: 'var(--rayo-sand-50)' }}
                  >
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      const hasSwitch = item.hasSwitch;
                      
                      const WrapperElement = hasSwitch ? 'div' : 'button';
                      
                      return (
                        <div key={itemIndex}>
                          <WrapperElement
                            onClick={!hasSwitch ? item.onClick : undefined}
                            className={`w-full flex items-center justify-between p-4 transition-colors ${
                              !hasSwitch ? 'cursor-pointer' : ''
                            }`}
                            style={{
                              ...(!hasSwitch && {
                                ':hover': { background: 'var(--rayo-sand-300)' }
                              })
                            }}
                            onMouseEnter={(e) => {
                              if (!hasSwitch) {
                                e.currentTarget.style.background = 'var(--rayo-sand-300)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!hasSwitch) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: 'var(--rayo-sand-300)' }}
                              >
                                <Icon 
                                  className="w-5 h-5" 
                                  style={{ color: 'var(--rayo-ink-700)' }}
                                />
                              </div>
                              <span 
                                style={{ 
                                  fontWeight: 500,
                                  color: 'var(--rayo-forest-900)'
                                }}
                              >
                                {item.label}
                              </span>
                            </div>
                            
                            {item.hasSwitch ? (
                              <Switch 
                                checked={item.switchValue ?? (item.label === "Notificações" ? notificationsEnabled : false)}
                                onCheckedChange={(checked) => {
                                  if (item.onSwitchChange) {
                                    item.onSwitchChange();
                                  } else if (item.label === "Notificações") {
                                    void handleToggleNotifications(checked);
                                  }
                                }}
                              />
                            ) : item.value ? (
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-sm" 
                                  style={{ color: 'var(--rayo-ink-700)' }}
                                >
                                  {item.value}
                                </span>
                                <ChevronRight 
                                  className="w-4 h-4" 
                                  style={{ color: 'var(--rayo-ink-400)' }}
                                />
                              </div>
                            ) : (
                              <ChevronRight 
                                className="w-4 h-4" 
                                style={{ color: 'var(--rayo-ink-400)' }}
                              />
                            )}
                          </WrapperElement>
                          {itemIndex < section.items.length - 1 && (
                            <div 
                              className="border-b mx-4" 
                              style={{ borderColor: 'var(--rayo-sand-300)' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))}

              {/* LGPD - Privacidade e Dados */}
              <div>
                <h3
                  className="text-sm mb-3 px-2"
                  style={{ fontWeight: 600, color: 'var(--rayo-ink-700)' }}
                >
                  Privacidade e Dados (LGPD)
                </h3>
                <Card
                  className="border-0 shadow-md overflow-hidden"
                  style={{ background: 'var(--rayo-sand-50)' }}
                >
                  <button
                    onClick={handleExportData}
                    disabled={exportingData}
                    className="w-full flex items-center justify-between p-4 transition-colors cursor-pointer"
                    style={{ background: 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--rayo-sand-300)' }}>
                        <Download className="w-5 h-5" style={{ color: 'var(--rayo-ink-700)' }} />
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--rayo-forest-900)' }}>
                        {exportingData ? "Exportando..." : "Exportar meus dados"}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--rayo-ink-400)' }} />
                  </button>
                  <div className="border-b mx-4" style={{ borderColor: 'var(--rayo-sand-300)' }} />
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-between p-4 transition-colors cursor-pointer"
                    style={{ background: 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: theme === 'dark' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(254, 242, 242, 1)' }}>
                        <Trash2 className="w-5 h-5" style={{ color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)' }} />
                      </div>
                      <span style={{ fontWeight: 500, color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)' }}>
                        Excluir minha conta
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--rayo-ink-400)' }} />
                  </button>
                </Card>
              </div>

              {/* Logout Button - Mobile */}
              <Button
                variant="outline"
                className="w-full py-6 transition-all"
                style={{
                  borderColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(254, 202, 202, 1)',
                  color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme === 'dark' ? 'rgba(127, 29, 29, 0.3)' : 'rgba(254, 242, 242, 1)';
                  e.currentTarget.style.color = theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(185, 28, 28, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)';
                }}
                onClick={async () => {
                  toast.error("Saindo...");
                  await logout();
                }}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sair da Conta
              </Button>

              {/* Footer Info - Mobile */}
              <div className="text-center py-6 space-y-1">
                <p 
                  className="text-xs" 
                  style={{ color: 'var(--rayo-ink-400)' }}
                >
                  RAYO Ecossistema v1.0.0
                </p>
                <p 
                  className="text-xs" 
                  style={{ color: 'var(--rayo-ink-400)' }}
                >
                  © 2025 RAYO. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar - Desktop Only (4 colunas) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Menu Sections */}
            {menuSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 
                  className="text-sm mb-3 px-2" 
                  style={{ 
                    fontWeight: 600,
                    color: 'var(--rayo-ink-700)'
                  }}
                >
                  {section.title}
                </h3>
                <Card 
                  className="border-0 shadow-md overflow-hidden"
                  style={{ background: 'var(--rayo-sand-50)' }}
                >
                  {section.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const hasSwitch = item.hasSwitch;
                    
                    const WrapperElement = hasSwitch ? 'div' : 'button';
                    
                    return (
                      <div key={itemIndex}>
                        <WrapperElement
                          onClick={!hasSwitch ? item.onClick : undefined}
                          className={`w-full flex items-center justify-between p-4 transition-colors ${
                            !hasSwitch ? 'cursor-pointer' : ''
                          }`}
                          style={{
                            background: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!hasSwitch) {
                              e.currentTarget.style.background = 'var(--rayo-sand-300)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!hasSwitch) {
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: 'var(--rayo-sand-300)' }}
                            >
                              <Icon 
                                className="w-5 h-5" 
                                style={{ color: 'var(--rayo-ink-700)' }}
                              />
                            </div>
                            <span 
                              style={{ 
                                fontWeight: 500,
                                color: 'var(--rayo-forest-900)'
                              }}
                            >
                              {item.label}
                            </span>
                          </div>
                          
                          {item.hasSwitch ? (
                            <Switch 
                              checked={item.switchValue ?? (item.label === "Notificações" ? notificationsEnabled : false)}
                              onCheckedChange={(checked) => {
                                if (item.onSwitchChange) {
                                  item.onSwitchChange();
                                } else if (item.label === "Notificações") {
                                  void handleToggleNotifications(checked);
                                }
                              }}
                            />
                          ) : item.value ? (
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-sm" 
                                style={{ color: 'var(--rayo-ink-700)' }}
                              >
                                {item.value}
                              </span>
                              <ChevronRight 
                                className="w-4 h-4" 
                                style={{ color: 'var(--rayo-ink-400)' }}
                              />
                            </div>
                          ) : (
                            <ChevronRight 
                              className="w-4 h-4" 
                              style={{ color: 'var(--rayo-ink-400)' }}
                            />
                          )}
                        </WrapperElement>
                        {itemIndex < section.items.length - 1 && (
                          <div 
                            className="border-b mx-4" 
                            style={{ borderColor: 'var(--rayo-sand-300)' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}

            {/* LGPD - Desktop */}
            <div>
              <h3
                className="text-sm mb-3 px-2"
                style={{ fontWeight: 600, color: 'var(--rayo-ink-700)' }}
              >
                Privacidade e Dados (LGPD)
              </h3>
              <Card
                className="border-0 shadow-md overflow-hidden"
                style={{ background: 'var(--rayo-sand-50)' }}
              >
                <button
                  onClick={handleExportData}
                  disabled={exportingData}
                  className="w-full flex items-center justify-between p-4 transition-colors cursor-pointer"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rayo-sand-300)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--rayo-sand-300)' }}>
                      <Download className="w-5 h-5" style={{ color: 'var(--rayo-ink-700)' }} />
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--rayo-forest-900)' }}>
                      {exportingData ? "Exportando..." : "Exportar meus dados"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--rayo-ink-400)' }} />
                </button>
                <div className="border-b mx-4" style={{ borderColor: 'var(--rayo-sand-300)' }} />
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-between p-4 transition-colors cursor-pointer"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rayo-sand-300)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: theme === 'dark' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(254, 242, 242, 1)' }}>
                      <Trash2 className="w-5 h-5" style={{ color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)' }} />
                    </div>
                    <span style={{ fontWeight: 500, color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)' }}>
                      Excluir minha conta
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'var(--rayo-ink-400)' }} />
                </button>
              </Card>
            </div>

            {/* Logout Button - Desktop */}
            <Button
              variant="outline"
              className="w-full py-6 transition-all"
              style={{
                borderColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(254, 202, 202, 1)',
                color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme === 'dark' ? 'rgba(127, 29, 29, 0.3)' : 'rgba(254, 242, 242, 1)';
                e.currentTarget.style.color = theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(185, 28, 28, 1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)';
              }}
              onClick={async () => {
                toast.error("Saindo...");
                await logout();
              }}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair da Conta
            </Button>

            {/* Footer Info - Desktop */}
            <div className="text-center py-4 space-y-1">
              <p 
                className="text-xs" 
                style={{ color: 'var(--rayo-ink-400)' }}
              >
                RAYO Ecossistema v1.0.0
              </p>
              <p 
                className="text-xs" 
                style={{ color: 'var(--rayo-ink-400)' }}
              >
                © 2025 RAYO. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <Card
            className="max-w-md w-full p-6 border-0 shadow-2xl"
            style={{ background: 'var(--rayo-sand-50)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: theme === 'dark' ? 'rgba(127, 29, 29, 0.2)' : 'rgba(254, 242, 242, 1)' }}
              >
                <Trash2 className="w-8 h-8" style={{ color: theme === 'dark' ? 'rgba(248, 113, 113, 1)' : 'rgba(220, 38, 38, 1)' }} />
              </div>
              <h3
                className="text-lg mb-2"
                style={{ fontWeight: 700, color: 'var(--rayo-forest-900)' }}
              >
                Excluir sua conta?
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--rayo-ink-700)' }}
              >
                Esta ação é irreversível. Todos os seus dados pessoais serão anonimizados conforme a LGPD.
                Seu progresso, conquistas e posts serão removidos permanentemente.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ borderColor: 'var(--rayo-sand-300)', color: 'var(--rayo-ink-700)' }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{
                  background: theme === 'dark' ? 'rgba(220, 38, 38, 0.8)' : 'rgba(220, 38, 38, 1)',
                  color: '#fff',
                }}
              >
                {deletingAccount ? "Excluindo..." : "Sim, excluir"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Task #45 — modais de edição/segurança/idioma */}
      <EditProfileModal open={showEditProfile} onOpenChange={setShowEditProfile} />
      <ChangePasswordModal open={showChangePassword} onOpenChange={setShowChangePassword} />
      <LanguageModal
        open={showLanguage}
        onOpenChange={setShowLanguage}
        current={language}
        onSelect={handleSelectLanguage}
      />
    </div>
  );
}
