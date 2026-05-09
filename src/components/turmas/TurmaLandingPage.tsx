import { useEffect, useState } from "react";
import { ArrowLeft, Users, Star, Clock, BookOpen, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { JoinInterestModal } from "./JoinInterestModal";

export interface TurmaLanding {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  hero_cover_url: string | null;
  duration: string | null;
  total_lessons: number | null;
  rating: number | null;
  students: number | null;
  price: number | null;
  category: string | null;
  life_context: string | null;
  level: string | null;
  is_premium: boolean;
  instructor: string | null;
  who_for: string[] | null;
  what_you_get: string[] | null;
  how_it_works: string | null;
  members_count: number;
  is_member: boolean;
}

interface TurmaLandingPageProps {
  turmaId: number;
  onBack: () => void;
  /** Quando dado, o fluxo de "Em breve" é trocado por uma matrícula real
   *  (usado quando a turma já foi liberada — fora do escopo dessa task). */
  onEnroll?: () => void;
  /** Render embutido (sem header/back) — usado pela tab "Sobre" do TurmaShell. */
  embedded?: boolean;
  /** Task #99 — pré-preenche o JoinInterestModal pra usuário logado. Vem de
   *  caller que tem AuthContext (ex.: TurmaShell). Anônimo passa undefined. */
  defaultName?: string;
  defaultEmail?: string;
  /** Task #99 — quando o usuário JÁ é membro da turma, troca a CTA de
   *  "Garantir minha vaga" pra "Entrar na turma" e dispara este callback
   *  (TurmaShell muda o tab pra "Aulas"). */
  onEnterTurma?: () => void;
}

export function TurmaLandingPage({
  turmaId,
  onBack,
  embedded = false,
  defaultName,
  defaultEmail,
  onEnterTurma,
}: TurmaLandingPageProps) {
  const [turma, setTurma] = useState<TurmaLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInterest, setShowInterest] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.get<{ turma: TurmaLanding }>(`/api/turmas/${turmaId}/landing`).then((res) => {
      if (cancel) return;
      if (!res.success || !res.data) {
        setError(res.error?.message || "Turma não encontrada");
      } else {
        setTurma(res.data.turma);
      }
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [turmaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--rayo-terra-500)" }} />
      </div>
    );
  }
  if (error || !turma) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center">
        <h2 className="font-display text-xl font-bold mb-2">Turma não encontrada</h2>
        <p className="text-muted-foreground mb-4">{error || "Não consegui carregar essa turma."}</p>
        {!embedded && (
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        )}
      </div>
    );
  }

  const cover = turma.hero_cover_url || turma.thumbnail;
  const whoFor = Array.isArray(turma.who_for) ? turma.who_for : [];
  const whatYouGet = Array.isArray(turma.what_you_get) ? turma.what_you_get : [];

  return (
    <div className={embedded ? "" : "min-h-screen"} style={{ background: embedded ? "transparent" : "var(--rayo-sand-100)" }}>
      {!embedded && (
        <div
          className="sticky top-0 z-40 px-4 py-3 flex items-center gap-2"
          style={{ background: "var(--rayo-sand-100)", borderBottom: "1px solid var(--rayo-sand-300)" }}
        >
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* HERO */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div
            className="rounded-2xl overflow-hidden aspect-video relative"
            style={{ background: "var(--rayo-sand-200)" }}
          >
            {cover ? (
              <ImageWithFallback src={cover} alt={turma.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                <BookOpen className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            {turma.category && (
              <Badge variant="secondary" className="uppercase text-xs">
                {turma.category}
              </Badge>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">{turma.title}</h1>
            {turma.subtitle && <p className="text-lg text-muted-foreground">{turma.subtitle}</p>}

            <div className="flex flex-wrap gap-3 text-sm pt-1">
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4" /> {turma.members_count} {turma.members_count === 1 ? "membro" : "membros"}
              </span>
              {turma.rating ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="w-4 h-4" style={{ color: "#f5a524" }} /> {Number(turma.rating).toFixed(1)}
                </span>
              ) : null}
              {turma.duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {turma.duration}
                </span>
              )}
              {turma.total_lessons ? (
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> {turma.total_lessons} aulas
                </span>
              ) : null}
            </div>

            {!embedded && (
              <div className="pt-4 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold" style={{ color: "var(--rayo-terra-600)" }}>
                    {turma.price && turma.price > 0
                      ? `R$ ${Number(turma.price).toFixed(2).replace(".", ",")}`
                      : "Em breve"}
                  </span>
                </div>
                {turma.is_member && onEnterTurma ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={onEnterTurma}
                      style={{ background: "var(--rayo-terra-500)", color: "white" }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" /> Entrar na turma
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Você já está matriculado nessa turma.
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={() => setShowInterest(true)}
                      style={{ background: "var(--rayo-terra-500)", color: "white" }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Garantir minha vaga
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Sem checkout agora. Avisamos por e-mail quando abrir.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DESCRIÇÃO */}
        {turma.description && (
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Sobre essa turma</h2>
            <p className="whitespace-pre-line text-muted-foreground">{turma.description}</p>
          </section>
        )}

        {/* PARA QUEM É */}
        {whoFor.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Para quem é</h2>
            <ul className="space-y-2">
              {whoFor.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--rayo-terra-500)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* O QUE VOCÊ RECEBE */}
        {whatYouGet.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">O que você recebe</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {whatYouGet.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ background: "var(--rayo-sand-200)" }}
                >
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--rayo-terra-500)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* COMO FUNCIONA */}
        {turma.how_it_works && (
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Como funciona</h2>
            <p className="whitespace-pre-line text-muted-foreground">{turma.how_it_works}</p>
          </section>
        )}

        {/* CTA repetido no fim */}
        {!embedded && !(turma.is_member && onEnterTurma) && (
          <div className="text-center py-6">
            <Button
              size="lg"
              onClick={() => setShowInterest(true)}
              style={{ background: "var(--rayo-terra-500)", color: "white" }}
            >
              <Sparkles className="w-4 h-4 mr-2" /> Garantir minha vaga
            </Button>
          </div>
        )}
      </div>

      <JoinInterestModal
        open={showInterest}
        onClose={() => setShowInterest(false)}
        turmaId={turma.id}
        turmaTitle={turma.title}
        defaultName={defaultName}
        defaultEmail={defaultEmail}
      />
    </div>
  );
}
