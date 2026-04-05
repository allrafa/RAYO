import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, 
  Check, 
  ArrowLeft,
  Star
} from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { enhancedToast } from "./EnhancedToast";

interface OnboardingProps {
  onComplete: (userData: any) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1); // Step 1 = Nome, Step 2 = Contexto, Step 3 = Interesses
  const [userData, setUserData] = useState({
    name: "",
    segments: [] as string[],
    interests: [] as string[],
  });

  const segments = [
    {
      id: "solteiro",
      title: "Solteiro",
      description: "Preparando-se para encontrar alguém especial",
      emoji: "✨"
    },
    {
      id: "namoro",
      title: "Namorando",
      description: "Construindo um relacionamento sólido",
      emoji: "💕"
    },
    {
      id: "noivos",
      title: "Noivos", 
      description: "Preparando para o casamento",
      emoji: "💍"
    },
    {
      id: "casados",
      title: "Casados",
      description: "Fortalecendo a união matrimonial",
      emoji: "👫"
    },
    {
      id: "pais",
      title: "Pais",
      description: "Educando filhos com propósito",
      emoji: "👶"
    }
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

  const totalSteps = 3;
  const currentProgress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCompleteOnboarding = () => {
    const completeUserData = {
      ...userData,
      level: 1,
      segments: userData.segments.length > 0 ? userData.segments : ["solteiro"]
    };
    
    enhancedToast.success({
      title: "Perfil criado! 🌟",
      description: "Sua jornada de transformação começa agora",
      haptic: true
    });
    
    onComplete(completeUserData);
  };

  const canContinue = () => {
    switch (step) {
      case 1: return userData.name.trim().length > 0;
      case 2: return userData.segments.length > 0;
      case 3: return userData.interests.length >= 3;
      default: return false;
    }
  };

  const toggleSegment = (segmentId: string) => {
    setUserData(prev => ({
      ...prev,
      segments: prev.segments.includes(segmentId)
        ? prev.segments.filter(s => s !== segmentId)
        : [segmentId]
    }));
  };

  const toggleInterest = (interestId: string) => {
    setUserData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col justify-center min-h-screen px-8"
          >
            <div className="max-w-[400px] mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h2 
                  className="text-[24px] tracking-tight mb-3"
                  style={{
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  Como podemos te chamar?
                </h2>
                <p 
                  className="text-[15px]"
                  style={{
                    color: '#6B7280',
                    lineHeight: 1.6,
                  }}
                >
                  Vamos personalizar sua experiência
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label 
                    htmlFor="name"
                    style={{
                      color: '#1A1A1A',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Seu nome
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Digite seu nome"
                    value={userData.name}
                    onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12 bg-white border-[#e5e5e5] text-[#1A1A1A] placeholder:text-[#9CA3AF] rounded-lg focus:border-[#FCD34D] focus:ring-1 focus:ring-[#FCD34D] text-[15px]"
                    style={{
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                    autoFocus
                  />
                </div>

                <div className="w-full max-w-[280px] mx-auto">
                  <motion.button
                    onClick={handleNext}
                    disabled={!canContinue()}
                    className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: '#1A1A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px 32px',
                      fontSize: '15px',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                    whileHover={canContinue() ? { 
                      scale: 1.02,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    } : {}}
                    whileTap={canContinue() ? { scale: 0.98 } : {}}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Continuar
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="segments"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col justify-center min-h-screen px-8 py-8"
          >
            <div className="max-w-[480px] mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h2 
                  className="text-[24px] tracking-tight mb-3"
                  style={{
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  Qual seu contexto atual?
                </h2>
                <p 
                  className="text-[15px]"
                  style={{
                    color: '#6B7280',
                    lineHeight: 1.6,
                  }}
                >
                  Isso nos ajuda a personalizar o conteúdo para você
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 mb-8"
              >
                {segments.map((segment, index) => {
                  const isSelected = userData.segments.includes(segment.id);
                  
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      <div
                        className="cursor-pointer transition-all duration-200 rounded-xl p-4"
                        style={{
                          background: isSelected ? '#FFFBEB' : '#FFFFFF',
                          border: `1px solid ${isSelected ? '#FCD34D' : '#E5E5E5'}`,
                          boxShadow: isSelected ? '0 2px 8px rgba(252, 211, 77, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}
                        onClick={() => toggleSegment(segment.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                            style={{
                              background: isSelected ? '#FEF3C7' : '#F5F5F5',
                            }}
                          >
                            {segment.emoji}
                          </div>
                          <div className="flex-1">
                            <h3 
                              className="mb-1"
                              style={{
                                fontSize: '15px',
                                fontWeight: 500,
                                color: '#1A1A1A',
                              }}
                            >
                              {segment.title}
                            </h3>
                            <p 
                              style={{
                                fontSize: '13px',
                                color: '#6B7280',
                              }}
                            >
                              {segment.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{
                                background: '#FCD34D',
                              }}
                            >
                              <Check className="w-4 h-4 text-[#1A1A1A]" />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="w-full max-w-[280px] mx-auto">
                <motion.button
                  onClick={handleNext}
                  disabled={!canContinue()}
                  className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: '#1A1A1A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '16px 32px',
                    fontSize: '15px',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                  whileHover={canContinue() ? { 
                    scale: 1.02,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  } : {}}
                  whileTap={canContinue() ? { scale: 0.98 } : {}}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col min-h-screen px-8 py-8"
          >
            <div className="max-w-[480px] mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h2 
                  className="text-[24px] tracking-tight mb-3"
                  style={{
                    fontWeight: 600,
                    color: '#1A1A1A',
                  }}
                >
                  Escolha seus interesses
                </h2>
                <p 
                  className="text-[15px]"
                  style={{
                    color: '#6B7280',
                    lineHeight: 1.6,
                  }}
                >
                  Selecione pelo menos 3 tópicos
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest, index) => {
                    const isSelected = userData.interests.includes(interest.id);
                    
                    return (
                      <motion.div
                        key={interest.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.02 * index }}
                      >
                        <button
                          className="px-4 py-2 rounded-full transition-all duration-200"
                          style={{
                            background: isSelected ? '#FCD34D' : '#FFFFFF',
                            color: isSelected ? '#1A1A1A' : '#6B7280',
                            border: `1px solid ${isSelected ? '#FCD34D' : '#E5E5E5'}`,
                            fontSize: '14px',
                            fontWeight: isSelected ? 500 : 400,
                            boxShadow: isSelected ? '0 2px 8px rgba(252, 211, 77, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                          }}
                          onClick={() => toggleInterest(interest.id)}
                        >
                          {interest.label}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Bottom section */}
              <div className="space-y-4">
                {userData.interests.length < 3 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                    style={{
                      fontSize: '14px',
                      color: '#6B7280',
                    }}
                  >
                    Selecione mais {3 - userData.interests.length} para continuar
                  </motion.p>
                )}
                
                <div className="w-full max-w-[280px] mx-auto">
                  <motion.button
                    onClick={handleNext}
                    disabled={!canContinue()}
                    className="relative w-full group overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: '#1A1A1A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px 32px',
                      fontSize: '15px',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                    whileHover={canContinue() ? { 
                      scale: 1.02,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    } : {}}
                    whileTap={canContinue() ? { scale: 0.98 } : {}}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {userData.interests.length >= 3 ? 'Finalizar' : `Selecione ${3 - userData.interests.length} mais`}
                      <Star className="w-4 h-4" />
                    </span>
                  </motion.button>
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
        background: '#FAFAFA',
      }}
    >
      {/* Subtle grain texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Progress indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 p-6"
        style={{
          background: 'linear-gradient(180deg, #FAFAFA 0%, rgba(250, 250, 250, 0.95) 80%, transparent 100%)',
        }}
      >
        <div className="max-w-[480px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            )}
            {step === 1 && <div className="w-9" />}
            <span 
              style={{
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: 500,
              }}
            >
              {step} de {totalSteps}
            </span>
          </div>
          <div 
            className="w-full rounded-full h-1"
            style={{
              background: '#E5E5E5',
            }}
          >
            <motion.div
              className="h-1 rounded-full"
              style={{
                background: '#FCD34D',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${currentProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
}
