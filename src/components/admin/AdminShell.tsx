import { useState, useMemo } from "react";
import { LayoutDashboard, Users as UsersIcon, ShieldAlert, ArrowLeft, LogOut, FileText, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth, userHasRole } from "../AuthContext";
import type { UserRole } from "../AuthContext";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminModerationPage } from "./AdminModerationPage";
import { AdminCmsPage } from "./AdminCmsPage";
import { AdminHomeFeedPage } from "./AdminHomeFeedPage";

type AdminSection = "overview" | "cms" | "home-feed" | "users" | "moderation";

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

  // Each section declares the minimum role required to see it. Producer gets
  // baseline shell + Overview; Moderator adds Moderation; Admin adds Users.
  const navItems: NavItem[] = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard, minRole: "producer" },
    { id: "cms", label: "Conteúdo", icon: FileText, minRole: "producer" },
    { id: "home-feed", label: "Home / Destaques", icon: Sparkles, minRole: "producer" },
    { id: "moderation", label: "Moderação", icon: ShieldAlert, minRole: "moderator" },
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
    // Defensive: if the user's role no longer permits the current section
    // (e.g. demoted while on the page), fall back to the first visible one.
    const current = navItems.find((i) => i.id === section);
    const renderById = (id: AdminSection) => {
      switch (id) {
        case "users":
          return <AdminUsersPage />;
        case "moderation":
          return <AdminModerationPage />;
        case "cms":
          return <AdminCmsPage />;
        case "home-feed":
          return <AdminHomeFeedPage />;
        case "overview":
        default:
          return <AdminOverviewPage />;
      }
    };
    if (!current || !userHasRole(user, current.minRole)) {
      const fallback = visibleItems[0]?.id ?? "overview";
      return renderById(fallback);
    }
    return renderById(section);
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: "var(--raio-bg-primary)" }}
    >
      <aside
        className="lg:w-64 lg:min-h-screen flex flex-col border-b lg:border-b-0 lg:border-r"
        style={{
          background: "var(--raio-bg-secondary)",
          borderColor: "var(--raio-border-default)",
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: "var(--raio-border-default)" }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5" style={{ color: "var(--raio-accent-primary)" }} />
            <h1 className="text-lg" style={{ fontWeight: 700, color: "var(--raio-text-primary)" }}>
              RAYO Admin
            </h1>
          </div>
          <p className="text-xs" style={{ color: "var(--raio-text-tertiary)" }}>
            {user?.name} · {user?.role}
          </p>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-x-auto lg:overflow-x-visible flex lg:flex-col gap-1 lg:gap-0">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors w-full whitespace-nowrap"
                style={{
                  background: isActive ? "var(--raio-bg-tertiary)" : "transparent",
                  color: isActive ? "var(--raio-accent-primary)" : "var(--raio-text-secondary)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          className="p-3 space-y-1 border-t"
          style={{ borderColor: "var(--raio-border-default)" }}
        >
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11"
            onClick={onExitAdmin}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o app
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 text-[var(--rayo-terra-700)] hover:bg-[var(--rayo-terra-100)] dark:hover:bg-[var(--rayo-terra-900)]/30"
            onClick={() => void logout()}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">{renderSection()}</div>
      </main>
    </div>
  );
}
