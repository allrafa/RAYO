import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner@2.0.3";

interface Lesson {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  duration: string | null;
  duration_seconds: number;
  video_url: string | null;
  content_type: string;
  sort_order: number;
  is_free_preview: boolean;
}

interface Module {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: Lesson[];
}

const cls = "w-full px-3 py-2 text-sm rounded-md border outline-none";
const inputStyle = {
  background: "var(--rayo-sand-100)",
  borderColor: "var(--rayo-sand-300)",
  color: "var(--rayo-forest-900)",
} as const;

export function CourseModulesEditor({ courseId }: { courseId: number }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const res = await api.get<{ modules: Module[] }>(`/api/admin/cms/courses/${courseId}/modules`);
    if (res.data) setModules(res.data.modules);
    if (res.error) toast.error(res.error.message);
    setLoading(false);
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  async function addModule() {
    const title = prompt("Título do módulo:");
    if (!title?.trim()) return;
    const res = await api.post<{ module: Module }>(`/api/admin/cms/courses/${courseId}/modules`, {
      title: title.trim(),
      sort_order: modules.length + 1,
    });
    if (res.data) {
      setModules((m) => [...m, { ...res.data!.module, lessons: [] }]);
      toast.success("Módulo criado");
    } else if (res.error) {
      toast.error(res.error.message);
    }
  }

  async function renameModule(mod: Module) {
    const title = prompt("Novo título:", mod.title);
    if (!title?.trim() || title === mod.title) return;
    const res = await api.patch<{ module: Module }>(
      `/api/admin/cms/courses/${courseId}/modules/${mod.id}`,
      { title: title.trim() }
    );
    if (res.data) {
      setModules((all) => all.map((m) => m.id === mod.id ? { ...m, title: res.data!.module.title } : m));
    } else if (res.error) {
      toast.error(res.error.message);
    }
  }

  async function removeModule(mod: Module) {
    if (!confirm(`Remover o módulo "${mod.title}" e todas as suas lições?`)) return;
    const res = await api.delete(`/api/admin/cms/courses/${courseId}/modules/${mod.id}`);
    if (res.success) {
      setModules((all) => all.filter((m) => m.id !== mod.id));
      toast.success("Módulo removido");
    } else if (res.error) {
      toast.error(res.error.message);
    }
  }

  async function addLesson(mod: Module) {
    const title = prompt("Título da lição:");
    if (!title?.trim()) return;
    const res = await api.post<{ lesson: Lesson }>(
      `/api/admin/cms/courses/${courseId}/modules/${mod.id}/lessons`,
      { title: title.trim(), sort_order: mod.lessons.length + 1, content_type: "video" }
    );
    if (res.data) {
      setModules((all) => all.map((m) => m.id === mod.id
        ? { ...m, lessons: [...m.lessons, res.data!.lesson] } : m));
      toast.success("Lição criada");
    } else if (res.error) {
      toast.error(res.error.message);
    }
  }

  async function updateLesson(mod: Module, lesson: Lesson, patch: Partial<Lesson>) {
    const res = await api.patch<{ lesson: Lesson }>(
      `/api/admin/cms/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`,
      patch
    );
    if (res.data) {
      setModules((all) => all.map((m) => m.id === mod.id
        ? { ...m, lessons: m.lessons.map((l) => l.id === lesson.id ? res.data!.lesson : l) } : m));
    } else if (res.error) {
      toast.error(res.error.message);
    }
  }

  async function removeLesson(mod: Module, lesson: Lesson) {
    if (!confirm(`Remover a lição "${lesson.title}"?`)) return;
    const res = await api.delete(`/api/admin/cms/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`);
    if (res.success) {
      setModules((all) => all.map((m) => m.id === mod.id
        ? { ...m, lessons: m.lessons.filter((l) => l.id !== lesson.id) } : m));
    } else if (res.error) {
      toast.error(res.error.message);
    }
  }

  return (
    <div
      className="rounded-md border p-4 space-y-3"
      style={{ background: "var(--rayo-sand-50)", borderColor: "var(--rayo-sand-300)" }}
    >
      <div className="flex items-center justify-between">
        <h3 style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}>Módulos &amp; Lições</h3>
        <Button size="sm" variant="outline" onClick={addModule}>
          <Plus className="w-4 h-4 mr-1" /> Módulo
        </Button>
      </div>

      {loading && <Loader2 className="w-4 h-4 animate-spin" />}

      {!loading && modules.length === 0 && (
        <p className="text-sm" style={{ color: "var(--rayo-ink-400)" }}>
          Nenhum módulo ainda. Adicione o primeiro para estruturar o curso.
        </p>
      )}

      <div className="space-y-3">
        {modules.map((mod) => (
          <div key={mod.id} className="p-3 rounded-md border space-y-2"
            style={{ borderColor: "var(--rayo-sand-300)" }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-left flex-1 text-sm"
                style={{ fontWeight: 600, color: "var(--rayo-forest-900)" }}
                onClick={() => renameModule(mod)}
                title="Clique para renomear"
              >
                {mod.title}
              </button>
              <Button size="sm" variant="ghost" onClick={() => addLesson(mod)}>
                <Plus className="w-4 h-4 mr-1" /> Lição
              </Button>
              <Button size="sm" variant="ghost" onClick={() => removeModule(mod)}>
                <Trash2 className="w-4 h-4" style={{ color: "var(--rayo-terra-500)" }} />
              </Button>
            </div>

            {mod.lessons.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                Sem lições.
              </p>
            ) : (
              <div className="space-y-2">
                {mod.lessons.map((lesson) => (
                  <div key={lesson.id} className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <input
                        className={cls} style={inputStyle} value={lesson.title}
                        onChange={(e) => updateLesson(mod, lesson, { title: e.target.value })}
                      />
                      <select
                        className="px-2 py-2 text-sm rounded-md border" style={inputStyle}
                        value={lesson.content_type}
                        onChange={(e) => updateLesson(mod, lesson, { content_type: e.target.value })}
                      >
                        <option value="video">Vídeo</option>
                        <option value="audio">Áudio</option>
                        <option value="text">Texto</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => removeLesson(mod, lesson)}>
                        <Trash2 className="w-4 h-4" style={{ color: "var(--rayo-terra-500)" }} />
                      </Button>
                    </div>
                    <input
                      className={cls} style={inputStyle}
                      placeholder="URL do vídeo / áudio (opcional)"
                      value={lesson.video_url ?? ""}
                      onChange={(e) => updateLesson(mod, lesson, { video_url: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
