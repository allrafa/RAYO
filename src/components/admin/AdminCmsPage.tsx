import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";
import { AdminCmsForm } from "./AdminCmsForm";

type Kind = "audio" | "video" | "reels" | "serie" | "curso" | "livro";
type Status = "draft" | "published";

interface ContentRow {
  id: number;
  kind: Kind;
  title: string;
  slug: string | null;
  short_description: string | null;
  cover_url: string | null;
  status: Status;
  is_premium: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const KIND_LABELS: Record<Kind, string> = {
  audio: "Áudio",
  video: "Vídeo",
  reels: "Reels",
  serie: "Série",
  curso: "Curso",
  livro: "Livro",
};

const KIND_FILTERS: Array<{ value: Kind | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "audio", label: "Áudios" },
  { value: "video", label: "Vídeos" },
  { value: "reels", label: "Reels" },
  { value: "serie", label: "Séries" },
  { value: "curso", label: "Cursos" },
  { value: "livro", label: "Livros" },
];

export function AdminCmsPage() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<Kind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ open: boolean; id: number | null; defaultKind?: Kind }>({
    open: false, id: null,
  });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (kindFilter !== "all") params.set("kind", kindFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (segmentFilter !== "all") params.set("segment", segmentFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("limit", "100");
      const res = await api.get<{ items: ContentRow[] }>(`/api/admin/cms?${params.toString()}`);
      setItems(res.data?.items ?? []);
    } catch (err) {
      console.error("[CMS] load error", err);
      toast.error("Falha ao carregar conteúdos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, statusFilter, segmentFilter]);

  const counts = useMemo(() => {
    const c = { total: items.length, published: 0, draft: 0 };
    items.forEach((i) => { if (i.status === "published") c.published++; else c.draft++; });
    return c;
  }, [items]);

  async function togglePublish(item: ContentRow) {
    try {
      const url = item.status === "published"
        ? `/api/admin/cms/${item.id}/unpublish`
        : `/api/admin/cms/${item.id}/publish`;
      await api.post(url, {});
      toast.success(item.status === "published" ? "Despublicado" : "Publicado");
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    }
  }

  async function remove(item: ContentRow) {
    if (!confirm(`Excluir "${item.title}" definitivamente?`)) return;
    try {
      await api.delete(`/api/admin/cms/${item.id}`);
      toast.success("Conteúdo excluído");
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    }
  }

  if (editing.open) {
    return (
      <AdminCmsForm
        contentId={editing.id ?? undefined}
        defaultKind={editing.defaultKind ?? "audio"}
        onClose={() => { setEditing({ open: false, id: null }); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontWeight: 700, color: "var(--raio-text-primary)" }}>
            Conteúdo (CMS)
          </h1>
          <p className="text-sm" style={{ color: "var(--raio-text-secondary)" }}>
            {counts.total} item{counts.total === 1 ? "" : "s"} · {counts.published} publicado{counts.published === 1 ? "" : "s"} · {counts.draft} rascunho{counts.draft === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setEditing({ open: true, id: null, defaultKind: kindFilter === "all" ? "audio" : (kindFilter as Kind) })}
            style={{ background: "var(--raio-accent-primary)", color: "#fff" }}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo conteúdo
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setKindFilter(f.value)}
            className="px-3 py-1.5 text-sm rounded-full border transition-colors"
            style={{
              background: kindFilter === f.value ? "var(--raio-accent-primary)" : "transparent",
              color: kindFilter === f.value ? "#fff" : "var(--raio-text-secondary)",
              borderColor: kindFilter === f.value ? "var(--raio-accent-primary)" : "var(--raio-border-default)",
            }}
          >
            {f.label}
          </button>
        ))}
        <div className="h-5 w-px mx-1" style={{ background: "var(--raio-border-default)" }} />
        {(["all", "draft", "published"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 text-sm rounded-full border transition-colors"
            style={{
              background: statusFilter === s ? "var(--raio-text-primary)" : "transparent",
              color: statusFilter === s ? "var(--raio-bg-primary)" : "var(--raio-text-secondary)",
              borderColor: "var(--raio-border-default)",
            }}
          >
            {s === "all" ? "Todos status" : s === "draft" ? "Rascunho" : "Publicado"}
          </button>
        ))}
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border outline-none"
          style={{
            background: "var(--raio-bg-secondary)",
            color: "var(--raio-text-primary)",
            borderColor: "var(--raio-border-default)",
          }}
        >
          <option value="all">Todos segmentos</option>
          <option value="solteiro">Solteiro</option>
          <option value="namoro">Namoro</option>
          <option value="noivos">Noivos</option>
          <option value="casados">Casados</option>
          <option value="pais">Pais</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Buscar por título..."
          className="ml-auto px-3 py-1.5 text-sm rounded-md border outline-none"
          style={{
            background: "var(--raio-bg-secondary)",
            color: "var(--raio-text-primary)",
            borderColor: "var(--raio-border-default)",
            minWidth: 220,
          }}
        />
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: "var(--raio-bg-secondary)", borderColor: "var(--raio-border-default)" }}
      >
        {loading ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--raio-text-tertiary)" }}>
            Carregando...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--raio-text-tertiary)" }}>
            Nenhum conteúdo encontrado.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--raio-border-default)" }}>
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <div
                  className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center text-xl"
                  style={{ background: "var(--raio-bg-tertiary)" }}
                >
                  {item.cover_url ? (
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>{KIND_LABELS[item.kind]?.[0] ?? "?"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--raio-bg-tertiary)",
                        color: "var(--raio-text-secondary)",
                      }}
                    >
                      {KIND_LABELS[item.kind]}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: item.status === "published" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
                        color: item.status === "published" ? "rgb(22,163,74)" : "rgb(180,131,7)",
                      }}
                    >
                      {item.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                    {item.is_premium && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.15)", color: "rgb(147,51,234)" }}>
                        Premium
                      </span>
                    )}
                  </div>
                  <h3
                    className="truncate"
                    style={{ color: "var(--raio-text-primary)", fontWeight: 600 }}
                  >
                    {item.title}
                  </h3>
                  {item.short_description && (
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--raio-text-tertiary)" }}
                    >
                      {item.short_description}
                    </p>
                  )}
                </div>
                <div className="text-xs hidden md:block text-right" style={{ color: "var(--raio-text-tertiary)" }}>
                  {item.view_count} views<br />
                  {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => togglePublish(item)} title={item.status === "published" ? "Despublicar" : "Publicar"}>
                    {item.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ open: true, id: item.id })} title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(item)} title="Excluir">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
