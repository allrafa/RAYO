import { useEffect, useState } from "react";
import { api } from "../../lib/api";

// Task #264 — Admin das trilhas curadas (marketplace_bundles) exibidas na
// Academia. Diferente das "Trilhas pagas" (Stripe), aqui o foco é montar a
// jornada: cada trilha agrega CURSOS e conteúdos não-curso (livros, áudios,
// vídeos, séries) como marcos.

interface BundleItem {
  ref_id: number;
  ref_type: "course" | "content";
  kind: string;
  title: string;
}

interface BundleRow {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  segment: string;
  cover_url: string | null;
  accent_color: string | null;
  item_count: number;
  sort_order: number;
  is_active: boolean;
  items: BundleItem[];
  course_ids: number[];
  content_item_ids: number[];
}

interface CourseOption {
  id: number;
  title: string;
}

interface ContentOption {
  id: number;
  kind: string;
  title: string;
}

const SEGMENTS = ["solteiro", "namoro", "noivos", "casados", "pais"];

// Kinds não-curso que fazem sentido como marco de trilha (exclui 'curso' —
// que vem da tabela courses — e 'artigo', que é blog).
const CONTENT_KINDS = ["livro", "audio", "video", "serie", "reels"];

const KIND_LABEL: Record<string, string> = {
  curso: "Curso",
  livro: "Livro",
  audio: "Áudio",
  video: "Vídeo",
  serie: "Série",
  reels: "Reels",
};

const empty = (): Partial<BundleRow> => ({
  slug: "",
  title: "",
  subtitle: "",
  description: "",
  segment: "solteiro",
  cover_url: "",
  accent_color: "",
  sort_order: 0,
  is_active: true,
  course_ids: [],
  content_item_ids: [],
});

