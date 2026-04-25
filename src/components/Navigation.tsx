import { Home, GraduationCap, Users, User, MessageCircle, ShieldAlert } from "lucide-react";
import { useApp } from "./AppContext";
import { useScrollDirection } from "./hooks/useScrollDirection";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { useTheme } from "./ThemeProvider";
import { useAuth, userHasRole } from "./AuthContext";
import raioLogo from "figma:asset/827405fdf6d360d2a9ec31dfa3facf23fe3474fb.png";

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userName?: string;
  userLevel?: number;
  notifications?: number;
  isTransparent?: boolean;
}

export function Navigation({ currentTab, onTabChange }: NavigationProps) {
  const { userData } = useApp();
  const { user } = useAuth();
  const { scrollDirection, isAtTop } = useScrollDirection({ threshold: 50 });
  const { theme } = useTheme();
  const { count: unreadMessages } = useUnreadMessages();
  
  /**
   * Auto-hide navbar behavior (Mobile):
   * - Scroll down: hide navbar (more screen space for feed)
   * - Scroll up: show navbar (quick access to navigation)
   * - At top: always show navbar
   */
  const shouldHide = scrollDirection === 'down' && !isAtTop;
  
  const baseTabs: Array<{ id: string; icon: typeof Home | null }> = [
    { id: "home", icon: Home },
    { id: "academia", icon: GraduationCap },
    { id: "conselheiro", icon: null }, // Logo RAIO customizada
    { id: "comunidade", icon: Users },
    { id: "conversas", icon: MessageCircle },
    { id: "perfil", icon: User },
  ];

  // Mobile parity with DesktopSidebar: producer+ get an "admin" shortcut.
  const tabs = userHasRole(user, "producer")
    ? [...baseTabs, { id: "admin", icon: ShieldAlert }]
    : baseTabs;

  return (
    <nav 
      className={`
        lg:hidden fixed bottom-0 left-0 right-0 z-50 navbar-modern
        transition-transform duration-300 ease-in-out
        ${shouldHide ? 'translate-y-full' : 'translate-y-0'}
      `}
      role="navigation"
      aria-label="Navegação principal"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-md mx-auto px-4 py-3" style={{
        paddingBottom: 'max(12px, calc(12px + env(safe-area-inset-bottom)))'
      }}>
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const isConselheiro = tab.id === "conselheiro";
            const isConversas = tab.id === "conversas";
            
            // Botão especial para Conselheiro (centro)
            if (isConselheiro) {
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    if ('vibrate' in navigator) navigator.vibrate(10);
                  }}
                  className="relative flex items-center justify-center -mt-6 touch-target"
                  aria-label="Conselheiro"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div 
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center
                      transition-all duration-300 ease-out overflow-hidden
                    `}
                    style={{
                      background: isActive 
                        ? 'var(--raio-accent-primary)' 
                        : 'linear-gradient(135deg, var(--raio-accent-primary) 0%, var(--raio-accent-hover) 100%)',
                      boxShadow: isActive 
                        ? 'var(--raio-shadow-glow)' 
                        : 'var(--raio-shadow-lg)',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <img 
                      src={raioLogo}
                      alt="RAIO"
                      className="w-9 h-9 object-contain"
                      style={{
                        filter: 'brightness(0) invert(1)', // Torna a logo branca
                      }}
                    />
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" 
                        style={{ animationDuration: '2s' }}
                      />
                    )}
                  </div>
                </button>
              );
            }
            
            // Botões normais
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  if ('vibrate' in navigator) navigator.vibrate(10);
                }}
                className="relative flex flex-col items-center justify-center gap-1 py-2 touch-target group"
                aria-label={tab.id}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon 
                    className={`w-7 h-7 transition-all duration-200 ${
                      isActive 
                        ? 'scale-110' 
                        : 'group-hover:scale-105'
                    }`}
                    style={{
                      color: isActive 
                        ? 'var(--raio-accent-primary)' 
                        : 'var(--raio-text-tertiary)',
                    }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  
                  {/* Badge de notificações: mensagens não lidas */}
                  {isConversas && unreadMessages > 0 && (
                    <div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2"
                      style={{
                        background: 'var(--raio-error)',
                        borderColor: 'var(--raio-bg-primary)',
                      }}
                      aria-label={`${unreadMessages} mensagens não lidas`}
                    >
                      <span 
                        className="text-[9px]"
                        style={{ 
                          color: '#FFFFFF',
                          fontWeight: 700,
                        }}
                      >
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Indicador de aba ativa */}
                {isActive && (
                  <div 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" 
                    style={{ background: 'var(--raio-accent-primary)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
