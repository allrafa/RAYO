import { useEffect, useState } from "react";
import { Users, GraduationCap, MessagesSquare, Activity, Eye, EyeOff, Crown } from "lucide-react";
import { api } from "../../lib/api";

interface OverviewStats {
  users: {
    total: number;
    premium: number;
    by_role: Record<string, number>;
    new_last_7d: number;
  };
  content: {
    courses: number;
    lessons: number;
  };
  community: {
    posts_total: number;
    posts_hidden: number;
    comments_total: number;
    comments_hidden: number;
    posts_last_7d: number;
  };
  sessions: {
    active: number;
  };
  generated_at: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: typeof Users;
}) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "var(--rayo-sand-50)",
        borderColor: "var(--rayo-sand-300)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--rayo-ink-400)", fontWeight: 600 }}
        >
          {title}
        </span>
        <Icon className="w-4 h-4" style={{ color: "var(--rayo-ink-400)" }} />
      </div>
      <div
        className="text-3xl mb-1"
        style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs" style={{ color: "var(--rayo-ink-700)" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get<OverviewStats>("/api/admin/overview");
      if (!active) return;
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setErrorMsg(res.error?.message || "Erro ao carregar métricas");
      }
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2
            className="text-2xl mb-1"
            style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
          >
            Visão geral
          </h2>
          <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            Carregando métricas...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !stats) {
    return (
      <div className="space-y-6">
        <h2
          className="text-2xl"
          style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
        >
          Visão geral
        </h2>
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-700)" }}
        >
          {errorMsg || "Não foi possível carregar os dados."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2
          className="text-2xl mb-1"
          style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
        >
          Visão geral
        </h2>
        <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
          Atualizado em {new Date(stats.generated_at).toLocaleString("pt-BR")}
        </p>
      </div>

      <section>
        <h3
          className="text-sm mb-3 uppercase tracking-wider"
          style={{ color: "var(--rayo-ink-400)", fontWeight: 600 }}
        >
          Usuários
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Total"
            value={stats.users.total.toLocaleString("pt-BR")}
            icon={Users}
          />
          <StatCard
            title="Premium"
            value={stats.users.premium.toLocaleString("pt-BR")}
            icon={Crown}
          />
          <StatCard
            title="Novos 7d"
            value={`+${stats.users.new_last_7d}`}
            icon={Activity}
          />
          <StatCard
            title="Sessões ativas"
            value={stats.sessions.active.toLocaleString("pt-BR")}
            icon={Activity}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Clientes"
            value={(stats.users.by_role.client || 0).toLocaleString("pt-BR")}
            icon={Users}
          />
          <StatCard
            title="Produtores"
            value={(stats.users.by_role.producer || 0).toLocaleString("pt-BR")}
            icon={Users}
          />
          <StatCard
            title="Moderadores"
            value={(stats.users.by_role.moderator || 0).toLocaleString("pt-BR")}
            icon={Users}
          />
          <StatCard
            title="Admins"
            value={(stats.users.by_role.admin || 0).toLocaleString("pt-BR")}
            icon={Users}
          />
        </div>
      </section>

      <section>
        <h3
          className="text-sm mb-3 uppercase tracking-wider"
          style={{ color: "var(--rayo-ink-400)", fontWeight: 600 }}
        >
          Conteúdo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Cursos"
            value={stats.content.courses.toLocaleString("pt-BR")}
            icon={GraduationCap}
          />
          <StatCard
            title="Aulas"
            value={stats.content.lessons.toLocaleString("pt-BR")}
            icon={GraduationCap}
          />
        </div>
      </section>

      <section>
        <h3
          className="text-sm mb-3 uppercase tracking-wider"
          style={{ color: "var(--rayo-ink-400)", fontWeight: 600 }}
        >
          Comunidade
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Posts"
            value={stats.community.posts_total.toLocaleString("pt-BR")}
            subtitle={`${stats.community.posts_hidden} ocultos`}
            icon={MessagesSquare}
          />
          <StatCard
            title="Comentários"
            value={stats.community.comments_total.toLocaleString("pt-BR")}
            subtitle={`${stats.community.comments_hidden} ocultos`}
            icon={MessagesSquare}
          />
          <StatCard
            title="Posts 7d"
            value={`+${stats.community.posts_last_7d}`}
            icon={Activity}
          />
          <StatCard
            title="Visíveis"
            value={(
              stats.community.posts_total - stats.community.posts_hidden
            ).toLocaleString("pt-BR")}
            subtitle="posts publicados"
            icon={Eye}
          />
        </div>
        {stats.community.posts_hidden + stats.community.comments_hidden > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            <EyeOff className="w-4 h-4" />
            <span>
              {stats.community.posts_hidden + stats.community.comments_hidden} itens
              ocultos no total — acesse a aba Moderação para revisar.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
