import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Upload, Loader2, Trash2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";
import { CourseModulesEditor } from "./CourseModulesEditor";

type Kind = "audio" | "video" | "reels" | "serie" | "curso" | "livro";
type Status = "draft" | "published";

interface ContentDetail {
  id: number;
  kind: Kind;
  title: string;
  slug: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  segments: string[];
  interests: string[];
  tags: string[];
  status: Status;
  is_premium: boolean;
  price: string | number;
  media_url: string | null;
  external_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  hook: string | null;
  cta: string | null;
  author: string | null;
  pages: number | null;
  course_id: number | null;
  episodes?: Episode[];
}

interface Episode {
  id: number;
  title: string;
  description: string | null;
  episode_kind: "audio" | "video";
  media_url: string | null;
  external_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  sort_order: number;
}

interface Props {
  contentId?: number;
  defaultKind: Kind;
  onClose: () => void;
}

const KIND_OPTIONS: Array<{ value: Kind; label: string; help: string }> = [
  { value: "audio", label: "Áudio", help: "Arquivo de áudio com transcrição opcional" },
  { value: "video", label: "Vídeo", help: "Upload ou URL externa (YouTube/Vimeo)" },
  { value: "reels", label: "Reels", help: "Vertical curto com hook e CTA" },
  { value: "serie", label: "Série", help: "Conjunto de episódios (áudio ou vídeo)" },
  { value: "curso", label: "Curso", help: "Vincula a um curso existente" },
  { value: "livro", label: "Livro", help: "PDF/EPUB ou áudio-livro" },
];

const SEGMENTS = ["solteiro", "namoro", "noivos", "casados", "pais"];

const empty = (kind: Kind): ContentDetail => ({
  id: 0, kind, title: "", slug: null, short_description: "", long_description: "",
  cover_url: "", segments: [], interests: [], tags: [], status: "draft",
  is_premium: false, price: 0, media_url: "", external_url: "",
  duration_seconds: null, transcript: "", hook: "", cta: "",
  author: "", pages: null, course_id: null, episodes: [],
});

