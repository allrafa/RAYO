import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, RefreshCw, AlertTriangle, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";
import { AdminCmsForm } from "./AdminCmsForm";

type Kind = "audio" | "video" | "reels" | "serie" | "curso" | "livro";
type Status = "draft" | "published" | "archived";

interface LinkedHomeCard {
  id: number;
  section: string;
  title: string;
}

// Mirror of `SECTION_LABELS` in `server/features/home-feed/service.ts`. Kept
// in sync manually because the admin UI doesn't share types with the server.
const HOME_SECTION_LABELS: Record<string, string> = {
  recently_played: "Tocados recentemente",
  made_for_you: "Feito para você",
  trending: "Em alta no RAYO",
  podcasts: "Podcasts",
};

function sectionLabel(section: string): string {
  return HOME_SECTION_LABELS[section] ?? section;
}

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
  // Pre-flight state for the "warn before unpublishing" flow. `cards` holds
  // the home rails that will be hidden; `loading` covers the GET pre-flight
  // and the eventual POST so the confirm button can be disabled while in
  // flight.
  const [unpublishConfirm, setUnpublishConfirm] = useState<{
    open: boolean;
    item: ContentRow | null;
    cards: LinkedHomeCard[];
    loading: boolean;
  }>({ open: false, item: null, cards: [], loading: false });

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
    const c = { total: items.length, published: 0, draft: 0, archived: 0 };
    items.forEach((i) => {
      if (i.status === "published") c.published++;
      else if (i.status === "archived") c.archived++;
      else c.draft++;
    });
    return c;
  }, [items]);

  // Direct publish/unpublish without confirmation. Used for the publish
  // direction (no impact) and as the final step inside the unpublish modal.
  async function performStatusChange(item: ContentRow, target: Status): Promise<boolean> {
    const url = target === "draft"
      ? `/api/admin/cms/${item.id}/unpublish`
      : `/api/admin/cms/${item.id}/publish`;
    const res = await api.post<{ item: unknown }>(url, {});
    if (!res.success) {
      toast.error(res.error?.message ?? "Erro ao alterar status");
      return false;
    }
    toast.success(target === "draft" ? "Despublicado" : "Publicado");
    load();
    return true;
  }

  async function togglePublish(item: ContentRow) {
    // Archived items don't render the publish toggle (Task #26 — they must
    // go through draft first via the archive button), so this only ever
    // flips between draft and published.
    // Publishing never hides home cards, so it stays a one-click action.
    if (item.status !== "published") {
      await performStatusChange(item, "published");
      return;
    }
    // Unpublish is gated by a pre-flight that lists the home rails Task #25
    // would silently hide. Open the modal first so the producer can see the
    // impact, even when the GET is still in flight.
    setUnpublishConfirm({ open: true, item, cards: [], loading: true });
    const res = await api.get<{ linked_home_cards: LinkedHomeCard[] }>(
      `/api/admin/cms/${item.id}/linked-home-cards`,
    );
    if (!res.success) {
      toast.error(res.error?.message ?? "Falha ao verificar impacto");
      setUnpublishConfirm({ open: false, item: null, cards: [], loading: false });
      return;
    }
    const cards = res.data?.linked_home_cards ?? [];
    // No impact → skip the modal entirely. This keeps the flow snappy when
    // there's nothing to warn about.
    if (cards.length === 0) {
      setUnpublishConfirm({ open: false, item: null, cards: [], loading: false });
      await performStatusChange(item, "draft");
      return;
    }
    setUnpublishConfirm({ open: true, item, cards, loading: false });
  }

  async function confirmUnpublish() {
    const item = unpublishConfirm.item;
    if (!item) return;
    setUnpublishConfirm((s) => ({ ...s, loading: true }));
    const ok = await performStatusChange(item, "draft");
    if (ok) {
      setUnpublishConfirm({ open: false, item: null, cards: [], loading: false });
    } else {
      setUnpublishConfirm((s) => ({ ...s, loading: false }));
    }
  }

  async function toggleArchive(item: ContentRow) {
    try {
      const archiving = item.status !== "archived";
      if (archiving) {
        const ok = confirm(
          `Arquivar "${item.title}"? O conteúdo deixará de aparecer no app, mas o histórico será mantido.`,
        );
        if (!ok) return;
      }
      const url = archiving
        ? `/api/admin/cms/${item.id}/archive`
        : `/api/admin/cms/${item.id}/unarchive`;
      await api.post(url, {});
      toast.success(archiving ? "Conteúdo arquivado" : "Conteúdo restaurado para rascunho");
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
          <h1 className="text-2xl mb-1" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
            Conteúdo (CMS)
          </h1>
          <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            {counts.total} item{counts.total === 1 ? "" : "s"} · {counts.published} publicado{counts.published === 1 ? "" : "s"} · {counts.draft} rascunho{counts.draft === 1 ? "" : "s"} · {counts.archived} arquivado{counts.archived === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setEditing({ open: true, id: null, defaultKind: kindFilter === "all" ? "audio" : (kindFilter as Kind) })}
            style={{ background: "var(--rayo-terra-500)", color: "#fff" }}
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
              background: kindFilter === f.value ? "var(--rayo-terra-500)" : "transparent",
              color: kindFilter === f.value ? "#fff" : "var(--rayo-ink-700)",
              borderColor: kindFilter === f.value ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)",
            }}
          >
            {f.label}
          </button>
        ))}
        <div className="h-5 w-px mx-1" style={{ background: "var(--rayo-sand-300)" }} />
        {(["all", "draft", "published", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 text-sm rounded-full border transition-colors"
            style={{
              background: statusFilter === s ? "var(--rayo-forest-900)" : "transparent",
              color: statusFilter === s ? "var(--rayo-sand-100)" : "var(--rayo-ink-700)",
              borderColor: "var(--rayo-sand-300)",
            }}
          >
            {s === "all"
              ? "Todos status"
              : s === "draft"
              ? "Rascunho"
              : s === "published"
              ? "Publicado"
              : "Arquivado"}
          </button>
        ))}
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border outline-none"
          style={{
            background: "var(--rayo-sand-50)",
            color: "var(--rayo-forest-900)",
            borderColor: "var(--rayo-sand-300)",
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
            background: "var(--rayo-sand-50)",
            color: "var(--rayo-forest-900)",
            borderColor: "var(--rayo-sand-300)",
            minWidth: 220,
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
        ) : items.length === 0 ? (
          <div className="ra-empty">
            <div className="ra-empty-icon"><Archive className="w-5 h-5" /></div>
            <p className="ra-empty-title">Nenhum conteúdo encontrado.</p>
            <p className="ra-empty-sub">Ajuste os filtros ou crie um novo conteúdo.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--rayo-sand-300)" }}>
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <div
                  className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center text-xl"
                  style={{ background: "var(--rayo-sand-300)" }}
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
                    <span className="ra-tag">{KIND_LABELS[item.kind]}</span>
                    <span
                      className={
                        item.status === "published"
                          ? "ra-tag sage"
                          : item.status === "archived"
                          ? "ra-tag"
                          : "ra-tag ochre"
                      }
                    >
                      {item.status === "published"
                        ? "Publicado"
                        : item.status === "archived"
                        ? "Arquivado"
                        : "Rascunho"}
                    </span>
                    {item.is_premium && (
                      <span className="ra-tag terra">Premium</span>
                    )}
                  </div>
                  <h3
                    className="truncate"
                    style={{ color: "var(--rayo-forest-900)", fontWeight: 600 }}
                  >
                    {item.title}
                  </h3>
                  {item.short_description && (
                    <p
                      className="text-sm truncate"
                      style={{ color: "var(--rayo-ink-400)" }}
                    >
                      {item.short_description}
                    </p>
                  )}
                </div>
                <div className="text-xs hidden md:block text-right" style={{ color: "var(--rayo-ink-400)" }}>
                  {item.view_count} views<br />
                  {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="flex gap-1">
                  {/* Archived items can't be toggled directly to/from published —
                      they must go through draft first via the archive button. */}
                  {item.status !== "archived" && (
                    <Button variant="ghost" size="sm" onClick={() => togglePublish(item)} title={item.status === "published" ? "Despublicar" : "Publicar"}>
                      {item.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleArchive(item)}
                    title={item.status === "archived" ? "Restaurar para rascunho" : "Arquivar"}
                  >
                    {item.status === "archived" ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ open: true, id: item.id })} title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(item)} title="Excluir">
                    <Trash2 className="w-4 h-4" style={{ color: "var(--rayo-terra-500)" }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={unpublishConfirm.open}
        onOpenChange={(open) => {
          // Don't allow dismissal mid-flight; otherwise the toast and the
          // modal can race and produce a stale UI.
          if (!open && unpublishConfirm.loading) return;
          if (!open) setUnpublishConfirm({ open: false, item: null, cards: [], loading: false });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "var(--rayo-ochre-500)" }} />
              Despublicar este conteúdo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unpublishConfirm.item ? (
                <>
                  <strong>"{unpublishConfirm.item.title}"</strong> está vinculado a{" "}
                  {unpublishConfirm.cards.length} card
                  {unpublishConfirm.cards.length === 1 ? "" : "s"} na home. Esses cards
                  serão automaticamente ocultados dos usuários enquanto o conteúdo
                  estiver em rascunho.
                </>
              ) : (
                "Carregando..."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {unpublishConfirm.cards.length > 0 && (
            <div
              className="rounded-md border max-h-56 overflow-y-auto"
              style={{ borderColor: "var(--rayo-sand-300)" }}
            >
              <ul className="divide-y" style={{ borderColor: "var(--rayo-sand-300)" }}>
                {unpublishConfirm.cards.map((card) => (
                  <li key={card.id} className="px-3 py-2 text-sm">
                    <div style={{ color: "var(--rayo-forest-900)", fontWeight: 500 }}>
                      {card.title}
                    </div>
                    <div className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                      {sectionLabel(card.section)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpublishConfirm.loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent Radix's default auto-close so we can keep the modal
                // open while the POST is in flight and close it ourselves on
                // success.
                e.preventDefault();
                confirmUnpublish();
              }}
              disabled={unpublishConfirm.loading || !unpublishConfirm.item}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unpublishConfirm.loading ? "Despublicando..." : "Despublicar mesmo assim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