export function AdminBundlesPage() {
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [contentItems, setContentItems] = useState<ContentOption[]>([]);
  const [editing, setEditing] = useState<Partial<BundleRow> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadBundles() {
    const r = await api.get<{ bundles: BundleRow[] }>("/api/admin/marketplace-bundles");
    if (r.success && r.data) setBundles(r.data.bundles);
  }

  async function loadCourses() {
    const r = await api.get<{ courses: CourseOption[] }>("/api/courses");
    if (r.success && r.data) setCourses(r.data.courses);
  }

  async function loadContent() {
    const r = await api.get<{ items: ContentOption[] }>(
      "/api/admin/cms?status=published&limit=100",
    );
    if (r.success && r.data) {
      setContentItems(r.data.items.filter((i) => CONTENT_KINDS.includes(i.kind)));
    }
  }

  useEffect(() => {
    void loadBundles();
    void loadCourses();
    void loadContent();
  }, []);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    const payload = {
      slug: editing.slug,
      title: editing.title,
      subtitle: editing.subtitle || null,
      description: editing.description || null,
      segment: editing.segment,
      cover_url: editing.cover_url || null,
      accent_color: editing.accent_color || null,
      sort_order: Number(editing.sort_order) || 0,
      is_active: editing.is_active ?? true,
      course_ids: editing.course_ids || [],
      content_item_ids: editing.content_item_ids || [],
    };
    const r = editing.id
      ? await api.put(`/api/admin/marketplace-bundles/${editing.id}`, payload)
      : await api.post(`/api/admin/marketplace-bundles`, payload);
    setBusy(false);
    if (!r.success) {
      setErr(r.error?.message || "Erro ao salvar");
      return;
    }
    setEditing(null);
    await loadBundles();
  }

  async function archive(id: number) {
    if (!window.confirm("Arquivar esta trilha? (deixa de aparecer na Academia)")) return;
    const r = await api.delete(`/api/admin/marketplace-bundles/${id}`);
    if (r.success) await loadBundles();
  }

  function toggleCourse(id: number) {
    if (!editing) return;
    const cur = editing.course_ids || [];
    setEditing({
      ...editing,
      course_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  }

  function toggleContent(id: number) {
    if (!editing) return;
    const cur = editing.content_item_ids || [];
    setEditing({
      ...editing,
      content_item_ids: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl mb-1" style={{ color: "var(--rayo-ink-900)" }}>
            Trilhas da Academia
          </h1>
          <p className="text-sm text-muted-foreground">
            Monte a jornada de cada segmento misturando cursos, livros, áudios, vídeos e séries.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(empty())}
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: "var(--rayo-terra-500)", color: "white" }}
        >
          + Nova trilha
        </button>
      </header>

      <div className="rounded-2xl border bg-white" style={{ borderColor: "var(--rayo-ink-100)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--rayo-mist-100)" }}>
              <th className="text-left p-3">Trilha</th>
              <th className="text-left p-3">Segmento</th>
              <th className="text-left p-3">Composição</th>
              <th className="text-left p-3">Ativa?</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((b) => {
              const kinds = [...new Set(b.items.map((i) => i.kind))];
              return (
                <tr key={b.id} className="border-t" style={{ borderColor: "var(--rayo-ink-100)" }}>
                  <td className="p-3">
                    <div>{b.title}</div>
                    <div className="text-xs text-muted-foreground">/{b.slug}</div>
                  </td>
                  <td className="p-3">{b.segment}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {kinds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sem itens</span>
                      ) : (
                        kinds.map((k) => (
                          <span
                            key={k}
                            className="inline-block rounded-full px-2 py-0.5 text-xs"
                            style={{ background: "var(--rayo-sand-50)", color: "var(--rayo-ink-700)" }}
                          >
                            {KIND_LABEL[k] || k}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{b.item_count} itens</div>
                  </td>
                  <td className="p-3">{b.is_active ? "Sim" : "Não"}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(b)}
                      className="text-xs underline mr-3"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void archive(b.id)}
                      className="text-xs underline text-destructive"
                    >
                      Arquivar
                    </button>
                  </td>
                </tr>
              );
            })}
            {bundles.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  Nenhuma trilha criada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="rounded-2xl bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            style={{ borderColor: "var(--rayo-ink-100)" }}
          >
            <h2 className="text-lg mb-4">{editing.id ? "Editar trilha" : "Nova trilha"}</h2>
            <div className="space-y-3">
              <Field label="Slug (URL)">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.slug || ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="ex: solteiro-identidade"
                />
              </Field>
              <Field label="Título">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <Field label="Subtítulo">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.subtitle || ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                />
              </Field>
              <Field label="Segmento">
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.segment}
                  onChange={(e) => setEditing({ ...editing, segment: e.target.value })}
                >
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição">
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cor de destaque">
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.accent_color || ""}
                    onChange={(e) => setEditing({ ...editing, accent_color: e.target.value })}
                    placeholder="#C99056"
                  />
                </Field>
                <Field label="Ordem">
                  <input
                    type="number"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={editing.sort_order ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>

              <Field label="Cursos (marcos)">
                <div className="rounded-lg border p-3 max-h-44 overflow-y-auto">
                  {courses.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum curso cadastrado.</p>
                  )}
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={(editing.course_ids || []).includes(c.id)}
                        onChange={() => toggleCourse(c.id)}
                      />
                      <span>{c.title}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Livros, áudios, vídeos e séries (marcos)">
                <div className="rounded-lg border p-3 max-h-44 overflow-y-auto">
                  {contentItems.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum conteúdo publicado disponível.
                    </p>
                  )}
                  {contentItems.map((ci) => (
                    <label key={ci.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={(editing.content_item_ids || []).includes(ci.id)}
                        onChange={() => toggleContent(ci.id)}
                      />
                      <span
                        className="inline-block rounded-full px-1.5 text-[10px] uppercase tracking-wide"
                        style={{ background: "var(--rayo-sand-50)", color: "var(--rayo-ink-500)" }}
                      >
                        {KIND_LABEL[ci.kind] || ci.kind}
                      </span>
                      <span>{ci.title}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Status">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_active ?? true}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  Ativa (visível na Academia)
                </label>
              </Field>
              {err && <p className="text-sm text-destructive">{err}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl px-4 py-2 text-sm border"
                style={{ borderColor: "var(--rayo-ink-200)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm"
                style={{ background: "var(--rayo-terra-500)", color: "white", opacity: busy ? 0.6 : 1 }}
              >
                {busy ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="text-xs uppercase tracking-wider mb-1 block"
        style={{ color: "var(--rayo-ink-500)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
