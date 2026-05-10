import { useEffect, useState, useCallback } from "react";
import { Eye, EyeOff, Star, MessageSquare } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner@2.0.3";

interface ModerationReview {
  id: number;
  course_id: number;
  course_title: string;
  rating: number;
  comment: string | null;
  author_id: number;
  author_name: string;
  is_hidden: boolean;
  hidden_at: string | null;
  hidden_by: number | null;
  hidden_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseOption {
  id: number;
  title: string;
  reviews_count: number;
}

type Status = "all" | "visible" | "hidden";

function StatusBadge({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <span className="ra-tag ochre"><EyeOff className="w-3 h-3 mr-1 inline" /> Oculta</span>
  ) : (
    <span className="ra-tag sage"><Eye className="w-3 h-3 mr-1 inline" /> Visível</span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          style={{
            color: i < r ? "var(--rayo-ochre-500)" : "var(--rayo-ink-300)",
            fill: i < r ? "var(--rayo-ochre-500)" : "transparent",
          }}
        />
      ))}
    </span>
  );
}

export function AdminReviewsPage() {
  const [status, setStatus] = useState<Status>("visible");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [items, setItems] = useState<ModerationReview[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams({ status, limit: "50" });
    if (courseFilter !== "all") params.set("course_id", courseFilter);
    const res = await api.get<{ reviews: ModerationReview[] }>(
      `/api/admin/reviews?${params.toString()}`,
    );
    if (res.success && res.data) {
      setItems(res.data.reviews);
    } else {
      setErrorMsg(res.error?.message || "Erro ao carregar avaliações");
    }
    setLoading(false);
  }, [status, courseFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await api.get<{ courses: CourseOption[] }>("/api/admin/reviews/courses");
      if (res.success && res.data) setCourses(res.data.courses);
    })();
  }, []);

  const toggleHide = async (review: ModerationReview) => {
    setPendingId(review.id);
    const res = await api.post<{ id: number; is_hidden: boolean }>(
      `/api/courses/reviews/${review.id}/hide`,
      { hidden: !review.is_hidden },
    );
    setPendingId(null);
    if (res.success) {
      toast.success(review.is_hidden ? "Avaliação reexibida" : "Avaliação ocultada");
      void load();
    } else {
      toast.error(res.error?.message || "Erro ao atualizar avaliação");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl mb-1"
          style={{ color: "var(--rayo-forest-900)", fontWeight: 700 }}
        >
          Moderação de Avaliações
        </h2>
        <p className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
          Reveja avaliações de cursos e oculte conteúdo abusivo. Ocultar uma
          avaliação remove ela das telas públicas e recalcula a nota média do
          curso. A ação é reversível.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>Status:</span>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visible">Apenas visíveis</SelectItem>
              <SelectItem value="hidden">Apenas ocultas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>Curso:</span>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.title} ({c.reviews_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: "var(--rayo-ink-400)" }}>
          Carregando avaliações...
        </div>
      ) : errorMsg ? (
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--rayo-terra-100)", color: "var(--rayo-terra-700)" }}
        >
          {errorMsg}
        </div>
      ) : items.length === 0 ? (
        <div className="ra-empty">
          <div className="ra-empty-icon"><MessageSquare className="w-5 h-5" /></div>
          <p className="ra-empty-title">
            Nenhuma avaliação {status === "hidden" ? "oculta" : status === "visible" ? "visível" : ""} encontrada.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((review) => (
            <div key={review.id} className="ra-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge hidden={review.is_hidden} />
                    <Stars rating={review.rating} />
                    <span
                      className="text-xs"
                      style={{ color: "var(--rayo-ink-700)", fontWeight: 600 }}
                    >
                      {review.course_title}
                    </span>
                    <span className="text-xs" style={{ color: "var(--rayo-ink-400)" }}>
                      · {formatDate(review.updated_at)}
                    </span>
                  </div>
                  {review.comment ? (
                    <p
                      className="text-sm mt-1"
                      style={{ color: "var(--rayo-forest-900)", whiteSpace: "pre-wrap" }}
                    >
                      {review.comment}
                    </p>
                  ) : (
                    <p className="text-sm mt-1 italic" style={{ color: "var(--rayo-ink-400)" }}>
                      (sem comentário — apenas a nota)
                    </p>
                  )}
                  <div
                    className="mt-2 flex items-center gap-3 text-xs flex-wrap"
                    style={{ color: "var(--rayo-ink-400)" }}
                  >
                    <span>por {review.author_name}</span>
                    {review.is_hidden && review.hidden_at && (
                      <span>
                        · oculta em {formatDate(review.hidden_at)}
                        {review.hidden_by_name ? ` por ${review.hidden_by_name}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant={review.is_hidden ? "outline" : "destructive"}
                  size="sm"
                  disabled={pendingId === review.id}
                  onClick={() => void toggleHide(review)}
                >
                  {review.is_hidden ? (
                    <>
                      <Eye className="w-4 h-4 mr-1" /> Reexibir
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" /> Ocultar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
