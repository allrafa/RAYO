import { Home, GraduationCap, Users, User } from "lucide-react";

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

type Tab = { id: string; icon: typeof Home; label: string };

const TABS: Tab[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "academia", icon: GraduationCap, label: "Turmas" },
  { id: "comunidade", icon: Users, label: "Comunidade" },
  { id: "perfil", icon: User, label: "Perfil" },
];

export function Navigation({ currentTab, onTabChange }: NavigationProps) {
  return (
    <nav className="rn-bottom" role="navigation" aria-label="Navegação principal">
      <div className="rn-bottom-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`rn-bottom-item ${isActive ? "active" : ""}`}
              onClick={() => {
                onTabChange(tab.id);
                if ("vibrate" in navigator) navigator.vibrate(10);
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className="rn-bottom-icon w-6 h-6"
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
              <span className="rn-bottom-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
