import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  User, Bell,
  ChevronRight, LogOut, Moon, Sun, Globe,
  Shield, MessageSquare,
  Target, Share2, CheckCircle2,
  Download, Trash2,
  ShieldAlert
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Progress } from "./ui/progress";
import { useAuth, userHasRole } from "./AuthContext";
import { useTheme } from "./ThemeProvider";
import { toast } from "sonner@2.0.3";
import { api } from "../lib/api";
import { celebrateFromCompletion } from "../lib/celebrate";
import { EditProfileModal, ChangePasswordModal, LanguageModal } from "./perfil/PerfilModals";
import { MinhasAssinaturasCard } from "./perfil/MinhasAssinaturasCard";
import { UserProfilePage } from "./UserProfilePage";
import { onScrollTop } from "../lib/scrollTop";

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
  const { theme, setTheme } = useTheme();
  const { logout, user, updatePreferences } = useAuth();
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
  // Task #45 — modais e estados auxiliares.
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  // Task #93 — avatar upload, stats de atividade, gamificação local e
  // listagem de "Suas comunidades" foram embutidos em UserProfilePage.
  // PerfilPage agora cuida só dos controles de conta (missões,
  // configurações, LGPD, logout).

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
    // sessionStorage `rayo-pending-profile` (mesmo contrato da busca).
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
            window.location.href = `mailto:${supportEmail}?subject=Suporte%20RAYO`;
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
      const res = await api.post<{
        success: boolean;
        xpAwarded: number;
        leveledUp?: boolean;
        newLevel?: number;
      }>(
        `/api/gamification/missions/${missionId}/claim`,
      );
      setClaimingMissionId(null);
      if (res.success && res.data) {
        toast.success(`+${res.data.xpAwarded} XP!`);
        // ENGAGEMENT_PLAN.md E3 — level-up ao resgatar missão vira festa.
        celebrateFromCompletion(res.data);
        await reloadMissions();
      } else {
        toast.error(res.error?.message || "Recompensa indisponível");
      }
    },
    [reloadMissions],
  );

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

  // Task #178 — URL é fonte da verdade pra qual perfil mostrar.
  // - `/u/:id` (ou `/u/:id/posts|comentarios|salvos`) → overlay de
  //   perfil público.
  // - `/perfil` (ou `/perfil/posts|comentarios|salvos|assinaturas|
  //   configuracoes`) → área pessoal.
  // Refresh, back/forward e share de link funcionam sem stash em
  // sessionStorage. O CustomEvent legado `rayo:open-profile` continua
  // funcionando porque App.tsx mapeia o evento → `navigate(/u/:id)`.
  const location = useLocation();
  const navigate = useNavigate();

  // Task #178 — Sub-rotas precisam cobrir TODAS as tabs do
  // UserProfilePage (posts/comentarios/comunidades/conquistas/salvos/
  // sobre). Sem isso, clicar "Comunidades"/"Conquistas"/"Sobre"
  // empurraria URL não-reconhecida e o effect URL→state limparia o
  // overlay (regressão crítica detectada no review).
  // Self ainda aceita os slugs extras `assinaturas`/`configuracoes`
  // (seções abaixo das tabs, scroll-to-section).
  const PROFILE_TAB_SLUGS =
    "posts|comentarios|comunidades|conquistas|salvos|sobre";
  const otherProfileMatch = location.pathname.match(
    new RegExp(`^/u/(\\d+)(?:/(${PROFILE_TAB_SLUGS}))?/?$`),
  );
  const otherProfileId = otherProfileMatch
    ? Number(otherProfileMatch[1])
    : null;
  const otherProfileSub = otherProfileMatch
    ? (otherProfileMatch[2] ?? "posts")
    : null;

  const selfMatch = location.pathname.match(
    new RegExp(
      `^/perfil(?:/(${PROFILE_TAB_SLUGS}|assinaturas|configuracoes))?/?$`,
    ),
  );
  const selfSub = selfMatch ? (selfMatch[1] ?? "posts") : "posts";

  // Task #178 — Normaliza `/u/:id/salvos`: a tab "Salvos" só existe
  // pro próprio usuário (UserProfilePage esconde pra não-self), então
  // a URL não levaria a nada visível. Replace pra `/u/:id/posts`
  // mantém o histórico limpo (sem entrada extra no back).
  useEffect(() => {
    if (otherProfileId !== null && otherProfileSub === "salvos") {
      navigate(`/u/${otherProfileId}/posts`, { replace: true });
    }
  }, [otherProfileId, otherProfileSub, navigate]);

  // Task #178 — Carrega/limpa o perfil público quando a URL muda.
  // Substitui o antigo listener `rayo:open-profile` + sessionStorage
  // (App.tsx mapeia o evento pra navigate, então a mudança de URL
  // dispara este effect).
  useEffect(() => {
    if (otherProfileId) {
      void loadOtherProfile(otherProfileId);
    } else {
      setOtherProfile(null);
      setOtherProfileError(null);
    }
  }, [otherProfileId, loadOtherProfile]);

  // Task #115/#178 — re-tap na aba Perfil enquanto está em /u/:id
  // navega de volta pra /perfil (área pessoal). Scroll global continua
  // acontecendo pelo listener em App.tsx.
  useEffect(() => {
    return onScrollTop(() => {
      if (otherProfileId !== null) {
        navigate("/perfil");
      }
    }, "perfil");
  }, [otherProfileId, navigate]);

  // Task #178 — Sub-rotas `/perfil/assinaturas` e `/perfil/configuracoes`
  // não são tabs do UserProfilePage embutido — são seções abaixo na
  // própria PerfilPage. Quando a URL aterrissa nessas sub-rotas, rolamos
  // suavemente até a seção. setTimeout cobre o caso onde o componente
  // ainda está hidratando o layout (assinaturas só aparece em mobile).
  useEffect(() => {
    if (selfSub !== "assinaturas" && selfSub !== "configuracoes") return;
    const id =
      selfSub === "assinaturas" ? "perfil-assinaturas" : "perfil-configuracoes";
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [selfSub]);
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        a.download = `rayo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
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
                onClose={() => navigate("/perfil")}
                onNavigateToCommunity={() => onNavigate?.("comunidade")}
                activeTab={otherProfileSub ?? "posts"}
                onTabChange={(slug) =>
                  navigate(`/u/${otherProfile.id}/${slug}`)
                }
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
            {/* Task #92 — Reddit-style header com tabs (Posts/Comentários/
                Comunidades/Conquistas/Sobre) também no perfil próprio.
                Mantém os blocos de Configurações/Missões/Avatar abaixo. */}
            {user?.id && (
              <div
                className="lg:rounded-2xl overflow-hidden"
                style={{ background: 'var(--rayo-sand-50)' }}
              >
                <UserProfilePage
                  userId={user.id}
                  onNavigateToCommunity={() => onNavigate?.("comunidade")}
                  activeTab={
                    selfSub === "assinaturas" || selfSub === "configuracoes"
                      ? "posts"
                      : selfSub
                  }
                  onTabChange={(slug) => navigate(`/perfil/${slug}`)}
                />
              </div>
            )}

            {/* Task #93 — "Sua área pessoal": separador visual explícito
                deixando claro que o que vem abaixo NÃO é repetição do
                perfil público acima — são CONTROLES da conta do dono
                (missões, configurações, privacidade, logout). Mantemos
                aqui em vez de mover pra dentro de uma tab pra preservar
                acessibilidade mobile (rolar pra baixo > navegar tabs). */}
            <div className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 mt-8 mb-2">
              <div
                className="flex items-center gap-2 text-xs uppercase tracking-wider"
                style={{ color: "var(--rayo-forest-700)", fontWeight: 600 }}
              >
                <span style={{ height: 1, flex: 1, background: "var(--rayo-sand-300)" }} />
                Sua área pessoal
                <span style={{ height: 1, flex: 1, background: "var(--rayo-sand-300)" }} />
              </div>
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

            {/* Task #93 — "Todas as Conquistas" e "Atividade Recente"
                viviam aqui, mas viraram lixo depois que UserProfilePage
                embutido passou a renderizar conquistas e stats próprias
                acima. Foram removidos pra deduplicar. */}

            {/* Menu Sections - Mobile Only */}
            {/* Task #178 — id="perfil-configuracoes" alvo da sub-rota
                /perfil/configuracoes (scrollIntoView). */}
            <div id="perfil-configuracoes" className="lg:hidden max-w-md mx-auto px-6 space-y-6">
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

              {/* Task #130 — Minhas assinaturas Stripe (mobile) */}
              {/* Task #178 — id="perfil-assinaturas" alvo da sub-rota
                  /perfil/assinaturas (scrollIntoView). */}
              <div id="perfil-assinaturas" className="max-w-md lg:max-w-none mx-auto px-6 lg:px-0 mb-4">
                <MinhasAssinaturasCard />
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
