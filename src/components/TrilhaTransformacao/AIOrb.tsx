import { useState, useEffect } from 'react';
import { Camera, Mic, MicOff, MoreHorizontal, X, PhoneOff } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface AIOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  audioLevel?: number; // 0-100 para animar com base no volume
  transcriptionText?: string;
  consultant?: 'jessica' | 'rafa';
  onMicToggle?: () => void;
  onClose?: () => void;
  onMoreOptions?: () => void;
  isMuted?: boolean;
}

export function AIOrb({
  isListening = false,
  isSpeaking = false,
  isProcessing = false,
  audioLevel = 0,
  transcriptionText = "",
  consultant = 'jessica',
  onMicToggle,
  onClose,
  onMoreOptions,
  isMuted = false
}: AIOrbProps) {
  const [currentText, setCurrentText] = useState("");
  const [displayText, setDisplayText] = useState("");

  // Simulação de digitação em tempo real
  useEffect(() => {
    if (transcriptionText !== currentText) {
      setCurrentText(transcriptionText);
      
      // Simular digitação character por character
      let index = 0;
      const interval = setInterval(() => {
        setDisplayText(transcriptionText.slice(0, index + 1));
        index++;
        
        if (index >= transcriptionText.length) {
          clearInterval(interval);
        }
      }, 30); // Velocidade da digitação

      return () => clearInterval(interval);
    }
  }, [transcriptionText, currentText]);

  // Cores e estilos baseados no consultant
  const consultantStyles = {
    jessica: {
      gradient: "from-lime-400 via-green-400 to-emerald-400",
      pulseColor: "shadow-lime-500/50",
      activeColor: "from-lime-300 via-green-300 to-emerald-300"
    },
    rafa: {
      gradient: "from-green-500 via-emerald-400 to-teal-400", 
      pulseColor: "shadow-green-500/50",
      activeColor: "from-green-400 via-emerald-300 to-teal-300"
    }
  };

  const styles = consultantStyles[consultant];

  // Estado do orbe baseado na atividade
  const getOrbState = () => {
    if (isProcessing) return 'processing';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return 'idle';
  };

  const orbState = getOrbState();

  // Calcular escala baseada no áudio
  const audioScale = isListening || isSpeaking 
    ? 1 + (audioLevel / 100) * 0.3 
    : 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900 flex flex-col">
      {/* Header minimalista com apenas o nome do consultor */}
      <div className="flex items-center justify-center p-4 text-white/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {consultant === 'jessica' ? 'Jessica Raio' : 'Rafa Raio'}
          </span>
        </div>
      </div>

      {/* Main orb area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Orbe principal */}
        <div className="relative mb-12">
          {/* Ondas concêntricas (quando falando) */}
          {(isSpeaking || isListening) && (
            <>
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping",
                `bg-gradient-to-r ${styles.gradient}`,
                "opacity-20 scale-110"
              )} />
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping",
                `bg-gradient-to-r ${styles.gradient}`,
                "opacity-10 scale-125",
                "animation-delay-200"
              )} />
            </>
          )}
          
          {/* Orbe principal */}
          <div
            className={cn(
              "w-32 h-32 rounded-full relative transition-all duration-300",
              `bg-gradient-to-r ${isSpeaking || isListening ? styles.activeColor : styles.gradient}`,
              orbState === 'processing' && "animate-spin",
              orbState === 'listening' && "animate-pulse",
              styles.pulseColor
            )}
            style={{
              transform: `scale(${audioScale})`,
              filter: `blur(${isProcessing ? '1px' : '0px'})`,
              boxShadow: isSpeaking || isListening 
                ? `0 0 30px ${consultant === 'jessica' ? '#ec4899' : '#06b6d4'}40` 
                : 'none'
            }}
          >
            {/* Brilho interno */}
            <div className="absolute inset-2 rounded-full bg-white/20 blur-sm" />
            
            {/* Reflexo */}
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/40 blur-sm" />
            
            {/* Indicador de processamento */}
            {isProcessing && (
              <div className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
          </div>
        </div>

        {/* Área de transcrição */}
        <div className="max-w-sm w-full mb-8">
          {displayText && (
            <div className="text-white text-center leading-relaxed">
              <p className="text-lg">
                {displayText}
                {/* Cursor piscando durante digitação */}
                {displayText.length < transcriptionText.length && (
                  <span className="animate-pulse">|</span>
                )}
              </p>
            </div>
          )}
          
          {/* Indicador de escuta quando não há texto */}
          {!displayText && isListening && (
            <div className="text-white/60 text-center">
              <p className="text-sm">Estou ouvindo...</p>
            </div>
          )}
          
          {/* Indicador de processamento */}
          {!displayText && isProcessing && (
            <div className="text-white/60 text-center">
              <p className="text-sm">Pensando...</p>
            </div>
          )}
        </div>
      </div>

      {/* Controles inferiores - apenas 3 botões essenciais */}
      <div className="p-6 pb-8">
        <div className="flex items-center justify-center gap-8">
          {/* Botão Câmera/Foto - equivalente aos 3 pontinhos do ChatGPT */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoreOptions}
            className="w-14 h-14 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white/70 hover:text-white border border-gray-700/50 hover:border-gray-600"
          >
            <Camera className="w-6 h-6" />
          </Button>
          
          {/* Botão Microfone - principal */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMicToggle}
            className={cn(
              "w-16 h-16 rounded-full text-white border-2 transition-all duration-200",
              isMuted 
                ? "bg-red-600/90 hover:bg-red-500 border-red-400 shadow-lg shadow-red-600/30" 
                : "bg-blue-600/90 hover:bg-blue-500 border-blue-400 shadow-lg shadow-blue-600/30"
            )}
          >
            {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </Button>
          
          {/* Botão Finalizar */}
          <Button
            variant="ghost"
            size="icon" 
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-gray-800/80 hover:bg-red-600 text-white/70 hover:text-white border border-gray-700/50 hover:border-red-500 transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
        
        {/* Labels dos botões */}
        <div className="flex items-center justify-center gap-8 mt-3">
          <span className="text-xs text-white/40 w-14 text-center">Foto</span>
          <span className="text-xs text-white/40 w-16 text-center">
            {isListening ? 'Ouvindo' : isSpeaking ? 'Falando' : isProcessing ? 'Pensando' : 'Toque'}
          </span>
          <span className="text-xs text-white/40 w-14 text-center">Sair</span>
        </div>
      </div>
    </div>
  );
}