import { Home, GraduationCap, Users, User } from "lucide-react";
import { dispatchScrollTop } from "../lib/scrollTop";
import { preloadTab } from "../lib/routePreload";
import { useUnreadBySection } from "./hooks/useUnreadBySection";

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

function formatBadge(n: number): string {
  if (n <= 0) return "";
  return n > 99 ? "99+" : String(n);
}

export function Navigation({ currentTab, onTabChange }: NavigationProps) {
  // Task #129 — IA mobile (decidida na Task #41): a bottom nav tem 4
  // abas fixas (home/academia/comunidade/perfil) e Mensagens vive
  // DENTRO da Comunidade como uma view (pílula "Mensagens" no header).
  // Como o usuário precisa enxergar novidades de DM SEM abrir a aba, o
  // badge da aba Comunidade agrega DMs não lidas + atividade nova da
  // seção (class_post/class_interest/post_moderated). O split semântico
  // continua visível: o `aria-label` quebra os dois números pra leitores
  // de tela e a pílula "Mensagens" dentro da ComunidadePage tem o seu
  // próprio badge isolado de DMs. No desktop, a sidebar TEM aba
  // Mensagens dedicada — lá os badges são separados (ver DesktopSidebar).
  const { messages, community } = useUnreadBySection();

  return (
    <nav className="rn-bottom" role="navigation" aria-label="Navegação principal">
      <div className="rn-bottom-inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          const totalForTab = tab.id === "comunidade" ? messages + community : 0;
          const badgeText = formatBadge(totalForTab);
          const ariaLabel =
            tab.id === "comunidade" && totalForTab > 0
              ? `${tab.label}, ${messages} mensagem${messages === 1 ? "" : "s"} não lida${messages === 1 ? "" : "s"} e ${community} novidade${community === 1 ? "" : "s"} da comunidade`
              : tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              className={`rn-bottom-item ${isActive ? "active" : ""}`}
              onClick={() => {
                // Task #115 — re-tap na aba ativa volta ao topo (sem trocar tab).
                if (isActive) {
                  dispatchScrollTop(tab.id);
                } else {
                  onTabChange(tab.id);
                }
                if ("vibrate" in navigator) navigator.vibrate(10);
              }}
              onMouseEnter={() => preloadTab(tab.id)}
              onFocus={() => preloadTab(tab.id)}
              onTouchStart={() => preloadTab(tab.id)}
              aria-label={ariaLabel}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="rn-bottom-icon-wrap">
                <Icon
                  className="rn-bottom-icon w-6 h-6"
                  strokeWidth={isActive ? 2.5 : 2}
                  aria-hidden="true"
                />
                {badgeText && (
                  <span className="rn-bottom-badge" aria-hidden="true">{badgeText}</span>
                )}
              </span>
              <span className="rn-bottom-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
