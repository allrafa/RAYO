import { useEffect, useRef } from "react";
import { RayoVideoPlayer } from "./RayoVideoPlayer";
import { api } from "../lib/api";

// Player de aula (LAUNCH_PLAN.md B2). Três modos, decididos pelo shape que
// o backend devolve em GET /api/courses/:id:
//   1) `video_embed_url` (sentinel bunny:// resolvido no servidor) → iframe
//      Bunny via RayoVideoPlayer.
//   2) `video_url` de arquivo direto (mp4/webm/mp3…) → <video> nativo com
//      rastreamento de tempo: envia progress_seconds periodicamente e
//      auto-conclui ao assistir ≥90% ou terminar.
//   3) `video_url` de YouTube/Vimeo → iframe via RayoVideoPlayer (sem
//      rastreamento — o embed não expõe tempo sem SDK; conclusão fica no
//      botão "Concluir").
// Sem mídia → estado honesto "Conteúdo em produção" do RayoVideoPlayer.

export interface PlayableLesson {
  id: number;
  title: string;
  duration_seconds?: number | null;
  content_type?: string | null;
  video_url?: string | null;
  video_embed_url?: string | null;
  video_thumbnail_url?: string | null;
}

const DIRECT_FILE_RE = /\.(mp4|webm|m4v|mov|mp3|m4a|ogg|wav)(\?.*)?$/i;
const PROGRESS_INTERVAL_MS = 30_000;
const AUTO_COMPLETE_RATIO = 0.9;

interface LessonPlayerProps {
  lesson: PlayableLesson;
  isCompleted: boolean;
  coverUrl?: string | null;
  onAutoComplete: (lessonId: number) => void;
}

export function LessonPlayer({ lesson, isCompleted, coverUrl, onAutoComplete }: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSentRef = useRef(0);
  const autoCompletedRef = useRef(false);

  // Ao abrir uma aula ainda não concluída, registra "in_progress" — é o que
  // faz o "Continuar Curso" saber onde o aluno parou (last_lesson_id).
  useEffect(() => {
    autoCompletedRef.current = false;
    lastSentRef.current = 0;
    if (!isCompleted) {
      void api.patch(`/api/courses/lessons/${lesson.id}/progress`, { status: "in_progress" });
    }
    // Dispara só na troca de aula — isCompleted mudar depois não deve reenviar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const isDirectFile = !!lesson.video_url && DIRECT_FILE_RE.test(lesson.video_url);

  const maybeAutoComplete = (current: number, duration: number) => {
    if (autoCompletedRef.current || isCompleted) return;
    if (duration > 0 && current / duration >= AUTO_COMPLETE_RATIO) {
      autoCompletedRef.current = true;
      onAutoComplete(lesson.id);
    }
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    maybeAutoComplete(el.currentTime, el.duration || lesson.duration_seconds || 0);
    const now = Date.now();
    if (!isCompleted && !autoCompletedRef.current && now - lastSentRef.current >= PROGRESS_INTERVAL_MS) {
      lastSentRef.current = now;
      void api.patch(`/api/courses/lessons/${lesson.id}/progress`, {
        status: "in_progress",
        progress_seconds: Math.floor(el.currentTime),
      });
    }
  };

  const handleEnded = () => {
    if (!autoCompletedRef.current && !isCompleted) {
      autoCompletedRef.current = true;
      onAutoComplete(lesson.id);
    }
  };

  if (isDirectFile) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <video
          key={lesson.id}
          ref={videoRef}
          src={lesson.video_url!}
          poster={lesson.video_thumbnail_url || coverUrl || undefined}
          controls
          preload="metadata"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <RayoVideoPlayer
      key={lesson.id}
      title={lesson.title}
      cover_url={lesson.video_thumbnail_url || coverUrl}
      video_provider={lesson.video_embed_url ? "bunny" : null}
      video_status={lesson.video_embed_url ? "ready" : null}
      video_embed_url={lesson.video_embed_url}
      video_thumbnail_url={lesson.video_thumbnail_url}
      external_url={lesson.video_url}
      kind={lesson.content_type === "audio" ? "audio" : null}
    />
  );
}
