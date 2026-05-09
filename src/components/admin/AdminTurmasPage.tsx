import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";

interface CourseRow {
  id: number;
  title: string;
  life_context: string | null;
  is_active: boolean | null;
  is_premium: boolean | null;
  content_item_id: number | null;
  status: string | null;
  created_by: number | null;
}

interface InterestRow {
  id: number;
  user_id: number | null;
  user_name: string | null;
  name: string;
  email: string;
  message: string | null;
  created_at: string;
}

interface InterestsResp {
  interests: InterestRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function AdminTurmasPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CourseRow | null>(null);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await api.get<{ courses: CourseRow[] }>("/api/admin/cms/courses");
      setCourses(res.data?.courses ?? []);
    } catch {
      toast.error("Falha ao carregar turmas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCourses(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, search]);

  if (selected) {
    return (
      <TurmaInterestsDetail
        course={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
            Turmas
          </h1>
          <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            Veja os interessados que pediram pra ser avisados quando a turma abrir.
            Edite o conteúdo da página da turma direto no CMS.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadCourses}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar turma por título..."
          className="px-3 py-1.5 text-sm rounded-md border outline-none w-full max-w-sm"
          style={{
            background: "var(--rayo-sand-50)",
            color: "var(--rayo-forest-900)",
            borderColor: "var(--rayo-sand-300)",
          }}
        />
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: "var(--rayo-sand-50)", borderColor: "var(--rayo-sand-300)" }}
      >
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--rayo-ink-400)" }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="ra-empty">
            <div className="ra-empty-icon"><GraduationCap className="w-5 h-5" /></div>
            <p className="ra-empty-title">Nenhuma turma encontrada.</p>
            <p className="ra-empty-sub">Crie uma turma no CMS (kind: Curso).</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--rayo-sand-300)" }}>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className="w-full text-left p-4 flex items-center gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <div
                  className="w-12 h-12 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: "var(--rayo-sand-300)", color: "var(--rayo-forest-900)" }}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {c.life_context && (
                      <span className="ra-tag">{c.life_context}</span>
                    )}
                    {c.status && (
                      <span className={c.status === "published" ? "ra-tag sage" : "ra-tag ochre"}>
                        {c.status === "published" ? "Publicado" : c.status === "archived" ? "Arquivado" : "Rascunho"}
                      </span>
                    )}
                    {c.is_premium && <span className="ra-tag terra">Premium</span>}
                  </div>
                  <h3 className="truncate" style={{ color: "var(--rayo-forest-900)", fontWeight: 600 }}>
                    {c.title}
                  </h3>
                </div>
                <div className="text-xs hidden md:block text-right" style={{ color: "var(--rayo-ink-400)" }}>
                  Ver interessados →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TurmaInterestsDetail({ course, onBack }: { course: CourseRow; onBack: () => void }) {
  const [data, setData] = useState<InterestsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;

  async function load() {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await api.get<InterestsResp>(
        `/api/admin/cms/courses/${course.id}/interests?page=${page}&limit=${limit}`,
      );
      if (res.success && res.data) {
        setData(res.data);
      } else if (res.error?.code === "NOT_OWNER" || res.error?.code === "UNAUTHORIZED") {
        setForbidden(true);
        setData(null);
      } else {
        toast.error(res.error?.message ?? "Falha ao carregar interessados");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar interessados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [course.id, page]);

  async function exportCsv() {
    setExporting(true);
    try {
      const resp = await fetch(`/api/admin/cms/courses/${course.id}/interests.csv`, {
        credentials: "include",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const dispo = resp.headers.get("Content-Disposition") || "";
      const m = /filename="?([^";]+)"?/i.exec(dispo);
      const fname = m?.[1] ?? `interessados-turma-${course.id}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV exportado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  }

  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button
            size="sm"
            onClick={exportCsv}
            disabled={exporting || total === 0}
            style={{ background: "var(--rayo-terra-500)", color: "#fff" }}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl mb-1" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
          Interessados — {course.title}
        </h1>
        <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
          {total} pessoa{total === 1 ? "" : "s"} pediu{total === 1 ? "" : "ram"} pra ser avisada{total === 1 ? "" : "s"}.
        </p>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: "var(--rayo-sand-50)", borderColor: "var(--rayo-sand-300)" }}
      >
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--rayo-ink-400)" }}>
            Carregando...
          </div>
        ) : forbidden ? (
          <div className="ra-empty">
            <div className="ra-empty-icon"><GraduationCap className="w-5 h-5" /></div>
            <p className="ra-empty-title">Sem permissão pra ver os interessados desta turma.</p>
            <p className="ra-empty-sub">Apenas o produtor que criou a turma (ou um moderador/admin) pode acessar essa lista.</p>
          </div>
        ) : !data || data.interests.length === 0 ? (
          <div className="ra-empty">
            <div className="ra-empty-icon"><GraduationCap className="w-5 h-5" /></div>
            <p className="ra-empty-title">Nenhum interessado ainda.</p>
            <p className="ra-empty-sub">Conforme as pessoas clicarem em "Garantir minha vaga" na página da turma, elas aparecem aqui.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--rayo-sand-300)" }}>
            {data.interests.map((row) => (
              <div key={row.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span style={{ color: "var(--rayo-forest-900)", fontWeight: 600 }}>
                      {row.name}
                    </span>
                    <a
                      href={`mailto:${row.email}`}
                      className="text-sm underline"
                      style={{ color: "var(--rayo-terra-500)" }}
                    >
                      {row.email}
                    </a>
                    {row.user_id && (
                      <span className="ra-tag">Usuário cadastrado</span>
                    )}
                  </div>
                  {row.message && (
                    <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--rayo-ink-700)" }}>
                      {row.message}
                    </p>
                  )}
                </div>
                <div className="text-xs text-right whitespace-nowrap" style={{ color: "var(--rayo-ink-400)" }}>
                  {new Date(row.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
