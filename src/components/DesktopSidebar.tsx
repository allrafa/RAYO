import { Home, GraduationCap, Users, User, Settings, LogOut, ChevronLeft, ChevronRight, Moon, Sun, MessageCircle, ShieldAlert, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useApp } from "./AppContext";
import { useAuth, userHasRole } from "./AuthContext";
import { useTheme } from "./ThemeProvider";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { useUnreadBySection } from "./hooks/useUnreadBySection";
import { toast } from "sonner@2.0.3";
import { dispatchScrollTop } from "../lib/scrollTop";
import { preloadTab } from "../lib/routePreload";

interface DesktopSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon | null;
  isSpecial?: boolean;
  badge?: number;
};

export function DesktopSidebar({
  currentTab,
  onTabChange,
  isMinimized = false,
  onToggleMinimize,
}: DesktopSidebarProps) {
  const { userData } = useApp();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { count: unreadMessages } = useUnreadMessages();
  // Task #129 — badge de comunidade no desktop também (separado do de
  // Mensagens, que já existe). No mobile, ambos vivem no badge único da
  // aba Comunidade, porque Mensagens não é uma aba própria.
  const { community: unreadCommunity } = useUnreadBySection();

  const baseItems: MenuItem[] = [
    { id: "home", label: "Início", icon: Home },
    { id: "academia", label: "Aprender", icon: GraduationCap },
    // Logo RAYO customizada (mark "R" forest-900 + ochre dot)
    { id: "conselheiro", label: "Conselheiro", icon: null, isSpecial: true },
    { id: "comunidade", label: "Comunidade", icon: Users, badge: unreadCommunity },
    { id: "conversas", label: "Mensagens", icon: MessageCircle, badge: unreadMessages },
    { id: "perfil", label: "Perfil", icon: User },
  ];

  // Producer+ vê o Admin shell (sub-páginas se auto-gateiam)
  const menuItems: MenuItem[] = userHasRole(user, "producer")
    ? [...baseItems, { id: "admin", label: "Admin", icon: ShieldAlert }]
    : baseItems;

  return (
    <aside className={`rn-sidebar ${isMinimized ? "minimized" : ""}`} aria-label="Navegação principal">
      {/* Brand — Task #167: clicável, volta pra Home (re-clique = scroll-top,
          igual às abas). Botão real (não <a>) pra não conflitar com SPA. */}
      <button
        type="button"
        className="rn-brand"
        onClick={() => {
          if (currentTab === "home") {
            dispatchScrollTop("home");
          } else {
            onTabChange("home");
          }
          if ("vibrate" in navigator) navigator.vibrate(10);
        }}
        aria-label="Ir para a Home do RAYO"
        title={isMinimized ? "Início" : undefined}
        style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}
      >
        <div className="rn-brand-mark" aria-hidden="true">R</div>
        {!isMinimized && (
          <div className="rn-brand-text">
            <span className="rn-brand-name">RAYO</span>
            <span className="rn-brand-sub">Família</span>
          </div>
        )}
      </button>

      {/* User row */}
      <div className="rn-user">
        <button
          type="button"
          className="rn-user-row"
          onClick={() => onTabChange("perfil")}
          aria-label={`Perfil de ${userData.name || "Usuário"}`}
        >
          <Avatar className="w-10 h-10 flex-shrink-0">
            {/* Task #167 — usa avatar_url do usuário autenticado.
                AvatarImage só renderiza quando há src; fallback mostra
                a inicial do nome. */}
            {user?.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={userData.name || user.name || "Avatar"} />
            ) : null}
            <AvatarFallback
              style={{
                background: "var(--rayo-forest-900)",
                color: "var(--rayo-sand-50)",
                fontWeight: 600,
              }}
            >
              {(userData.name || user?.name)?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!isMinimized && (
            <div className="rn-user-info">
              <span className="rn-user-name">{userData.name || "Usuário"}</span>
              <span className="rn-user-meta">Nível {userData.level || 3}</span>
            </div>
          )}
        </button>
      </div>

      {/* Menu */}
      <nav className="rn-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`rn-item ${isActive ? "active" : ""}`}
              onClick={() => {
                // Task #115 — re-clique na aba ativa volta ao topo.
                if (isActive) {
                  dispatchScrollTop(item.id);
                } else {
                  onTabChange(item.id);
                }
                if ("vibrate" in navigator) navigator.vibrate(10);
              }}
              onMouseEnter={() => preloadTab(item.id)}
              onFocus={() => preloadTab(item.id)}
              title={isMinimized ? item.label : undefined}
              aria-label={isMinimized ? item.label : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="rn-item-icon-wrap">
                {Icon ? (
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                ) : item.isSpecial ? (
                  <span className="rn-item-special-mark" aria-hidden="true">R</span>
                ) : null}
                {item.badge && item.badge > 0 ? (
                  <span
                    className="rn-item-dot"
                    aria-label={`${item.badge} não lida${item.badge > 1 ? "s" : ""}`}
                  />
                ) : null}
              </span>
              {!isMinimized && <span className="rn-item-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Foot */}
      <div className="rn-foot">
        {onToggleMinimize && (
          <button
            type="button"
            className="rn-item"
            onClick={onToggleMinimize}
            title={isMinimized ? "Expandir sidebar" : "Minimizar sidebar"}
            aria-label={isMinimized ? "Expandir sidebar" : "Minimizar sidebar"}
          >
            <span className="rn-item-icon-wrap">
              {isMinimized ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </span>
            {!isMinimized && <span className="rn-item-label">Minimizar</span>}
          </button>
        )}

        <button
          type="button"
          className="rn-item"
          onClick={toggleTheme}
          title={isMinimized ? (theme === "light" ? "Modo escuro" : "Modo claro") : undefined}
          aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        >
          <span className="rn-item-icon-wrap">
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </span>
          {!isMinimized && (
            <span className="rn-item-label">{theme === "light" ? "Modo escuro" : "Modo claro"}</span>
          )}
        </button>

        {/* "Configurações (em breve)" só pra produtores+ — usuário final
            não precisa ver botão desabilitado sem contexto. */}
        {userHasRole(user, "producer") && (
          <button
            type="button"
            className="rn-item"
            disabled
            aria-disabled="true"
            aria-label="Configurações (em breve)"
            title={isMinimized ? "Configurações — em breve" : "Em breve"}
          >
            <span className="rn-item-icon-wrap">
              <Settings className="w-5 h-5" />
            </span>
            {!isMinimized && <span className="rn-item-label">Configurações</span>}
          </button>
        )}

        <button
          type="button"
          className="rn-item danger"
          onClick={async () => {
            toast.error("Saindo...");
            await logout();
          }}
          title={isMinimized ? "Sair" : undefined}
          aria-label="Sair"
        >
          <span className="rn-item-icon-wrap">
            <LogOut className="w-5 h-5" />
          </span>
          {!isMinimized && <span className="rn-item-label">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
