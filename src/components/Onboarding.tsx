import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, ArrowLeft, Star } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { enhancedToast } from "./EnhancedToast";

interface OnboardingProps {
  onComplete: (userData: any) => void;
}

const segments = [
  {
    id: "solteiro",
    title: "Solteiro",
    description: "Preparando-se para encontrar alguém especial",
    emoji: "✨",
  },
  {
    id: "namoro",
    title: "Namorando",
    description: "Construindo um relacionamento sólido",
    emoji: "💕",
  },
  {
    id: "noivos",
    title: "Noivos",
    description: "Preparando para o casamento",
    emoji: "💍",
  },
  {
    id: "casados",
    title: "Casados",
    description: "Fortalecendo a união matrimonial",
    emoji: "👫",
  },
  {
    id: "pais",
    title: "Pais",
    description: "Educando filhos com propósito",
    emoji: "👶",
  },
];

const interests = [
  { id: "relacionamento", label: "Relacionamento" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "financas", label: "Finanças" },
  { id: "intimidade", label: "Intimidade" },
  { id: "fe", label: "Fé & Espiritualidade" },
  { id: "familia", label: "Família" },
  { id: "saude", label: "Saúde & Bem-estar" },
  { id: "carreira", label: "Carreira" },
  { id: "educacao", label: "Educação" },
  { id: "parentalidade", label: "Parentalidade" },
  { id: "lideranca", label: "Liderança" },
  { id: "auto-conhecimento", label: "Auto-conhecimento" },
  { id: "proposito", label: "Propósito" },
  { id: "crescimento", label: "Crescimento Pessoal" },
];

const stepEyebrows: Record<number, { eyebrow: string; numeral: string }> = {
  1: { eyebrow: "PASSO 01 · IDENTIDADE", numeral: "01" },
  2: { eyebrow: "PASSO 02 · CONTEXTO", numeral: "02" },
  3: { eyebrow: "PASSO 03 · INTERESSES", numeral: "03" },
};

