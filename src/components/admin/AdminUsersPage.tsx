import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Crown, ShieldAlert } from "lucide-react";
import { api } from "../../lib/api";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../AuthContext";
import { toast } from "sonner@2.0.3";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_premium: boolean;
  segments: string[];
  level: number;
  created_at: string;
  last_active_at: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ROLE_LABELS: Record<UserRole, string> = {
  client: "Cliente",
  producer: "Produtor",
  moderator: "Moderador",
  admin: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  client: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  producer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  moderator: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  admin: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [premiumFilter, setPremiumFilter] = useState<"all" | "yes" | "no">("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (premiumFilter !== "all") params.set("premium", premiumFilter);
    if (segmentFilter !== "all") params.set("segment", segmentFilter);
    const res = await api.get<UsersResponse>(`/api/admin/users?${params}`);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setErrorMsg(res.error?.message || "Erro ao listar usuários");
    }
    setLoading(false);
  }, [page, search, roleFilter, premiumFilter, segmentFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRoleChange = async (targetUser: AdminUser, newRole: UserRole) => {
    if (targetUser.role === newRole) return;
    if (targetUser.id === currentUser?.id && newRole !== "admin") {
      toast.error("Você não pode rebaixar seu próprio papel");
      return;
    }
    const isPromotion =
      newRole === "admin" || newRole === "moderator" || newRole === "producer";
    const isDemotion = targetUser.role === "admin" && newRole !== "admin";
    if (isPromotion || isDemotion) {
      const confirmMsg =
        newRole === "admin"
          ? `Promover ${targetUser.email} a Administrador? Ele(a) terá acesso total ao painel administrativo.`
          : isDemotion
            ? `Rebaixar ${targetUser.email}? Ele(a) perderá acesso administrativo.`
            : `Alterar papel de ${targetUser.email} para ${ROLE_LABELS[newRole]}?`;
      const confirmed = typeof window !== "undefined" && window.confirm(confirmMsg);
      if (!confirmed) return;
    }
    setPendingUserId(targetUser.id);
    const res = await api.patch<{ user: AdminUser }>(
      `/api/admin/users/${targetUser.id}/role`,
      { role: newRole },
    );
    setPendingUserId(null);
    if (res.success && res.data) {
      toast.success(`Papel atualizado para ${ROLE_LABELS[newRole]}`);
      void load();
    } else {
      toast.error(res.error?.message || "Erro ao atualizar papel");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("pt-BR");
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl mb-1"
          style={{ color: "var(--raio-text-primary)", fontWeight: 700 }}
        >
          Usuários
        </h2>
        <p className="text-sm" style={{ color: "var(--raio-text-secondary)" }}>
          Gerencie contas, papéis e permissões.
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--raio-text-tertiary)" }}
          />
          <Input
            type="text"
            placeholder="Buscar por email ou nome..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as UserRole | "all"); setPage(1); }}>
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
            <SelectItem value="producer">Produtor</SelectItem>
            <SelectItem value="moderator">Moderador</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={premiumFilter} onValueChange={(v) => { setPremiumFilter(v as "all" | "yes" | "no"); setPage(1); }}>
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="Premium" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Premium: todos</SelectItem>
            <SelectItem value="yes">Apenas Premium</SelectItem>
            <SelectItem value="no">Não Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={segmentFilter} onValueChange={(v) => { setSegmentFilter(v); setPage(1); }}>
          <SelectTrigger className="md:w-44">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos segmentos</SelectItem>
            <SelectItem value="solteiro">Solteiro</SelectItem>
            <SelectItem value="namorando">Namorando</SelectItem>
            <SelectItem value="casado">Casado</SelectItem>
            <SelectItem value="pais">Pais</SelectItem>
            <SelectItem value="separado">Separado</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Buscar</Button>
      </form>

      {errorMsg && (
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--raio-error-subtle)", color: "var(--raio-error)" }}
        >
          {errorMsg}
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--raio-bg-secondary)",
          borderColor: "var(--raio-border-default)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left"
                style={{
                  color: "var(--raio-text-tertiary)",
                  borderBottom: "1px solid var(--raio-border-default)",
                }}
              >
                <th className="px-4 py-3 uppercase text-xs tracking-wider">Usuário</th>
                <th className="px-4 py-3 uppercase text-xs tracking-wider">Papel</th>
                <th className="px-4 py-3 uppercase text-xs tracking-wider">Premium</th>
                <th className="px-4 py-3 uppercase text-xs tracking-wider">Cadastro</th>
                <th className="px-4 py-3 uppercase text-xs tracking-wider">Último acesso</th>
                <th className="px-4 py-3 uppercase text-xs tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center"
                    style={{ color: "var(--raio-text-tertiary)" }}
                  >
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && data && data.users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center"
                    style={{ color: "var(--raio-text-tertiary)" }}
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.users.map((u) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: "1px solid var(--raio-border-default)" }}
                  >
                    <td className="px-4 py-3">
                      <div style={{ color: "var(--raio-text-primary)", fontWeight: 600 }}>
                        {u.name}
                      </div>
                      <div style={{ color: "var(--raio-text-tertiary)" }} className="text-xs">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ROLE_COLORS[u.role]}>
                        {u.role === "admin" && <ShieldAlert className="w-3 h-3 mr-1" />}
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_premium ? (
                        <Crown className="w-4 h-4 inline" style={{ color: "var(--raio-accent-primary)" }} />
                      ) : (
                        <span style={{ color: "var(--raio-text-tertiary)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--raio-text-secondary)" }}>
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--raio-text-secondary)" }}>
                      {formatDate(u.last_active_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Select
                        disabled={pendingUserId === u.id}
                        value={u.role}
                        onValueChange={(v) => void handleRoleChange(u, v as UserRole)}
                      >
                        <SelectTrigger className="w-36 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="producer">Produtor</SelectItem>
                          <SelectItem value="moderator">Moderador</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--raio-text-secondary)" }}>
            Página {data.page} de {data.totalPages} · {data.total} usuários
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
