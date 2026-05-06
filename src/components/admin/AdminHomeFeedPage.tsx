import { useEffect, useMemo, useState } from "react";
import {
  Plus, Edit2, Trash2, Eye, EyeOff, RefreshCw, ArrowUp, ArrowDown, X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";

type Section = "recently_played" | "made_for_you" | "trending" | "podcasts";

const SECTION_LABELS: Record<Section, string> = {
  recently_played: "Tocados recentemente",
  made_for_you: "Feito para você",
  trending: "Em alta no RAYO",
  podcasts: "Podcasts",
};

const SECTION_ORDER: Section[] = [
  "recently_played",
  "made_for_you",
  "trending",
  "podcasts",
];

const SECTION_HINTS: Record<Section, string> = {
  recently_played: "Use 'Texto do badge' para a duração (ex.: 18:32) e Progresso (0–100).",
  made_for_you: "Use 'Gradiente' (ex.: from-purple-500 to-pink-500) ou 'URL da imagem'.",
  trending: "Use 'Texto do badge' como posição no chart (1, 2, 3) e 'Texto extra' para visualizações.",
  podcasts: "Use 'Texto do badge' como tipo (Podcast) e 'Texto extra' para nº de episódios.",
};

type LinkState = "ok" | "draft" | "archived" | "missing";

interface HomeFeedItem {
  id: number;
  section: Section;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  gradient: string | null;
  badge_text: string | null;
  meta_text: string | null;
  progress: number | null;
  sort_order: number;
  is_active: boolean;
  content_item_id: number | null;
  created_at: string;
  updated_at: string;
  // Populated by GET /api/admin/home-feed (LEFT JOIN content_items).
  // Optional in the type so create/update payloads don't need to send them.
  linked_content_status?: "draft" | "published" | "archived" | null;
  linked_content_title?: string | null;
  linked_content_kind?: string | null;
  link_state?: LinkState;
}

interface FormState {
  open: boolean;
  item: HomeFeedItem | null;
  defaultSection: Section;
}

const EMPTY_FORM: Omit<HomeFeedItem, "id" | "created_at" | "updated_at" | "content_item_id"> = {
  section: "made_for_you",
  title: "",
  subtitle: "",
  image_url: "",
  gradient: "",
  badge_text: "",
  meta_text: "",
  progress: null,
  sort_order: 0,
  is_active: true,
};

export function AdminHomeFeedPage() {
  const [items, setItems] = useState<HomeFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<Section | "all">("all");
  const [form, setForm] = useState<FormState>({
    open: false, item: null, defaultSection: "made_for_you",
  });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (sectionFilter !== "all") params.set("section", sectionFilter);
    const res = await api.get<{ items: HomeFeedItem[] }>(
      `/api/admin/home-feed?${params.toString()}`,
    );
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? "Falha ao carregar destaques");
      setItems([]);
    } else {
      setItems(res.data.items);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionFilter]);

  const grouped = useMemo(() => {
    const g: Record<Section, HomeFeedItem[]> = {
      recently_played: [],
      made_for_you: [],
      trending: [],
      podcasts: [],
    };
    items.forEach((it) => g[it.section].push(it));
    SECTION_ORDER.forEach((s) =>
      g[s].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    );
    return g;
  }, [items]);

  async function toggleActive(item: HomeFeedItem) {
    const res = await api.patch(`/api/admin/home-feed/${item.id}`, {
      is_active: !item.is_active,
    });
    if (!res.success) {
      toast.error(res.error?.message ?? "Erro ao atualizar");
      return;
    }
    toast.success(item.is_active ? "Item oculto" : "Item ativado");
    void load();
  }

  async function remove(item: HomeFeedItem) {
    if (!confirm(`Excluir "${item.title}"?`)) return;
    const res = await api.delete(`/api/admin/home-feed/${item.id}`);
    if (!res.success) {
      toast.error(res.error?.message ?? "Erro ao excluir");
      return;
    }
    toast.success("Item excluído");
    void load();
  }

  async function move(item: HomeFeedItem, dir: -1 | 1) {
    const list = grouped[item.section];
    const idx = list.findIndex((x) => x.id === item.id);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const ids = reordered.map((x) => x.id);
    const res = await api.post("/api/admin/home-feed/reorder", {
      section: item.section,
      ordered_ids: ids,
    });
    if (!res.success) {
      toast.error(res.error?.message ?? "Erro ao reordenar");
      return;
    }
    void load();
  }

  if (form.open) {
    return (
      <HomeFeedForm
        item={form.item}
        defaultSection={form.defaultSection}
        onClose={() => {
          setForm({ open: false, item: null, defaultSection: "made_for_you" });
          void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl mb-1" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
            Home / Destaques
          </h1>
          <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            {items.length} card{items.length === 1 ? "" : "s"} em {SECTION_ORDER.length} seções da página inicial.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setForm({
                open: true,
                item: null,
                defaultSection: sectionFilter === "all" ? "made_for_you" : sectionFilter,
              })
            }
            style={{ background: "var(--rayo-terra-500)", color: "#fff" }}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo card
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(["all", ...SECTION_ORDER] as const).map((s) => {
          const active = sectionFilter === s;
          const label = s === "all" ? "Todas" : SECTION_LABELS[s];
          return (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              className="px-3 py-1.5 text-sm rounded-full border transition-colors"
              style={{
                background: active ? "var(--rayo-terra-500)" : "transparent",
                color: active ? "#fff" : "var(--rayo-ink-700)",
                borderColor: active ? "var(--rayo-terra-500)" : "var(--rayo-sand-300)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm" style={{ color: "var(--rayo-ink-400)" }}>
          Carregando...
        </div>
      ) : (
        <div className="space-y-8">
          {SECTION_ORDER.filter(
            (s) => sectionFilter === "all" || sectionFilter === s,
          ).map((section) => {
            const list = grouped[section];
            return (
              <section key={section}>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h2 className="text-lg" style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>
                      {SECTION_LABELS[section]}
                    </h2>
                    <p className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                      {SECTION_HINTS[section]}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({ open: true, item: null, defaultSection: section })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{
                    background: "var(--rayo-sand-50)",
                    borderColor: "var(--rayo-sand-300)",
                  }}
                >
                  {list.length === 0 ? (
                    <div className="p-8 text-center text-sm" style={{ color: "var(--rayo-ink-400)" }}>
                      Nenhum card nesta seção. Clique em "Adicionar" para criar o primeiro.
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--rayo-sand-300)" }}>
                      {list.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 flex items-center gap-4"
                          style={{ opacity: item.is_active ? 1 : 0.55 }}
                        >
                          <div
                            className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center text-xs"
                            style={{ background: "var(--rayo-sand-300)" }}
                          >
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                            ) : item.gradient ? (
                              <div className={`w-full h-full bg-gradient-to-br ${item.gradient}`} />
                            ) : (
                              <span style={{ color: "var(--rayo-ink-400)" }}>—</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="truncate" style={{ color: "var(--rayo-forest-900)", fontWeight: 600 }}>
                              {item.title}
                            </h3>
                            {item.subtitle && (
                              <p className="text-sm truncate" style={{ color: "var(--rayo-ink-400)" }}>
                                {item.subtitle}
                              </p>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {item.badge_text && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--rayo-sand-300)", color: "var(--rayo-ink-700)" }}>
                                  badge: {item.badge_text}
                                </span>
                              )}
                              {item.meta_text && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--rayo-sand-300)", color: "var(--rayo-ink-700)" }}>
                                  meta: {item.meta_text}
                                </span>
                              )}
                              {item.progress !== null && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--rayo-sand-300)", color: "var(--rayo-ink-700)" }}>
                                  progresso: {item.progress}%
                                </span>
                              )}
                              {!item.is_active && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.15)", color: "rgb(180,131,7)" }}>
                                  oculto
                                </span>
                              )}
                              {item.link_state === "draft" && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                  style={{ background: "rgba(220,38,38,0.12)", color: "rgb(185,28,28)" }}
                                  title={
                                    item.linked_content_title
                                      ? `Conteúdo vinculado em rascunho: "${item.linked_content_title}". O card está oculto na home pública até a publicação.`
                                      : "Conteúdo vinculado em rascunho — card oculto na home pública."
                                  }
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  conteúdo em rascunho
                                </span>
                              )}
                              {item.link_state === "archived" && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                  // Slate tone — distinct from draft (red) and
                                  // missing (red): archived is an intentional
                                  // retirement, not a broken/unfinished link,
                                  // so the visual weight is muted.
                                  style={{ background: "rgba(100,116,139,0.18)", color: "rgb(71,85,105)" }}
                                  title={
                                    item.linked_content_title
                                      ? `Conteúdo vinculado arquivado: "${item.linked_content_title}". O card está oculto na home pública — restaure ou vincule outro conteúdo.`
                                      : "Conteúdo vinculado arquivado — card oculto na home pública."
                                  }
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  conteúdo arquivado
                                </span>
                              )}
                              {item.link_state === "missing" && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                                  style={{ background: "rgba(220,38,38,0.12)", color: "rgb(185,28,28)" }}
                                  title="O conteúdo vinculado foi excluído. O card está oculto na home pública — edite para vincular outro conteúdo."
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  conteúdo removido
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              disabled={idx === 0}
                              onClick={() => void move(item, -1)}
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              disabled={idx === list.length - 1}
                              onClick={() => void move(item, 1)}
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => void toggleActive(item)}
                              title={item.is_active ? "Ocultar" : "Ativar"}
                            >
                              {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => setForm({ open: true, item, defaultSection: item.section })}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => void remove(item)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface HomeFeedFormProps {
  item: HomeFeedItem | null;
  defaultSection: Section;
  onClose: () => void;
}

function HomeFeedForm({ item, defaultSection, onClose }: HomeFeedFormProps) {
  const [data, setData] = useState(() => {
    if (item) return { ...item };
    return { ...EMPTY_FORM, section: defaultSection } as Partial<HomeFeedItem>;
  });
  const [saving, setSaving] = useState(false);

  function patch<K extends keyof HomeFeedItem>(key: K, value: HomeFeedItem[K] | null) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    if (!data.title?.trim()) {
      toast.error("Informe o título");
      return;
    }
    setSaving(true);
    const payload = {
      section: data.section,
      title: data.title?.trim(),
      subtitle: data.subtitle ?? null,
      image_url: data.image_url ?? null,
      gradient: data.gradient ?? null,
      badge_text: data.badge_text ?? null,
      meta_text: data.meta_text ?? null,
      progress: data.progress ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    };
    const res = item
      ? await api.patch(`/api/admin/home-feed/${item.id}`, payload)
      : await api.post(`/api/admin/home-feed`, payload);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error?.message ?? "Erro ao salvar");
      return;
    }
    toast.success(item ? "Card atualizado" : "Card criado");
    onClose();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl" style={{ fontWeight: 700, color: "var(--rayo-forest-900)" }}>
          {item ? "Editar card" : "Novo card"}
        </h1>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <Field label="Seção">
          <select
            value={data.section}
            onChange={(e) => patch("section", e.target.value as Section)}
            className="w-full px-3 py-2 rounded-md border outline-none"
            style={{
              background: "var(--rayo-sand-50)",
              color: "var(--rayo-forest-900)",
              borderColor: "var(--rayo-sand-300)",
            }}
          >
            {SECTION_ORDER.map((s) => (
              <option key={s} value={s}>{SECTION_LABELS[s]}</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--rayo-ink-400)" }}>
            {SECTION_HINTS[(data.section as Section) ?? "made_for_you"]}
          </p>
        </Field>

        <Field label="Título *">
          <Input value={data.title ?? ""} onChange={(v) => patch("title", v)} maxLength={200} />
        </Field>

        <Field label="Subtítulo">
          <Input value={data.subtitle ?? ""} onChange={(v) => patch("subtitle", v || null)} maxLength={240} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="URL da imagem">
            <Input value={data.image_url ?? ""} onChange={(v) => patch("image_url", v || null)} placeholder="https://..." />
          </Field>
          <Field label="Gradiente (Tailwind)">
            <Input value={data.gradient ?? ""} onChange={(v) => patch("gradient", v || null)} placeholder="from-purple-500 to-pink-500" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Texto do badge (duração / tipo / chart)">
            <Input value={data.badge_text ?? ""} onChange={(v) => patch("badge_text", v || null)} maxLength={80} />
          </Field>
          <Field label="Texto extra (visualizações / episódios)">
            <Input value={data.meta_text ?? ""} onChange={(v) => patch("meta_text", v || null)} maxLength={120} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Progresso (0–100, deixe vazio se não aplicável)">
            <Input
              type="number"
              value={data.progress === null || data.progress === undefined ? "" : String(data.progress)}
              onChange={(v) => patch("progress", v === "" ? null : Math.max(0, Math.min(100, Number(v))))}
              placeholder="ex.: 65"
            />
          </Field>
          <Field label="Ordem">
            <Input
              type="number"
              value={String(data.sort_order ?? 0)}
              onChange={(v) => patch("sort_order", Number(v) || 0)}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--rayo-ink-700)" }}>
          <input
            type="checkbox"
            checked={data.is_active ?? true}
            onChange={(e) => patch("is_active", e.target.checked)}
          />
          Ativo (exibir na home)
        </label>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t" style={{ borderColor: "var(--rayo-sand-300)" }}>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          onClick={() => void save()}
          disabled={saving}
          style={{ background: "var(--rayo-terra-500)", color: "#fff" }}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1" style={{ color: "var(--rayo-ink-700)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, type = "text", placeholder, maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-3 py-2 rounded-md border outline-none"
      style={{
        background: "var(--rayo-sand-50)",
        color: "var(--rayo-forest-900)",
        borderColor: "var(--rayo-sand-300)",
      }}
    />
  );
}
