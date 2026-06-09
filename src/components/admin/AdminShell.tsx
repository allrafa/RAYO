import { useState, useMemo } from "react";
import { LayoutDashboard, Users as UsersIcon, ShieldAlert, ArrowLeft, LogOut, FileText, Sparkles, GraduationCap, CreditCard, Star, MessagesSquare, Map as MapIcon, type LucideIcon } from "lucide-react";
import { useAuth, userHasRole } from "../AuthContext";
import type { UserRole } from "../AuthContext";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminModerationPage } from "./AdminModerationPage";
import { AdminReviewsPage } from "./AdminReviewsPage";
import { AdminCmsPage } from "./AdminCmsPage";
import { AdminHomeFeedPage } from "./AdminHomeFeedPage";
import { AdminTurmasPage } from "./AdminTurmasPage";
import { AdminTrailsPage } from "./AdminTrailsPage";
import { AdminBundlesPage } from "./AdminBundlesPage";
import { AdminCommunitiesPage } from "./AdminCommunitiesPage";

type AdminSection = "overview" | "cms" | "home-feed" | "turmas" | "bundles" | "trails" | "communities" | "users" | "moderation" | "reviews";

interface AdminShellProps {
  onExitAdmin: () => void;
}

type NavItem = {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  minRole: UserRole;
};

export function AdminShell({ onExitAdmin }: AdminShellProps) {
  const { user, logout } = useAuth();

  // Each section declares the minimum role required to see it.
  const navItems: NavItem[] = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard, minRole: "producer" },
    { id: "cms", label: "Conteúdo", icon: FileText, minRole: "producer" },
    { id: "turmas", label: "Turmas", icon: GraduationCap, minRole: "producer" },
    { id: "bundles", label: "Trilhas (Academia)", icon: MapIcon, minRole: "admin" },
    { id: "trails", label: "Trilhas (Stripe)", icon: CreditCard, minRole: "admin" },
    { id: "home-feed", label: "Home / Destaques", icon: Sparkles, minRole: "producer" },
    { id: "communities", label: "Comunidades", icon: MessagesSquare, minRole: "admin" },
    { id: "moderation", label: "Moderação", icon: ShieldAlert, minRole: "moderator" },
    { id: "reviews", label: "Avaliações", icon: Star, minRole: "moderator" },
    { id: "users", label: "Usuários", icon: UsersIcon, minRole: "admin" },
  ];

  const visibleItems = useMemo(
    () => navItems.filter((item) => userHasRole(user, item.minRole)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.role],
  );

  const [section, setSection] = useState<AdminSection>(
    () => visibleItems[0]?.id ?? "overview",
  );

  const renderSection = () => {
    const current = navItems.find((i) => i.id === section);
    const renderById = (id: AdminSection) => {
      switch (id) {
        case "users":       return <AdminUsersPage />;
        case "moderation":  return <AdminModerationPage />;
        case "reviews":     return <AdminReviewsPage />;
        case "cms":         return <AdminCmsPage />;
        case "turmas":      return <AdminTurmasPage />;
        case "bundles":     return <AdminBundlesPage />;
        case "trails":      return <AdminTrailsPage />;
        case "communities": return <AdminCommunitiesPage />;
        case "home-feed":   return <AdminHomeFeedPage />;
        case "overview":
        default:            return <AdminOverviewPage />;
      }
    };
    if (!current || !userHasRole(user, current.minRole)) {
      const fallback = visibleItems[0]?.id ?? "overview";
      return renderById(fallback);
    }
    return renderById(section);
  };

  return (
    <div className="ra-admin-shell">
      <aside className="ra-admin-side" aria-label="Navegação Admin">
        <div className="ra-admin-brand">
          <div className="ra-admin-brand-title">
            <ShieldAlert className="w-5 h-5" style={{ color: "var(--rayo-terra-500)" }} />
            <span>RAYO Admin</span>
          </div>
          <p className="ra-admin-brand-sub">
            {user?.name} · {user?.role}
          </p>
        </div>

        <nav className="ra-admin-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`ra-admin-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ra-admin-foot">
          <button
            type="button"
            className="ra-admin-nav-item"
            onClick={onExitAdmin}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o app
          </button>
          <button
            type="button"
            className="ra-admin-nav-item"
            style={{ color: "var(--rayo-terra-700)" }}
            onClick={() => void logout()}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="ra-admin-main">
        <div className="ra-admin-main-inner">{renderSection()}</div>
      </main>
    </div>
  );
}
