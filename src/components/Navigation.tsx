import { Home, GraduationCap, Users, User } from "lucide-react";

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userName?: string;
  userLevel?: number;
  notifications?: number;
  isTransparent?: boolean;
}

type Tab = { id: string; icon: typeof Home; label: string };

const TABS: Tab[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "academia", icon: GraduationCap, label: "Academia" },
  { id: "comunidade", icon: Users, label: "Comunidade" },
  { id: "perfil", icon: User, label: "Perfil" },
];

export function Navigation({ currentTab, onTabChange }: NavigationProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 navbar-modern"
      role="navigation"
      aria-label="Navegação principal"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        className="max-w-md mx-auto px-4 py-3"
        style={{
          paddingBottom: 'max(12px, calc(12px + env(safe-area-inset-bottom)))',
        }}
      >
        <div className="flex items-center justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  if ('vibrate' in navigator) navigator.vibrate(10);
                }}
                className="relative flex flex-col items-center justify-center gap-1 py-2 touch-target group"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-7 h-7 transition-all duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`}
                  style={{
                    color: isActive
                      ? 'var(--raio-accent-primary)'
                      : 'var(--raio-text-tertiary)',
                  }}
                  strokeWidth={isActive ? 2.5 : 2}
                />
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
