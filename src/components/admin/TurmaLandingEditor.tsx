import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";

interface CourseLanding {
  id: number;
  title: string;
  subtitle: string | null;
  hero_cover_url: string | null;
  who_for: string[] | null;
  what_you_get: string[] | null;
  how_it_works: string | null;
}

const inputStyle: React.CSSProperties = {
  background: "var(--rayo-sand-50)",
  color: "var(--rayo-forest-900)",
  borderColor: "var(--rayo-sand-300)",
};
const cls = "w-full px-3 py-2 text-sm rounded-md border outline-none";

export function TurmaLandingEditor({ courseId }: { courseId: number }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CourseLanding | null>(null);
  const [whoForInput, setWhoForInput] = useState("");
  const [whatInput, setWhatInput] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get<{ course: CourseLanding }>(`/api/admin/cms/courses/${courseId}`);
        if (!cancelled && res.data?.course) {
          const c = res.data.course;
          setData({
            ...c,
            who_for: Array.isArray(c.who_for) ? c.who_for : [],
            what_you_get: Array.isArray(c.what_you_get) ? c.what_you_get : [],
          });
        }
      } catch {
        if (!cancelled) toast.error("Falha ao carregar página da turma");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  function patch<K extends keyof CourseLanding>(key: K, value: CourseLanding[K]) {
    setData((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function addItem(field: "who_for" | "what_you_get", v: string) {
    const value = v.trim();
    if (!value || !data) return;
    const cur = (data[field] ?? []) as string[];
    if (cur.includes(value)) return;
    patch(field, [...cur, value]);
    if (field === "who_for") setWhoForInput("");
    else setWhatInput("");
  }

  function removeItem(field: "who_for" | "what_you_get", v: string) {
    if (!data) return;
    const cur = (data[field] ?? []) as string[];
    patch(field, cur.filter((x) => x !== v));
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    try {
      const url: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/cms/media/upload");
        xhr.withCredentials = true;
        xhr.onerror = () => reject(new Error("Falha de rede"));
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && json.success) {
              resolve(json.data.asset.public_url as string);
            } else {
              reject(new Error(json.error?.message || `Upload falhou (HTTP ${xhr.status})`));
            }
          } catch {
            reject(new Error("Resposta inválida"));
          }
        };
        const fd = new FormData();
        fd.append("file", file);
        xhr.send(fd);
      });
      patch("hero_cover_url", url);
      toast.success("Capa enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setUploadingCover(false);
    }
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await api.patch<{ course: CourseLanding }>(`/api/admin/cms/courses/${courseId}`, {
        subtitle: data.subtitle,
        hero_cover_url: data.hero_cover_url,
        who_for: data.who_for ?? [],
        what_you_get: data.what_you_get ?? [],
        how_it_works: data.how_it_works,
      });
      if (res.data?.course) {
        setData((prev) => prev ? { ...prev, ...res.data!.course } : prev);
      }
      toast.success("Página da turma salva");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border p-4 text-sm flex items-center gap-2"
        style={{ borderColor: "var(--rayo-sand-300)", color: "var(--rayo-ink-400)" }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando página da turma…
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="rounded-md border p-4 space-y-4"
      style={{ background: "var(--rayo-sand-50)", borderColor: "var(--rayo-sand-300)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>Página da turma</h3>
          <p className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
            Conteúdo mostrado na landing pública pra quem ainda não é membro.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar página"}
        </Button>
      </div>

      <div className="space-y-1">
        <label className="text-sm" style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}>
          Subtítulo
        </label>
        <input
          className={cls}
          style={inputStyle}
          maxLength={280}
          placeholder="Frase curta que aparece abaixo do título da turma"
          value={data.subtitle ?? ""}
          onChange={(e) => patch("subtitle", e.target.value)}
        />
        <p className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
          Até 280 caracteres.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm" style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}>
          Capa da landing (hero)
        </label>
        <div className="space-y-2">
          {data.hero_cover_url && (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img
              src={data.hero_cover_url}
              alt="Capa da turma"
              className="w-full max-h-48 object-cover rounded-md border"
              style={{ borderColor: "var(--rayo-sand-300)" }}
            />
          )}
          <div className="flex gap-2">
            <input
              className={cls}
              style={inputStyle}
              placeholder="URL da capa (1200x600 recomendado)"
              value={data.hero_cover_url ?? ""}
              onChange={(e) => patch("hero_cover_url", e.target.value)}
            />
            <Button variant="outline" size="sm" disabled={uploadingCover}
              onClick={() => coverRef.current?.click()}>
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </Button>
            <input ref={coverRef} type="file" hidden accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          </div>
        </div>
      </div>

      <ListEditor
        label="Para quem é (público-alvo)"
        hint="Adicione um item por vez. Ex: 'Casais nos primeiros 5 anos de casamento.'"
        items={data.who_for ?? []}
        inputValue={whoForInput}
        onInputChange={setWhoForInput}
        onAdd={() => addItem("who_for", whoForInput)}
        onRemove={(v) => removeItem("who_for", v)}
      />

      <ListEditor
        label="O que você recebe"
        hint="Liste os entregáveis: aulas, encontros ao vivo, comunidade, materiais…"
        items={data.what_you_get ?? []}
        inputValue={whatInput}
        onInputChange={setWhatInput}
        onAdd={() => addItem("what_you_get", whatInput)}
        onRemove={(v) => removeItem("what_you_get", v)}
      />

      <div className="space-y-1">
        <label className="text-sm" style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}>
          Como funciona
        </label>
        <textarea
          className={cls}
          style={inputStyle}
          rows={5}
          placeholder="Descreva o ritmo da turma, encontros, duração, suporte…"
          value={data.how_it_works ?? ""}
          onChange={(e) => patch("how_it_works", e.target.value)}
        />
      </div>
    </div>
  );
}

function ListEditor(props: {
  label: string;
  hint?: string;
  items: string[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm" style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}>
        {props.label}
      </label>
      <div className="space-y-2">
        {props.items.length > 0 && (
          <ul className="space-y-1">
            {props.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm rounded-md border px-3 py-2"
                style={{ background: "#fff", borderColor: "var(--rayo-sand-300)", color: "var(--rayo-ink-700)" }}>
                <span className="flex-1 break-words">{item}</span>
                <button type="button" onClick={() => props.onRemove(item)}
                  style={{ color: "var(--rayo-terra-500)" }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            className={cls}
            style={inputStyle}
            value={props.inputValue}
            onChange={(e) => props.onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                props.onAdd();
              }
            }}
            placeholder="Pressione Enter para adicionar"
          />
          <Button type="button" variant="outline" size="sm" onClick={props.onAdd}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {props.hint && (
          <p className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>{props.hint}</p>
        )}
      </div>
    </div>
  );
}