function StepHeader({
  step,
  title,
  italicWord,
  subtitle,
}: {
  step: number;
  title: string;
  italicWord?: string;
  subtitle: string;
}) {
  const meta = stepEyebrows[step];
  // Split title to italicize the trailing word for editorial feel
  const renderTitle = () => {
    if (!italicWord || !title.includes(italicWord)) {
      return title;
    }
    const [before, after] = title.split(italicWord);
    return (
      <>
        {before}
        <span style={{ fontStyle: "italic", color: "var(--raio-accent-hover)" }}>{italicWord}</span>
        {after}
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-10 relative"
    >
      {/* Editorial numeral watermark */}
      <span
        aria-hidden
        className="font-display-serif italic absolute left-1/2 -translate-x-1/2 select-none pointer-events-none"
        style={{
          top: "-48px",
          fontSize: "180px",
          lineHeight: 1,
          color: "var(--raio-text-primary)",
          opacity: 0.04,
          fontWeight: 400,
        }}
      >
        {meta.numeral}
      </span>

      {/* Eyebrow */}
      <div className="relative flex items-center justify-center gap-3 mb-5">
        <span className="block w-8 h-px bg-[var(--raio-text-primary)]/15" />
        <span
          className="text-[10px] tracking-[0.32em]"
          style={{ color: "var(--raio-text-secondary)", fontWeight: 500 }}
        >
          {meta.eyebrow}
        </span>
        <span className="block w-8 h-px bg-[var(--raio-text-primary)]/15" />
      </div>

      <h2
        className="font-display-serif relative"
        style={{
          fontSize: "clamp(34px, 5.5vw, 44px)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: "var(--raio-text-primary)",
          fontWeight: 400,
          marginBottom: "12px",
        }}
      >
        {renderTitle()}
      </h2>

      <p
        className="text-[15px] mx-auto max-w-[380px]"
        style={{ color: "var(--raio-text-strong)", lineHeight: 1.6, fontWeight: 400 }}
      >
        {subtitle}
      </p>
    </motion.div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: "var(--raio-text-primary)",
        color: "var(--raio-text-inverse)",
        border: "none",
        borderRadius: "14px",
        padding: "18px 32px",
        fontSize: "15px",
        fontWeight: 500,
        letterSpacing: "0.02em",
        cursor: "pointer",
        boxShadow:
          "0 1px 2px var(--raio-overlay-dark-medium), 0 8px 24px -10px var(--raio-accent-glow-medium)",
      }}
      whileHover={
        !disabled
          ? {
              scale: 1.015,
              boxShadow:
                "0 4px 12px var(--raio-overlay-dark-strong), 0 12px 32px -10px var(--raio-accent-glow-strong)",
            }
          : {}
      }
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--raio-accent-bright) 50%, transparent)",
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    name: "",
    segments: [] as string[],
    interests: [] as string[],
  });

  const totalSteps = 3;
  const currentProgress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleCompleteOnboarding();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCompleteOnboarding = () => {
    const completeUserData = {
      ...userData,
      level: 1,
      segments:
        userData.segments.length > 0 ? userData.segments : ["solteiro"],
    };
    enhancedToast.success({
      title: "Perfil criado! 🌟",
      description: "Sua jornada de transformação começa agora",
      haptic: true,
    });
    onComplete(completeUserData);
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return userData.name.trim().length > 0;
      case 2:
        return userData.segments.length > 0;
      case 3:
        return userData.interests.length >= 3;
      default:
        return false;
    }
  };

  const toggleSegment = (segmentId: string) => {
    setUserData((prev) => ({
      ...prev,
      segments: prev.segments.includes(segmentId)
        ? prev.segments.filter((s) => s !== segmentId)
        : [segmentId],
    }));
  };

  const toggleInterest = (interestId: string) => {
    setUserData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((i) => i !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.45, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="flex flex-col justify-center min-h-screen px-8 pt-24 pb-16"
          >
            <div className="max-w-[420px] mx-auto w-full">
              <StepHeader
                step={1}
                title="Como podemos te chamar?"
                italicWord="chamar"
                subtitle="Comece pelo seu nome — vamos personalizar sua experiência."
              />

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-7"
              >
                <div className="space-y-2.5">
                  <Label
                    htmlFor="name"
                    className="text-[10px] tracking-[0.24em] uppercase"
                    style={{ color: "var(--raio-text-secondary)", fontWeight: 600 }}
                  >
                    Seu nome
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome"
                    value={userData.name}
                    onChange={(e) =>
                      setUserData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="h-14 bg-white text-[var(--raio-text-primary)] placeholder:text-[var(--raio-text-secondary)] rounded-xl text-[16px] px-4"
                    style={{
                      border: "1px solid var(--raio-border-hover)",
                      boxShadow:
                        "inset 0 1px 0 var(--raio-bg-overlay-medium), 0 1px 2px var(--raio-overlay-dark-soft)",
                    }}
                    autoFocus
                  />
                </div>

                <div className="w-full max-w-[300px] mx-auto">
                  <PrimaryButton
                    onClick={handleNext}
                    disabled={!canContinue()}
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </PrimaryButton>
                </div>
              </motion.div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="segments"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.45, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="flex flex-col justify-center min-h-screen px-8 pt-24 pb-16"
          >
            <div className="max-w-[480px] mx-auto w-full">
              <StepHeader
                step={2}
                title="Qual seu contexto hoje?"
                italicWord="hoje"
                subtitle="Isso nos ajuda a personalizar o conteúdo para o seu momento de vida."
              />

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-3 mb-8"
              >
                {segments.map((segment, index) => {
                  const isSelected = userData.segments.includes(segment.id);
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <button
                        type="button"
                        className="w-full text-left transition-all duration-200 rounded-2xl p-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--raio-accent-hover)]/40"
                        style={{
                          background: "var(--raio-bg-secondary)",
                          border: isSelected
                            ? "1.5px solid var(--raio-accent-hover)"
                            : "1px solid var(--raio-border-default)",
                          boxShadow: isSelected
                            ? "0 6px 20px -8px var(--raio-accent-glow-medium), 0 0 0 4px var(--raio-accent-glow-amber-bright)"
                            : "0 1px 2px var(--raio-overlay-dark-soft)",
                        }}
                        onClick={() => toggleSegment(segment.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all"
                            style={{
                              background: isSelected ? "var(--raio-accent-bright)" : "var(--raio-bg-warm-soft)",
                              boxShadow: isSelected
                                ? "inset 0 1px 0 var(--raio-bg-overlay-soft)"
                                : "inset 0 1px 0 var(--raio-bg-overlay-medium)",
                            }}
                          >
                            {segment.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                color: "var(--raio-text-primary)",
                                marginBottom: "2px",
                              }}
                            >
                              {segment.title}
                            </h3>
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--raio-text-strong)",
                                lineHeight: 1.45,
                              }}
                            >
                              {segment.description}
                            </p>
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all"
                            style={{
                              background: isSelected ? "var(--raio-text-primary)" : "var(--raio-bg-warm-soft)",
                              border: isSelected
                                ? "none"
                                : "1px solid var(--raio-border-default)",
                            }}
                          >
                            {isSelected && (
                              <Check
                                className="w-4 h-4"
                                style={{ color: "var(--raio-accent-bright)" }}
                                strokeWidth={2.5}
                              />
                            )}
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="w-full max-w-[300px] mx-auto">
                <PrimaryButton onClick={handleNext} disabled={!canContinue()}>
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.45, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="flex flex-col min-h-screen px-8 pt-24 pb-16"
          >
            <div className="max-w-[480px] mx-auto w-full">
              <StepHeader
                step={3}
                title="O que faz seu coração bater?"
                italicWord="bater"
                subtitle="Escolha pelo menos 3 temas — você pode mudar depois."
              />

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-8"
              >
                <div className="flex flex-wrap gap-2 justify-center">
                  {interests.map((interest, index) => {
                    const isSelected = userData.interests.includes(interest.id);
                    return (
                      <motion.button
                        key={interest.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.02 * index }}
                        whileTap={{ scale: 0.96 }}
                        className="px-4 py-2.5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--raio-accent-hover)]/40"
                        style={{
                          background: isSelected ? "var(--raio-text-primary)" : "var(--raio-bg-secondary)",
                          color: isSelected ? "var(--raio-accent-bright)" : "var(--raio-text-deep)",
                          border: isSelected
                            ? "1px solid var(--raio-text-primary)"
                            : "1px solid var(--raio-border-hover)",
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "0.005em",
                          boxShadow: isSelected
                            ? "0 6px 16px -8px var(--raio-overlay-text-primary-soft)"
                            : "0 1px 2px var(--raio-overlay-dark-soft)",
                        }}
                        onClick={() => toggleInterest(interest.id)}
                        aria-pressed={isSelected}
                      >
                        {interest.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              <div className="space-y-4">
                {userData.interests.length < 3 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[13px] tracking-[0.04em]"
                    style={{ color: "var(--raio-text-secondary)" }}
                  >
                    Faltam <strong style={{ color: "var(--raio-accent-hover)", fontWeight: 600 }}>{3 - userData.interests.length}</strong>{" "}
                    para continuar
                  </motion.p>
                )}

                <div className="w-full max-w-[300px] mx-auto">
                  <PrimaryButton
                    onClick={handleNext}
                    disabled={!canContinue()}
                  >
                    {userData.interests.length >= 3
                      ? "Finalizar"
                      : `Selecione ${3 - userData.interests.length} ${3 - userData.interests.length === 1 ? "tema" : "temas"}`}
                    <Star className="w-4 h-4" />
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 50% 20%, var(--raio-bg-secondary) 0%, var(--raio-text-inverse) 55%, var(--raio-bg-warm-cream) 100%)",
      }}
    >
      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Top bar with progress */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 pt-6 pb-5"
        style={{
          background:
            "linear-gradient(180deg, var(--raio-bg-overlay-strong) 0%, var(--raio-bg-inverse-soft) 70%, var(--raio-bg-inverse-transparent) 100%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 hover:bg-[var(--raio-overlay-dark-soft)] rounded-lg transition-colors"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: "var(--raio-text-primary)" }} />
                </button>
              )}
            </div>
            <span
              className="text-[10px] tracking-[0.32em] uppercase"
              style={{ color: "var(--raio-text-secondary)", fontWeight: 600 }}
            >
              {String(step).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </span>
            <div className="w-9" />
          </div>

          {/* Stepped progress: 3 segments */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ background: "var(--raio-border-default)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      s <= step
                        ? "linear-gradient(90deg, var(--raio-accent-hover), var(--raio-accent-bright))"
                        : "transparent",
                  }}
                  initial={{ width: s < step ? "100%" : "0%" }}
                  animate={{ width: s <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
    </div>
  );
}
