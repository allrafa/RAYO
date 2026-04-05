import { useState, useEffect } from "react";
import { 
  User, Settings, Bell, Heart, Trophy, Zap, 
  ChevronRight, LogOut, Moon, Sun, Globe, 
  Shield, HelpCircle, MessageSquare, Star,
  Award, Target, TrendingUp, Calendar, Crown,
  BookOpen, Users, Sparkles
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Progress } from "./ui/progress";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { useAccessibility } from "./AccessibilityContext";
import { useTheme } from "./ThemeProvider";
import { toast } from "sonner@2.0.3";
import { FavoritosPage } from "./youtube/FavoritosPage";
import { BibliotecaWithBookReader } from "./BibliotecaWithBookReader";
import { useVideoProgress } from "./hooks/useVideoProgress";
import { api } from "../lib/api";

export function PerfilPage() {
  const { userData, books } = useApp();
  const { settings } = useAccessibility();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showFavoritos, setShowFavoritos] = useState(false);
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const { favoriteVideos } = useVideoProgress();

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
    return <BibliotecaPage onBack={() => setShowBiblioteca(false)} />;
  }

  const stats = [
    { 
      icon: Trophy, 
      label: "Nível", 
      value: `${currentLevel} - ${gamProfile?.levelTitle || "Iniciante"}`,
      colorVar: "var(--raio-accent-primary)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: `${currentXP} XP total`
    },
    { 
      icon: Zap, 
      label: "XP", 
      value: currentXP,
      colorVar: "var(--raio-accent-primary)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: gamProfile ? `${gamProfile.xpForNextLevel - currentXP} para próximo nível` : ""
    },
    { 
      icon: Target, 
      label: "Sequência", 
      value: `${currentStreak} dias`,
      colorVar: "var(--raio-accent-primary)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: `Recorde: ${gamProfile?.longestStreak || currentStreak} dias`
    },
    { 
      icon: Award, 
      label: "Conquistas", 
      value: earnedBadges.length,
      colorVar: "var(--raio-accent-primary)",
      bgVar: theme === 'dark' ? "rgba(255, 200, 0, 0.1)" : "rgba(255, 200, 0, 0.15)",
      trend: `${badges.length} disponíveis`
    },
  ];

  const activityStats: Array<{
    icon: any;
    label: string;
    value: number;
    onClick?: () => void;
  }> = [
    { icon: BookOpen, label: "Biblioteca", value: totalLibraryItems, onClick: () => setShowBiblioteca(true) },
    { icon: Users, label: "Comunidades", value: 5 },
    { icon: Heart, label: "Vídeos Favoritos", value: favoriteVideos.length, onClick: () => setShowFavoritos(true) },
    { icon: Sparkles, label: "Sessões Conselheiro", value: 8 },
  ];

  const menuSections = [
    {
      title: "Conta",
      items: [
        { icon: User, label: "Editar Perfil", onClick: () => toast.info("Em breve!") },
        { icon: Settings, label: "Configurações", onClick: () => toast.info("Em breve!") },
        { icon: Bell, label: "Notificações", hasSwitch: true },
      ]
    },
    {
      title: "Preferências",
      items: [
        { icon: theme === 'dark' ? Moon : Sun, label: "Modo Escuro", hasSwitch: true, switchValue: theme === 'dark', onSwitchChange: toggleTheme },
        { icon: Globe, label: "Idioma", value: "Português", onClick: () => toast.info("Em breve!") },
      ]
    },
    {
      title: "Suporte",
      items: [
        { icon: HelpCircle, label: "Central de Ajuda", onClick: () => toast.info("Em breve!") },
        { icon: MessageSquare, label: "Falar com Suporte", onClick: () => toast.info("Em breve!") },
        { icon: Shield, label: "Privacidade e Segurança", onClick: () => toast.info("Em breve!") },
      ]
    }
  ];

  const progressPercentage = gamProfile?.progressPercentage ?? 0;
  const xpInCurrentLevel = gamProfile?.xpInCurrentLevel ?? 0;
  const xpNeededForNext = gamProfile?.xpNeededForNext ?? 100;

  return (
    <div 
      className="min-h-screen pb-24 lg:pb-8"
      style={{ background: 'var(--raio-bg-primary)' }}
    >
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
                  ? 'linear-gradient(135deg, var(--raio-accent-hover) 0%, var(--raio-accent-primary) 100%)'
                  : 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)'
              }}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJoLTJ2LTJ6bTAtNHYyaC0ydi0yaDF2LTFoMXptMC00djJoLTJ2LTJoMnptLTQgMHYyaC0ydi0yaDJ6bS00IDB2MmgtMnYtMmgyem0tNCAwdjJoLTJ2LTJoMnptLTQgMHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6bTAgNHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bTQgMHYyaC0ydi0yaDJ6bTQtOHYyaC0ydi0yaDJ6bTAtNHYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
              
              <div className="relative pt-12 pb-20 lg:pb-16 px-6">
                {/* Mobile/Desktop Layout */}
                <div className="lg:flex lg:items-start lg:gap-6 max-w-md lg:max-w-none mx-auto">
                  {/* Avatar - Centralizado no mobile, esquerda no desktop */}
                  <div className="text-center lg:text-left lg:flex-shrink-0">
                    <Avatar 
                      className="w-24 h-24 lg:w-32 lg:h-32 mx-auto lg:mx-0 mb-4 lg:mb-0 ring-4 shadow-xl"
                      style={{ ringColor: 'var(--raio-bg-primary)' }}
                    >
                      <AvatarImage src="/placeholder-avatar.jpg" alt={userData.name} />
                      <AvatarFallback 
                        className="text-2xl lg:text-4xl"
                        style={{ 
                          background: 'var(--raio-bg-primary)',
                          color: 'var(--raio-accent-primary)'
                        }}
                      >
                        {userData.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
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
                       userData.segments?.[0] === 'pais' ? '👶 Pais' : '💚 Membro RAIO'}
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
                      className="p-4 lg:p-5 shadow-lg border-0 desktop-card-hover"
                      style={{ background: 'var(--raio-bg-secondary)' }}
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
                              style={{ color: 'var(--raio-text-secondary)' }}
                            >
                              {stat.label}
                            </p>
                            <p 
                              className="text-lg" 
                              style={{ 
                                fontWeight: 700,
                                color: 'var(--raio-text-primary)'
                              }}
                            >
                              {stat.value}
                            </p>
                          </div>
                        </div>
                        <div className="hidden lg:block">
                          <p 
                            className="text-sm mb-1" 
                            style={{ color: 'var(--raio-text-secondary)' }}
                          >
                            {stat.label}
                          </p>
                          <p 
                            className="text-2xl mb-1" 
                            style={{ 
                              fontWeight: 700,
                              color: 'var(--raio-text-primary)'
                            }}
                          >
                            {stat.value}
                          </p>
                          <p 
                            className="text-xs" 
                            style={{ color: 'var(--raio-text-tertiary)' }}
                          >
                            {stat.trend}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Activity Stats - Desktop Only */}
            <div className="hidden lg:block px-0 mb-8">
              <Card 
                className="p-6 border-0 shadow-md"
                style={{ background: 'var(--raio-bg-secondary)' }}
              >
                <h3 
                  className="text-lg mb-4" 
                  style={{ 
                    fontWeight: 600,
                    color: 'var(--raio-text-primary)'
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
                          style={{ color: 'var(--raio-accent-primary)' }}
                        />
                        <p 
                          className="text-2xl mb-1" 
                          style={{ 
                            fontWeight: 700,
                            color: 'var(--raio-text-primary)'
                          }}
                        >
                          {item.value}
                        </p>
                        <p 
                          className="text-xs" 
                          style={{ color: 'var(--raio-text-secondary)' }}
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
                      color: 'var(--raio-text-secondary)'
                    }}
                  >
                    {section.title}
                  </h3>
                  <Card 
                    className="border-0 shadow-md overflow-hidden"
                    style={{ background: 'var(--raio-bg-secondary)' }}
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
                                ':hover': { background: 'var(--raio-bg-tertiary)' }
                              })
                            }}
                            onMouseEnter={(e) => {
                              if (!hasSwitch) {
                                e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
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
                                style={{ background: 'var(--raio-bg-tertiary)' }}
                              >
                                <Icon 
                                  className="w-5 h-5" 
                                  style={{ color: 'var(--raio-text-secondary)' }}
                                />
                              </div>
                              <span 
                                style={{ 
                                  fontWeight: 500,
                                  color: 'var(--raio-text-primary)'
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
                                    setNotificationsEnabled(checked);
                                    toast.success(checked ? "Notificações ativadas" : "Notificações desativadas");
                                  }
                                }}
                              />
                            ) : item.value ? (
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-sm" 
                                  style={{ color: 'var(--raio-text-secondary)' }}
                                >
                                  {item.value}
                                </span>
                                <ChevronRight 
                                  className="w-4 h-4" 
                                  style={{ color: 'var(--raio-text-tertiary)' }}
                                />
                              </div>
                            ) : (
                              <ChevronRight 
                                className="w-4 h-4" 
                                style={{ color: 'var(--raio-text-tertiary)' }}
                              />
                            )}
                          </WrapperElement>
                          {itemIndex < section.items.length - 1 && (
                            <div 
                              className="border-b mx-4" 
                              style={{ borderColor: 'var(--raio-border-default)' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </Card>
                </div>
              ))}

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
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  RAIO Ecossistema v1.0.0
                </p>
                <p 
                  className="text-xs" 
                  style={{ color: 'var(--raio-text-tertiary)' }}
                >
                  © 2025 RAIO. Todos os direitos reservados.
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
                    color: 'var(--raio-text-secondary)'
                  }}
                >
                  {section.title}
                </h3>
                <Card 
                  className="border-0 shadow-md overflow-hidden"
                  style={{ background: 'var(--raio-bg-secondary)' }}
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
                              e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
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
                              style={{ background: 'var(--raio-bg-tertiary)' }}
                            >
                              <Icon 
                                className="w-5 h-5" 
                                style={{ color: 'var(--raio-text-secondary)' }}
                              />
                            </div>
                            <span 
                              style={{ 
                                fontWeight: 500,
                                color: 'var(--raio-text-primary)'
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
                                  setNotificationsEnabled(checked);
                                  toast.success(checked ? "Notificações ativadas" : "Notificações desativadas");
                                }
                              }}
                            />
                          ) : item.value ? (
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-sm" 
                                style={{ color: 'var(--raio-text-secondary)' }}
                              >
                                {item.value}
                              </span>
                              <ChevronRight 
                                className="w-4 h-4" 
                                style={{ color: 'var(--raio-text-tertiary)' }}
                              />
                            </div>
                          ) : (
                            <ChevronRight 
                              className="w-4 h-4" 
                              style={{ color: 'var(--raio-text-tertiary)' }}
                            />
                          )}
                        </WrapperElement>
                        {itemIndex < section.items.length - 1 && (
                          <div 
                            className="border-b mx-4" 
                            style={{ borderColor: 'var(--raio-border-default)' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}

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
                style={{ color: 'var(--raio-text-tertiary)' }}
              >
                RAIO Ecossistema v1.0.0
              </p>
              <p 
                className="text-xs" 
                style={{ color: 'var(--raio-text-tertiary)' }}
              >
                © 2025 RAIO. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
