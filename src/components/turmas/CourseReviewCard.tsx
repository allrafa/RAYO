// Task #152 — CTA inline pro aluno avaliar o curso (1-5★ + comentário
// opcional). Idempotente por user+course no backend; mostra estado de
// edição quando o aluno já avaliou.

import { useState } from "react";
import { Star, Loader2, CheckCircle2, Pencil, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { api } from "../../lib/api";
import { Button } from "../ui/button";

interface CourseReviewCardProps {
  courseId: number;
  existingReview:
    | { rating: number; comment: string | null; updated_at: string; is_hidden?: boolean }
    | null;
  onUpdated?: (next: { rating: number; comment: string | null; updated_at: string; is_hidden?: boolean }) => void;
  onDeleted?: () => void;
}

export function CourseReviewCard({ courseId, existingReview, onUpdated, onDeleted }: CourseReviewCardProps) {
  const [editing, setEditing] = useState(!existingReview);
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!existingReview) return;
    if (typeof window !== "undefined" && !window.confirm("Remover sua avaliação? Essa ação não pode ser desfeita.")) {
      return;
    }
    setDeleting(true);
    const res = await api.delete<{ summary: { average: number; total: number } }>(
      `/api/courses/${courseId}/review`,
    );
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error?.message || "Não consegui remover sua avaliação.");
      return;
    }
    toast.success("Avaliação removida.");
    setRating(0);
    setComment("");
    setEditing(true);
    onDeleted?.();
  };

  const submit = async () => {
    if (rating < 1 || rating > 5) {
      toast.error("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setSubmitting(true);
    const res = await api.post<{
      review: { rating: number; comment: string | null; updated_at: string };
      summary: { average: number; total: number };
    }>(`/api/courses/${courseId}/review`, { rating, comment: comment.trim() || null });
    setSubmitting(false);
    if (!res.success || !res.data) {
      toast.error(res.error?.message || "Não consegui registrar sua avaliação. Tente de novo.");
      return;
    }
    toast.success(existingReview ? "Avaliação atualizada!" : "Obrigado por avaliar!");
    setEditing(false);
    onUpdated?.(res.data.review);
  };

  // Estado "já avaliou e não está editando": mostra resumo + botão "Editar".
  if (!editing && existingReview) {
    return (
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{
          background: "var(--rayo-sand-50, #FFF8EC)",
          border: "1px solid var(--rayo-sand-300)",
        }}
      >
        <CheckCircle2
          className="w-5 h-5 mt-0.5 shrink-0"
          style={{ color: "var(--rayo-sage-500)" }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm" style={{ color: "var(--rayo-ink-700)" }}>
            Sua avaliação
          </div>
          <div className="flex items-center gap-1 mt-1" aria-label={`Sua nota: ${existingReview.rating} de 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className="w-4 h-4"
                style={{
                  fill: n <= existingReview.rating ? "#FFA500" : "transparent",
                  color: n <= existingReview.rating ? "#FFA500" : "var(--rayo-sand-400, #D9C8A6)",
                }}
              />
            ))}
          </div>
          {existingReview.comment ? (
            <p
              className="text-sm mt-2 whitespace-pre-wrap break-words"
              style={{ color: "var(--rayo-forest-900)" }}
            >
              {existingReview.comment}
            </p>
          ) : null}
          {existingReview.is_hidden ? (
            <p
              className="text-xs mt-2 inline-flex items-center gap-1 rounded px-2 py-0.5"
              style={{ background: "var(--rayo-sand-200, #F1E2C0)", color: "var(--rayo-ink-700)" }}
            >
              <EyeOff className="w-3 h-3" aria-hidden />
              Sua avaliação foi ocultada pela moderação e não aparece para outros alunos.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={deleting}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={deleting}
            style={{ color: "var(--rayo-terra-600, #B85A2E)" }}
            aria-label="Remover avaliação"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Remover
          </Button>
        </div>
      </div>
    );
  }

  // Estado "form aberto": cria ou atualiza.
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--rayo-sand-50, #FFF8EC)",
        border: "1px solid var(--rayo-sand-300)",
      }}
    >
      <div className="font-display font-bold" style={{ color: "var(--rayo-forest-900)" }}>
        {existingReview ? "Atualizar sua avaliação" : "Avaliar este curso"}
      </div>
      <p className="text-sm mt-1" style={{ color: "var(--rayo-ink-700)" }}>
        Sua nota ajuda outros alunos a escolherem.
      </p>

      <div
        className="flex items-center gap-1 mt-3"
        role="radiogroup"
        aria-label="Nota de 1 a 5 estrelas"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(0)}
              className="p-1 -m-1 rounded transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ outlineColor: "var(--rayo-terra-500)" }}
            >
              <Star
                className="w-7 h-7"
                style={{
                  fill: active ? "#FFA500" : "transparent",
                  color: active ? "#FFA500" : "var(--rayo-sand-400, #D9C8A6)",
                }}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Quer contar mais? (opcional)"
        rows={3}
        maxLength={1000}
        className="w-full mt-3 rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2"
        style={{
          background: "white",
          border: "1px solid var(--rayo-sand-300)",
          color: "var(--rayo-forest-900)",
          outlineColor: "var(--rayo-terra-500)",
        }}
      />
      <div className="text-[11px] text-right mt-1" style={{ color: "var(--rayo-ink-400)" }}>
        {comment.length}/1000
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        {existingReview ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRating(existingReview.rating);
              setComment(existingReview.comment ?? "");
              setEditing(false);
            }}
            disabled={submitting}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          onClick={submit}
          disabled={submitting || rating < 1}
          style={{ background: "var(--rayo-terra-500)", color: "white" }}
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {existingReview ? "Atualizar avaliação" : "Enviar avaliação"}
        </Button>
      </div>
    </div>
  );
}