export function AdminCmsForm({ contentId, defaultKind, onClose }: Props) {
  const [data, setData] = useState<ContentDetail>(() => empty(defaultKind));
  const [loading, setLoading] = useState(!!contentId);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [courses, setCourses] = useState<Array<{ id: number; title: string; content_item_id: number | null }>>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!contentId) return;
    (async () => {
      try {
        const res = await api.get<{ item: ContentDetail }>(`/api/admin/cms/${contentId}`);
        if (res.data) setData({ ...empty(res.data.item.kind), ...res.data.item });
      } catch (err) {
        toast.error("Falha ao carregar conteúdo");
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [contentId, onClose]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ courses: Array<{ id: number; title: string; content_item_id: number | null }> }>(`/api/admin/cms/courses`);
        if (res.data) setCourses(res.data.courses);
      } catch { /* non-blocking */ }
    })();
  }, []);

  function set<K extends keyof ContentDetail>(key: K, value: ContentDetail[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSegment(seg: string) {
    setData((prev) => ({
      ...prev,
      segments: prev.segments.includes(seg)
        ? prev.segments.filter((s) => s !== seg)
        : [...prev.segments, seg],
    }));
  }

  function addTag(value: string, list: "tags" | "interests") {
    const v = value.trim();
    if (!v) return;
    setData((prev) => ({
      ...prev,
      [list]: Array.from(new Set([...(prev[list] || []), v])),
    }));
    if (list === "tags") setTagInput(""); else setInterestInput("");
  }

  function removeTag(value: string, list: "tags" | "interests") {
    setData((prev) => ({
      ...prev,
      [list]: (prev[list] || []).filter((t) => t !== value),
    }));
  }

  // Use XHR (not fetch) so we get real upload progress events. Tracks
  // per-target progress so the UI can render an inline progress bar for the
  // file currently being uploaded — required for large media (videos can be
  // 100+ MB on a slow connection).
  async function uploadFile(target: "media" | "cover", file: File) {
    setUploadProgress((p) => ({ ...p, [target]: 0 }));
    try {
      const url: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/cms/media/upload");
        xhr.withCredentials = true;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadProgress((p) => ({ ...p, [target]: pct }));
          }
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao enviar"));
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (xhr.status >= 200 && xhr.status < 300 && json.success) {
              resolve(json.data.asset.public_url as string);
            } else {
              reject(new Error(json.error?.message || `Upload falhou (HTTP ${xhr.status})`));
            }
          } catch {
            reject(new Error("Resposta inválida do servidor"));
          }
        };
        const fd = new FormData();
        fd.append("file", file);
        xhr.send(fd);
      });
      if (target === "media") set("media_url", url);
      else set("cover_url", url);
      toast.success(`${file.name} enviado`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setUploadProgress((p) => {
        const next = { ...p };
        delete next[target];
        return next;
      });
    }
  }

  async function save(publish = false) {
    if (!data.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        status: publish ? "published" : data.status,
        price: typeof data.price === "string" ? parseFloat(data.price) : data.price,
      };
      let id = data.id;
      if (id) {
        await api.patch(`/api/admin/cms/${id}`, payload);
      } else {
        const res = await api.post<{ item: ContentDetail }>(`/api/admin/cms`, payload);
        if (res.data) {
          id = res.data.item.id;
          setData((prev) => ({ ...prev, id, slug: res.data!.item.slug }));
        }
      }
      toast.success(publish ? "Publicado" : "Salvo");
      if (publish) onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Episodes (only for kind=serie) ──
  async function addEpisode() {
    if (!data.id) {
      toast.info("Salve a série antes de adicionar episódios");
      return;
    }
    try {
      const res = await api.post<{ episode: Episode }>(`/api/admin/cms/${data.id}/episodes`, {
        title: `Episódio ${(data.episodes?.length ?? 0) + 1}`,
        episode_kind: "audio",
        sort_order: (data.episodes?.length ?? 0) + 1,
      });
      if (res.data) set("episodes", [...(data.episodes ?? []), res.data.episode]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    }
  }

  async function updateEp(ep: Episode, patch: Partial<Episode>) {
    try {
      const res = await api.patch<{ episode: Episode }>(`/api/admin/cms/${data.id}/episodes/${ep.id}`, patch);
      if (res.data) {
        set("episodes", (data.episodes ?? []).map((e) => e.id === ep.id ? res.data!.episode : e));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    }
  }

  async function removeEp(ep: Episode) {
    if (!confirm(`Excluir episódio "${ep.title}"?`)) return;
    try {
      await api.delete(`/api/admin/cms/${data.id}/episodes/${ep.id}`);
      set("episodes", (data.episodes ?? []).filter((e) => e.id !== ep.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center" style={{ color: "var(--raio-text-tertiary)" }}>
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    );
  }

  const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="space-y-1">
      <label className="text-sm" style={{ color: "var(--raio-text-secondary)", fontWeight: 600 }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: "var(--raio-text-tertiary)" }}>{hint}</p>}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    background: "var(--raio-bg-secondary)",
    color: "var(--raio-text-primary)",
    borderColor: "var(--raio-border-default)",
  };
  const cls = "w-full px-3 py-2 text-sm rounded-md border outline-none";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a lista
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Ocultar prévia" : "Ver prévia"}
          </Button>
          <Button variant="outline" size="sm" disabled={saving} onClick={() => save(false)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar rascunho"}
          </Button>
          <Button size="sm" disabled={saving} onClick={() => save(true)} style={{ background: "var(--raio-accent-primary)", color: "#fff" }}>
            Publicar
          </Button>
        </div>
      </div>

      <h1 className="text-2xl" style={{ fontWeight: 700, color: "var(--raio-text-primary)" }}>
        {data.id ? "Editar conteúdo" : "Novo conteúdo"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Field label="Tipo" hint={KIND_OPTIONS.find((k) => k.value === data.kind)?.help}>
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.value}
                  onClick={() => set("kind", k.value)}
                  className="px-3 py-2 text-sm rounded-md border transition-colors"
                  style={{
                    background: data.kind === k.value ? "var(--raio-accent-primary)" : "var(--raio-bg-secondary)",
                    color: data.kind === k.value ? "#fff" : "var(--raio-text-secondary)",
                    borderColor: data.kind === k.value ? "var(--raio-accent-primary)" : "var(--raio-border-default)",
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Título *">
            <input type="text" className={cls} style={inputStyle} value={data.title}
              onChange={(e) => set("title", e.target.value)} maxLength={300} />
          </Field>

          <Field label="Resumo (até 240 chars)" hint="Mostrado nos cards de listagem">
            <textarea className={cls} style={inputStyle} rows={2} maxLength={240}
              value={data.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
          </Field>

          <Field label="Descrição completa">
            <textarea className={cls} style={inputStyle} rows={5}
              value={data.long_description ?? ""} onChange={(e) => set("long_description", e.target.value)} />
          </Field>

          {/* Type-specific */}
          {data.kind === "curso" ? (
            <>
              <Field label="Curso vinculado" hint="Vincule a um curso existente da Academia ou crie um novo curso direto pelo CMS.">
                <div className="flex gap-2">
                  <select className={cls} style={inputStyle} value={data.course_id ?? ""}
                    onChange={(e) => set("course_id", e.target.value ? parseInt(e.target.value, 10) : null)}>
                    <option value="">— Selecione um curso —</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const newTitle = window.prompt("Título do novo curso:", data.title || "");
                    if (!newTitle || !newTitle.trim()) return;
                    try {
                      const res = await api.post<{ course_id: number; content_item_id: number }>(
                        `/api/admin/cms/courses`,
                        {
                          title: newTitle.trim(),
                          description: data.short_description ?? "",
                          thumbnail: data.cover_url ?? "",
                          segments: data.segments,
                          interests: data.interests,
                          is_premium: data.is_premium,
                          price: data.price ?? 0,
                        }
                      );
                      if (res.data?.course_id) {
                        const list = await api.get<{ courses: Array<{ id: number; title: string; content_item_id: number | null }> }>(`/api/admin/cms/courses`);
                        if (list.data) setCourses(list.data.courses);
                        set("course_id", res.data.course_id);
                        toast.success("Curso criado e vinculado");
                      }
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Erro ao criar curso";
                      toast.error(msg);
                    }
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Novo curso
                  </Button>
                </div>
              </Field>
              {data.course_id ? (
                <CourseModulesEditor courseId={data.course_id} />
              ) : (
                <p className="text-xs" style={{ color: "var(--raio-text-tertiary)" }}>
                  Selecione (ou crie) um curso para gerenciar seus módulos e lições.
                </p>
              )}
            </>
          ) : data.kind === "serie" ? (
            <div
              className="rounded-md border p-4 space-y-3"
              style={{ background: "var(--raio-bg-secondary)", borderColor: "var(--raio-border-default)" }}
            >
              <div className="flex items-center justify-between">
                <h3 style={{ fontWeight: 600, color: "var(--raio-text-primary)" }}>Episódios</h3>
                <Button size="sm" variant="outline" onClick={addEpisode} disabled={!data.id}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
              {!data.id && (
                <p className="text-xs" style={{ color: "var(--raio-text-tertiary)" }}>
                  Salve a série antes de adicionar episódios.
                </p>
              )}
              {(data.episodes ?? []).length === 0 ? (
                <p className="text-sm" style={{ color: "var(--raio-text-tertiary)" }}>
                  Nenhum episódio ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {(data.episodes ?? []).map((ep) => (
                    <div key={ep.id} className="p-3 rounded-md border space-y-2"
                      style={{ borderColor: "var(--raio-border-default)" }}>
                      <div className="flex gap-2 items-center">
                        <input className={cls} style={inputStyle} value={ep.title}
                          onChange={(e) => updateEp(ep, { title: e.target.value })} />
                        <select className="px-2 py-2 text-sm rounded-md border" style={inputStyle}
                          value={ep.episode_kind} onChange={(e) => updateEp(ep, { episode_kind: e.target.value as "audio" | "video" })}>
                          <option value="audio">Áudio</option>
                          <option value="video">Vídeo</option>
                        </select>
                        <Button size="sm" variant="ghost" onClick={() => removeEp(ep)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <input className={cls} style={inputStyle} placeholder="URL do arquivo / vídeo"
                        value={ep.media_url ?? ep.external_url ?? ""}
                        onChange={(e) => updateEp(ep, { media_url: e.target.value, external_url: null })} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {(data.kind === "audio" || data.kind === "video" || data.kind === "reels" || data.kind === "livro") && (
                <Field label={data.kind === "livro" ? "Arquivo do livro (PDF/EPUB ou áudio)" : "Arquivo de mídia"}>
                  <div className="flex gap-2 items-center">
                    <input className={cls} style={inputStyle} placeholder="URL do arquivo enviado"
                      value={data.media_url ?? ""} onChange={(e) => set("media_url", e.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-1" /> Enviar
                    </Button>
                    <input ref={fileInputRef} type="file" hidden
                      onChange={(e) => e.target.files?.[0] && uploadFile("media", e.target.files[0])} />
                  </div>
                  {uploadProgress.media !== undefined && (
                    <UploadProgressBar pct={uploadProgress.media} />
                  )}
                </Field>
              )}
              {(data.kind === "video" || data.kind === "reels") && (
                <Field label="URL externa (YouTube / Vimeo)" hint="Use no lugar do upload se preferir referenciar um vídeo já hospedado.">
                  <input className={cls} style={inputStyle} value={data.external_url ?? ""}
                    onChange={(e) => set("external_url", e.target.value)} />
                </Field>
              )}
              {(data.kind === "audio" || data.kind === "video" || data.kind === "reels") && (
                <Field label="Duração (segundos)">
                  <input type="number" className={cls} style={inputStyle} value={data.duration_seconds ?? ""}
                    onChange={(e) => set("duration_seconds", e.target.value ? parseInt(e.target.value, 10) : null)} />
                </Field>
              )}
              {data.kind === "audio" && (
                <Field label="Transcrição (opcional)">
                  <textarea className={cls} style={inputStyle} rows={4}
                    value={data.transcript ?? ""} onChange={(e) => set("transcript", e.target.value)} />
                </Field>
              )}
              {data.kind === "reels" && (
                <>
                  <Field label="Hook (gancho)">
                    <input className={cls} style={inputStyle} value={data.hook ?? ""}
                      onChange={(e) => set("hook", e.target.value)} />
                  </Field>
                  <Field label="CTA (call to action)">
                    <input className={cls} style={inputStyle} value={data.cta ?? ""}
                      onChange={(e) => set("cta", e.target.value)} />
                  </Field>
                </>
              )}
              {data.kind === "livro" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Autor"><input className={cls} style={inputStyle}
                    value={data.author ?? ""} onChange={(e) => set("author", e.target.value)} /></Field>
                  <Field label="Páginas"><input type="number" className={cls} style={inputStyle}
                    value={data.pages ?? ""} onChange={(e) => set("pages", e.target.value ? parseInt(e.target.value, 10) : null)} /></Field>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <Field label="Capa">
            <div className="space-y-2">
              {data.cover_url && (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={data.cover_url} alt="Capa" className="w-full rounded-md border" style={{ borderColor: "var(--raio-border-default)" }} />
              )}
              <div className="flex gap-2">
                <input className={cls} style={inputStyle} placeholder="URL da capa"
                  value={data.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} />
                <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                </Button>
                <input ref={coverInputRef} type="file" accept="image/*" hidden
                  onChange={(e) => e.target.files?.[0] && uploadFile("cover", e.target.files[0])} />
              </div>
              {uploadProgress.cover !== undefined && (
                <UploadProgressBar pct={uploadProgress.cover} />
              )}
            </div>
          </Field>

          <Field label="Segmentos (público-alvo)">
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTS.map((seg) => (
                <button key={seg} onClick={() => toggleSegment(seg)}
                  className="px-2 py-1 text-xs rounded-full border"
                  style={{
                    background: data.segments.includes(seg) ? "var(--raio-accent-primary)" : "transparent",
                    color: data.segments.includes(seg) ? "#fff" : "var(--raio-text-secondary)",
                    borderColor: "var(--raio-border-default)",
                  }}>
                  {seg}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Interesses">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {data.interests.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full border flex items-center gap-1"
                  style={{ borderColor: "var(--raio-border-default)", color: "var(--raio-text-secondary)" }}>
                  {t}
                  <button onClick={() => removeTag(t, "interests")} className="text-red-500">×</button>
                </span>
              ))}
            </div>
            <input className={cls} style={inputStyle} value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(interestInput, "interests"))}
              placeholder="Pressione Enter para adicionar" />
          </Field>

          <Field label="Tags livres">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {data.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full border flex items-center gap-1"
                  style={{ borderColor: "var(--raio-border-default)", color: "var(--raio-text-secondary)" }}>
                  {t}
                  <button onClick={() => removeTag(t, "tags")} className="text-red-500">×</button>
                </span>
              ))}
            </div>
            <input className={cls} style={inputStyle} value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(tagInput, "tags"))}
              placeholder="Pressione Enter para adicionar" />
          </Field>

          <div className="flex items-center gap-2">
            <input id="premium-cb" type="checkbox" checked={data.is_premium}
              onChange={(e) => set("is_premium", e.target.checked)} />
            <label htmlFor="premium-cb" className="text-sm" style={{ color: "var(--raio-text-secondary)" }}>
              Conteúdo premium
            </label>
          </div>

          {data.is_premium && (
            <Field label="Preço (R$)">
              <input type="number" step="0.01" className={cls} style={inputStyle}
                value={data.price ?? 0} onChange={(e) => set("price", e.target.value as unknown as number)} />
            </Field>
          )}
        </aside>
      </div>

      {showPreview && (
        <div className="rounded-lg border p-6 mt-4"
          style={{ background: "var(--raio-bg-secondary)", borderColor: "var(--raio-border-default)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--raio-text-tertiary)" }}>Prévia (cliente):</p>
          <div className="flex gap-4">
            {data.cover_url && (
              <img src={data.cover_url} alt={data.title}
                className="w-32 h-32 object-cover rounded-md" />
            )}
            <div className="flex-1">
              <p className="text-xs uppercase mb-1" style={{ color: "var(--raio-accent-primary)" }}>{data.kind}</p>
              <h2 className="text-xl mb-1" style={{ fontWeight: 700, color: "var(--raio-text-primary)" }}>
                {data.title || "(sem título)"}
              </h2>
              <p style={{ color: "var(--raio-text-secondary)" }}>{data.short_description}</p>
              {data.media_url && (
                <p className="text-xs mt-2" style={{ color: "var(--raio-text-tertiary)" }}>
                  Mídia: {data.media_url}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function UploadProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2">
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--raio-bg-tertiary)" }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: "var(--raio-accent-primary)",
          }}
        />
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--raio-text-tertiary)" }}>
        Enviando... {pct}%
      </p>
    </div>
  );
}
