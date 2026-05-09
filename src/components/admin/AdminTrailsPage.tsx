import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface TrailRow {
  id: number;
  slug: string;
  title: string;
  life_stage: string;
  description: string | null;
  hero_url: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  active: boolean;
  course_ids?: number[];
}

interface CourseOption {
  id: number;
  title: string;
}

const STAGES = ["solteiro", "namoro", "noivos", "casados", "pais"];

const empty = (): Partial<TrailRow> => ({
  slug: "",
  title: "",
  life_stage: "solteiro",
  description: "",
  hero_url: "",
  monthly_price_cents: 0,
  yearly_price_cents: 0,
  active: true,
  course_ids: [],
});

export function AdminTrailsPage() {
  const [trails, setTrails] = useState<TrailRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [editing, setEditing] = useState<Partial<TrailRow> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Record<number, number>>({});

  async function loadTrails() {
    const r = await api.get<{ trails: TrailRow[] }>("/api/admin/trails");
    if (r.success && r.data) setTrails(r.data.trails);
  }

  async function loadCourses() {
    const r = await api.get<{ courses: Array<{ id: number; title: string }> }>("/api/courses");
    if (r.success && r.data) setCourses(r.data.courses);
  }

  useEffect(() => {
    void loadTrails();
    void loadCourses();
  }, []);

  async function startEdit(id: number) {
    const r = await api.get<{ trail: TrailRow }>(`/api/admin/trails/${id}`);
    if (r.success && r.data) setEditing(r.data.trail);
  }

  async function viewSubscribers(id: number) {
    const r = await api.get<{ subscribers: unknown[] }>(`/api/admin/trails/${id}/subscribers`);
    if (r.success && r.data) {
      setSubscribers((prev) => ({ ...prev, [id]: r.data!.subscribers.length }));
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    const payload = {
      slug: editing.slug,
      title: editing.title,
      life_stage: editing.life_stage,
      description: editing.description || null,
      hero_url: editing.hero_url || null,
      monthly_price_cents: Number(editing.monthly_price_cents) || 0,
      yearly_price_cents: Number(editing.yearly_price_cents) || 0,
      active: editing.active ?? true,
      course_ids: editing.course_ids || [],
    };
    const r = editing.id
      ? await api.put<{ trail: TrailRow }>(`/api/admin/trails/${editing.id}`, payload)
      : await api.post<{ trail: TrailRow }>(`/api/admin/trails`, payload);
    setBusy(false);
    if (!r.success) {
      setErr(r.error?.message || "Erro ao salvar");
      return;
    }
    setEditing(null);
    await loadTrails();
  }

  async function archive(id: number) {
    if (!window.confirm("Arquivar esta trilha? (deixa de aparecer no catálogo)")) return;
    const r = await api.delete(`/api/admin/trails/${id}`);
    if (r.success) await loadTrails();
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl mb-1" style={{ color: "var(--rayo-ink-900)" }}>Trilhas pagas</h1>
          <p className="text-sm text-muted-foreground">
            Cada trilha vira um produto no Stripe. Assinaturas mensais/anuais sincronizam via webhook.
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
              <th className="text-left p-3">Estágio</th>
              <th className="text-left p-3">Preço</th>
              <th className="text-left p-3">Stripe</th>
              <th className="text-left p-3">Ativa?</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {trails.map((t) => (
              <tr key={t.id} className="border-t" style={{ borderColor: "var(--rayo-ink-100)" }}>
                <td className="p-3">
                  <div>{t.title}</div>
                  <div className="text-xs text-muted-foreground">/{t.slug}</div>
                </td>
                <td className="p-3">{t.life_stage}</td>
                <td className="p-3">
                  R$ {(t.monthly_price_cents / 100).toFixed(2)}/m<br />
                  <span className="text-xs">R$ {(t.yearly_price_cents / 100).toFixed(2)}/ano</span>
                </td>
                <td className="p-3 text-xs">
                  {t.stripe_product_id ? "✓ sincronizada" : "—"}
                </td>
                <td className="p-3">{t.active ? "Sim" : "Não"}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => void viewSubscribers(t.id)}
                    className="text-xs underline mr-3"
                  >
                    Assinantes {subscribers[t.id] !== undefined ? `(${subscribers[t.id]})` : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startEdit(t.id)}
                    className="text-xs underline mr-3"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void archive(t.id)}
                    className="text-xs underline text-destructive"
                  >
                    Arquivar
                  </button>
                </td>
              </tr>
            ))}
            {trails.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
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
                  placeholder="ex: solteiro"
                />
              </Field>
              <Field label="Título">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </Field>
              <Field label="Estágio de vida">
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.life_stage}
                  onChange={(e) => setEditing({ ...editing, life_stage: e.target.value })}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
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
              <Field label="URL do hero (imagem)">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editing.hero_url || ""}
                  onChange={(e) => setEditing({ ...editing, hero_url: e.target.value })}
                  placeholder="https://… (opcional)"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço mensal (R$)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={(editing.monthly_price_cents ?? 0) / 100}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        monthly_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                      })
                    }
                  />
                </Field>
                <Field label="Preço anual (R$)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={(editing.yearly_price_cents ?? 0) / 100}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        yearly_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Turmas vinculadas">
                <div className="rounded-lg border p-3 max-h-48 overflow-y-auto">
                  {courses.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma turma cadastrada.</p>
                  )}
                  {courses.map((c) => {
                    const checked = (editing.course_ids || []).includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 py-1 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const cur = editing.course_ids || [];
                            setEditing({
                              ...editing,
                              course_ids: e.target.checked
                                ? [...cur, c.id]
                                : cur.filter((id) => id !== c.id),
                            });
                          }}
                        />
                        <span>{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
              <Field label="Status">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.active ?? true}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                  Ativa (visível no catálogo)
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
      <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: "var(--rayo-ink-500)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
