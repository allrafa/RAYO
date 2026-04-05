import { Home, GraduationCap, Users, User, Settings, LogOut, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useApp } from "./AppContext";
import { useTheme } from "./ThemeProvider";
import { toast } from "sonner@2.0.3";
import raioLogo from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";
import { motion } from "motion/react";

interface DesktopSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function DesktopSidebar({ currentTab, onTabChange, isMinimized = false, onToggleMinimize }: DesktopSidebarProps) {
  const { userData } = useApp();
  const { theme, toggleTheme } = useTheme();
  
  const menuItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "academia", label: "Academia", icon: GraduationCap },
    { id: "conselheiro", label: "Conselheiro", icon: null, isSpecial: true }, // Logo RAIO customizada
    { id: "comunidade", label: "Comunidade", icon: Users, badge: 3 },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  return (
    <aside 
      className={`
        hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen 
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'lg:w-20' : 'lg:w-64'}
      `}
      style={{ 
        zIndex: 50,
        background: 'var(--raio-bg-secondary)',
        borderRight: '1px solid var(--raio-border-default)',
      }}
    >
      {/* Logo e Brand */}
      <div 
        className="p-6"
        style={{ borderBottom: '1px solid var(--raio-border-default)' }}
      >
        <div className={`flex items-center gap-3 ${isMinimized ? 'justify-center' : ''}`}>
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
            }}
          >
            <img 
              src={raioLogo}
              alt="RAIO"
              className="w-6 h-6 object-contain"
              style={{
                filter: 'brightness(0) invert(1)', // Torna a logo branca
              }}
            />
          </div>
          {!isMinimized && (
            <div>
              <h1 
                className="text-xl" 
                style={{ 
                  fontWeight: 700,
                  color: 'var(--raio-text-primary)',
                }}
              >
                RAIO
              </h1>
              <p 
                className="text-xs"
                style={{ color: 'var(--raio-text-tertiary)' }}
              >
                Ecossistema
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div 
        className="p-4"
        style={{ borderBottom: '1px solid var(--raio-border-default)' }}
      >
        <div 
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${isMinimized ? 'justify-center' : ''}`}
          style={{
            ':hover': {
              background: 'var(--raio-bg-tertiary)',
            }
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--raio-bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          onClick={() => onTabChange('perfil')}
        >
          <Avatar 
            className="w-10 h-10 ring-2 flex-shrink-0"
            style={{ 
              '--tw-ring-color': 'var(--raio-accent-subtle)',
            } as React.CSSProperties}
          >
            <AvatarImage src="/placeholder-avatar.jpg" alt={userData.name} />
            <AvatarFallback 
              style={{
                background: 'var(--raio-accent-primary)',
                color: theme === 'dark' ? 'var(--raio-text-primary)' : '#FFFFFF',
              }}
            >
              {userData.name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          {!isMinimized && (
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm truncate" 
                style={{ 
                  fontWeight: 600,
                  color: 'var(--raio-text-primary)',
                }}
              >
                {userData.name || 'Usuário'}
              </p>
              <p 
                className="text-xs"
                style={{ color: 'var(--raio-text-tertiary)' }}
              >
                Nível {userData.level || 3}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isSpecial = item.isSpecial;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => {
                onTabChange(item.id);
                if ('vibrate' in navigator) navigator.vibrate(10);
              }}
              className={`w-full ${isMinimized ? 'justify-center px-2' : 'justify-start px-4'} gap-3 h-12 transition-all duration-200`}
              style={{
                background: isActive ? 'var(--raio-bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--raio-accent-primary)' : 'var(--raio-text-secondary)',
                fontWeight: isActive ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
                  e.currentTarget.style.color = 'var(--raio-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--raio-text-secondary)';
                } else {
                  e.currentTarget.style.background = 'var(--raio-bg-tertiary)';
                  e.currentTarget.style.color = 'var(--raio-accent-primary)';
                }
              }}
              title={isMinimized ? item.label : undefined}
            >
              <div className={`relative ${isActive && isSpecial ? 'conselheiro-icon-glow' : ''}`}>
                {Icon ? (
                  <Icon 
                    className={`w-5 h-5 transition-all ${
                      isActive ? 'scale-110' : ''
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                ) : isSpecial ? (
                  <img 
                    src={raioLogo}
                    alt="Conselheiro RAIO"
                    className={`w-5 h-5 object-contain transition-all ${
                      isActive ? 'scale-110' : ''
                    }`}
                    style={{
                      filter: isActive 
                        ? 'brightness(0) saturate(100%) invert(49%) sepia(33%) saturate(729%) hue-rotate(95deg) brightness(96%) contrast(89%)'
                        : 'brightness(0) saturate(100%) invert(47%) sepia(6%) saturate(715%) hue-rotate(167deg) brightness(92%) contrast(85%)',
                    }}
                  />
                ) : null}
                {item.badge && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-[9px] border-2"
                    style={{
                      background: 'var(--raio-error)',
                      color: '#FFFFFF',
                      borderColor: 'var(--raio-bg-secondary)',
                    }}
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              {!isMinimized && (
                <span style={{ fontWeight: isActive ? 600 : 500 }}>
                  {item.label}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div 
        className="p-4 space-y-1"
        style={{ borderTop: '1px solid var(--raio-border-default)' }}
      >
        {/* Toggle Minimize Button */}
        {onToggleMinimize && (
          <Button
            variant="ghost"
            className={`w-full ${isMinimized ? 'justify-center px-2' : 'justify-start px-4'} gap-3 h-12 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 mb-2`}
            onClick={onToggleMinimize}
            title={isMinimized ? "Expandir sidebar" : "Minimizar sidebar"}
          >
            {isMinimized ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span style={{ fontWeight: 500 }}>Minimizar</span>
              </>
            )}
          </Button>
        )}

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          className={`w-full ${isMinimized ? 'justify-center px-2' : 'justify-start px-4'} gap-3 h-12 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`}
          onClick={toggleTheme}
          title={isMinimized ? (theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro') : undefined}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
          {!isMinimized && <span style={{ fontWeight: 500 }}>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>}
        </Button>

        <Button
          variant="ghost"
          className={`w-full ${isMinimized ? 'justify-center px-2' : 'justify-start px-4'} gap-3 h-12 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800`}
          onClick={() => toast.info("Em breve!")}
          title={isMinimized ? "Configurações" : undefined}
        >
          <Settings className="w-5 h-5" />
          {!isMinimized && <span style={{ fontWeight: 500 }}>Configurações</span>}
        </Button>
        
        <Button
          variant="ghost"
          className={`w-full ${isMinimized ? 'justify-center px-2' : 'justify-start px-4'} gap-3 h-12 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20`}
          onClick={() => {
            toast.error("Saindo...");
            setTimeout(() => {
              localStorage.removeItem("raio-user");
              window.location.reload();
            }, 1000);
          }}
          title={isMinimized ? "Sair" : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isMinimized && <span style={{ fontWeight: 500 }}>Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
