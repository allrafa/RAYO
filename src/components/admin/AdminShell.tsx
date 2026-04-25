import { useState } from "react";
import { LayoutDashboard, Users as UsersIcon, ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../AuthContext";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminModerationPage } from "./AdminModerationPage";

type AdminSection = "overview" | "users" | "moderation";

interface AdminShellProps {
  onExitAdmin: () => void;
}

export function AdminShell({ onExitAdmin }: AdminShellProps) {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<AdminSection>("overview");

  const navItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard; minRole?: "moderator" | "admin" }> = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "users", label: "Usuários", icon: UsersIcon, minRole: "admin" },
    { id: "moderation", label: "Moderação", icon: ShieldAlert },
  ];

  const visibleItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "admin") return user?.role === "admin";
    return user?.role === "admin" || user?.role === "moderator";
  });

  const renderSection = () => {
    switch (section) {
      case "overview":
        return <AdminOverviewPage />;
      case "users":
        return <AdminUsersPage />;
      case "moderation":
        return <AdminModerationPage />;
      default:
        return <AdminOverviewPage />;
    }
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
              RAIO Admin
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
            className="w-full justify-start gap-3 h-11 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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
