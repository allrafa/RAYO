// ============================================================================
// 🎓 RAYO — TurmaShell (mini-Skool)
// Container de uma turma matriculada com 4 tabs: Aulas, Comunidade, Membros,
// Sobre. Quando o usuário NÃO é membro, mostra direto a TurmaLandingPage
// com o modal "Em breve" pra capturar interesse (sem checkout — Task #99).
// ============================================================================

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, MessageSquare, UsersRound, Info, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { useApp } from "../AppContext";
import { useAuth } from "../AuthContext";
import { CourseDetailPage } from "../CourseDetailPage";
import { TurmaLandingPage, type TurmaLanding } from "./TurmaLandingPage";
import { TurmaCommunityTab } from "./TurmaCommunityTab";
import { TurmaMembersTab } from "./TurmaMembersTab";
import { TrailPaywall } from "../trilhas/TrailPaywall";
import { CourseReviewCard } from "./CourseReviewCard";

type TurmaTab = "aulas" | "comunidade" | "membros" | "sobre";

export function TurmaShell() {
  const { currentCourseId, setIsInCourseDetail, setCurrentCourseId } = useApp();
  const { user } = useAuth();
  const turmaId = currentCourseId ? Number(currentCourseId) : null;

  const [tab, setTab] = useState<TurmaTab>("aulas");
  const [landing, setLanding] = useState<TurmaLanding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!turmaId) return;
    let cancel = false;
    setLoading(true);
    // Task #102 — quando o sino estaciona um post pendente
    // (`raio-pending-post`), o usuário veio de uma notificação
    // class_post — abre direto na aba Comunidade pra que o
    // TurmaCommunityTab consuma o stash e role/destaque o post alvo.
    let pendingPost = false;
    try {
      pendingPost = !!sessionStorage.getItem("raio-pending-post");
    } catch {
      pendingPost = false;
    }
    api.get<{ turma: TurmaLanding }>(`/api/turmas/${turmaId}/landing`).then((res) => {
      if (cancel) return;
      if (res.success && res.data) {
        setLanding(res.data.turma);
        if (!res.data.turma.is_member) setTab("sobre");
        else if (pendingPost) setTab("comunidade");
      }
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [turmaId]);

  // Task #102 — quando o usuário JÁ está dentro da mesma TurmaShell e
  // clica numa notificação class_post, `turmaId` não muda, então o
  // useEffect acima não dispara. NotificationBell publica esse evento
  // pra forçar a troca pra aba Comunidade nesse cenário (e também
  // quando o usuário volta pra mesma turma sem refresh). O highlight
  // do post alvo é coberto por listener equivalente em TurmaCommunityTab.
  useEffect(() => {
    const onOpenPost = (e: Event) => {
      const detail = (e as CustomEvent<{ turmaId: number; postId: number }>).detail;
      if (!detail || detail.turmaId !== turmaId) return;
      setTab("comunidade");
    };
    window.addEventListener("rayo:open-turma-post", onOpenPost);
    return () => window.removeEventListener("rayo:open-turma-post", onOpenPost);
  }, [turmaId]);

  const back = () => {
    setIsInCourseDetail(false);
    setCurrentCourseId(null);
  };

  if (!turmaId) {
    return null;
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
      </div>
    );
  }
  if (!landing) {
    return (
      <TurmaLandingPage
        turmaId={turmaId}
        onBack={back}
        defaultName={user?.name}
        defaultEmail={user?.email}
      />
    );
  }

  // Task #130 — turma vinculada a trilha paga + viewer sem assinatura ativa
  // ⇒ render <TrailPaywall> direto (em vez do fluxo "interesse"/landing),
  // pra deixar claro que a entrada é via assinatura.
  if (!landing.is_member && landing.trail_id && !landing.has_trail_access) {
    return (
      <div className="min-h-screen" style={{ background: "var(--rayo-sand-100)" }}>
        <div
          className="sticky top-0 z-40 px-4 py-3"
          style={{ background: "var(--rayo-sand-100)", borderBottom: "1px solid var(--rayo-sand-300)" }}
        >
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={back}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Turmas
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">Turma</div>
              <div className="font-display font-bold truncate">{landing.title}</div>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <TrailPaywall trailId={landing.trail_id} variant="block" />
        </div>
      </div>
    );
  }

  // Não-membro → landing pura (com modal "Em breve" embutido).
  if (!landing.is_member) {
    return (
      <TurmaLandingPage
        turmaId={turmaId}
        onBack={back}
        defaultName={user?.name}
        defaultEmail={user?.email}
      />
    );
  }

  // Membro → shell com tabs.
  return (
    <div className="min-h-screen" style={{ background: "var(--rayo-sand-100)" }}>
      <div
        className="sticky top-0 z-40 px-4 py-3"
        style={{ background: "var(--rayo-sand-100)", borderBottom: "1px solid var(--rayo-sand-300)" }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={back}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Turmas
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground truncate">Turma</div>
            <div className="font-display font-bold truncate">{landing.title}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto mt-3 flex gap-1 overflow-x-auto">
          <TabBtn active={tab === "aulas"} onClick={() => setTab("aulas")} icon={BookOpen} label="Aulas" />
          <TabBtn active={tab === "comunidade"} onClick={() => setTab("comunidade")} icon={MessageSquare} label="Comunidade" />
          <TabBtn active={tab === "membros"} onClick={() => setTab("membros")} icon={UsersRound} label={`Membros (${landing.members_count})`} />
          <TabBtn active={tab === "sobre"} onClick={() => setTab("sobre")} icon={Info} label="Sobre" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {tab === "aulas" && (
          <>
            {/* Task #152 — CTA "Avaliar este curso" pra alunos elegíveis
                (matriculado + ≥1 lição concluída). Quando já avaliaram, o
                componente mostra a nota atual com botão "Editar". */}
            {landing.can_review ? (
              <div className="px-4 pt-4">
                <CourseReviewCard
                  courseId={turmaId}
                  existingReview={landing.viewer_review ?? null}
                  onUpdated={(next) =>
                    setLanding((prev) =>
                      prev ? { ...prev, viewer_review: next } : prev,
                    )
                  }
                  onDeleted={() =>
                    setLanding((prev) =>
                      prev ? { ...prev, viewer_review: null } : prev,
                    )
                  }
                />
              </div>
            ) : null}
            <CourseDetailPage courseId={turmaId} onBack={back} />
          </>
        )}
        {tab === "comunidade" && <TurmaCommunityTab classId={turmaId} />}
        {tab === "membros" && <TurmaMembersTab classId={turmaId} />}
        {tab === "sobre" && (
          <TurmaLandingPage
            turmaId={turmaId}
            onBack={back}
            embedded
            defaultName={user?.name}
            defaultEmail={user?.email}
            onEnterTurma={() => setTab("aulas")}
          />
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap rounded-t-md transition-colors"
      style={{
        fontWeight: active ? 700 : 500,
        borderBottom: active ? "2px solid var(--rayo-terra-500)" : "2px solid transparent",
        color: active ? "var(--rayo-terra-500)" : "var(--rayo-ink-400)",
      }}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
