import { useState, useEffect } from 'react';
import { AIOrb } from './AIOrb';
import { enhancedToast } from '../EnhancedToast';
import { CameraOptionsModal } from './CameraOptionsModal';
import { PlanCreationModal } from './PlanCreationModal';

interface TrilhaTransformacaoChatProps {
  onClose?: () => void;
  onOpenCentralConversas?: () => void;
}

export function TrilhaTransformacaoChat({ onClose, onOpenCentralConversas }: TrilhaTransformacaoChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [consultant] = useState<'jessica' | 'rafa'>('jessica');
  const [showCameraOptions, setShowCameraOptions] = useState(false);

  // Simulação de conversa para demonstração
  const demoMessages = [
    "Olá! Eu sou a Jessica Raio, sua consultora pessoal em relacionamentos.",
    "Estou aqui para te ajudar a transformar seu relacionamento de forma prática e efetiva.",
    "Me conta, qual é o seu maior desafio no relacionamento hoje?",
    "Entendo... Vejo que vocês estão enfrentando dificuldades de comunicação.",
    "Baseado no que você me contou, posso criar um plano personalizado para vocês. Gostaria que eu criasse esse plano?",
    "Perfeito! Vou organizar tudo que conversamos em um plano estruturado para você."
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showPlanCreation, setShowPlanCreation] = useState(false);
  const [conversationData, setConversationData] = useState({
    insights: [] as string[],
    challenges: [] as string[],
    goals: [] as string[]
  });

  // Simulação de animação de áudio
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 80 + 20); // 20-100
      }, 100);
      
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isSpeaking]);

  // Simulação de fluxo de conversa
  const startDemo = () => {
    if (currentMessageIndex >= demoMessages.length) {
      setCurrentMessageIndex(0);
    }

    setIsProcessing(true);
    setTranscriptionText("");
    
    setTimeout(() => {
      setIsProcessing(false);
      setIsSpeaking(true);
      const currentMessage = demoMessages[currentMessageIndex];
      setTranscriptionText(currentMessage);
      
      // Detectar se é o momento de oferecer criação de plano
      if (currentMessageIndex === 4) { // Mensagem sobre criar plano
        setTimeout(() => {
          setShowPlanCreation(true);
        }, currentMessage.length * 50 + 1000);
      }
      
      // Simular duração da fala
      setTimeout(() => {
        setIsSpeaking(false);
        setCurrentMessageIndex(prev => prev + 1);
      }, currentMessage.length * 50); // 50ms por caractere
    }, 1500);
  };

  const handleCreatePlan = (accepted: boolean) => {
    setShowPlanCreation(false);
    
    if (accepted) {
      // Simular criação do plano
      setIsProcessing(true);
      setTranscriptionText("");
      
      setTimeout(() => {
        setIsProcessing(false);
        setIsSpeaking(true);
        setTranscriptionText("Perfeito! Criei um plano personalizado baseado em nossa conversa. Você pode acessá-lo na Central de Conversas.");
        
        setTimeout(() => {
          setIsSpeaking(false);
          // Oferecer ir para Central de Conversas
          enhancedToast.success({
            title: "🎯 Plano Criado!",
            description: "Seu plano personalizado está pronto",
            haptic: true,
            action: {
              label: "Ver Plano",
              onClick: () => {
                if (onOpenCentralConversas) {
                  onOpenCentralConversas();
                }
              }
            }
          });
        }, 3000);
      }, 2000);
    } else {
      // Continuar conversa sem criar plano
      setIsSpeaking(true);
      setTranscriptionText("Sem problemas! Vamos continuar nossa conversa. Como posso te ajudar mais?");
      
      setTimeout(() => {
        setIsSpeaking(false);
      }, 2500);
    }
  };

  const handleMicToggle = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      // Quando desmutar, simular escuta
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        startDemo();
      }, 2000);
    } else {
      setIsListening(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleMoreOptions = () => {
    setShowCameraOptions(true);
  };

  const handleCameraOptionSelect = (option: 'camera' | 'gallery' | 'screen') => {
    const optionLabels = {
      camera: 'Foto capturada',
      gallery: 'Imagem selecionada', 
      screen: 'Tela compartilhada'
    };

    enhancedToast.success({
      title: `📷 ${optionLabels[option]}`,
      description: "Enviado para o consultor com sucesso",
      haptic: true
    });

    // Simular que o consultor responde à imagem
    setTimeout(() => {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsSpeaking(true);
        setTranscriptionText("Interessante! Vejo que você está mostrando isso. Vamos conversar sobre como isso se relaciona com sua situação familiar.");
        
        setTimeout(() => {
          setIsSpeaking(false);
        }, 4000);
      }, 1000);
    }, 2000);
  };

  // Auto-start demo
  useEffect(() => {
    const timer = setTimeout(startDemo, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-screen">
      <AIOrb
        isListening={isListening}
        isSpeaking={isSpeaking} 
        isProcessing={isProcessing}
        audioLevel={audioLevel}
        transcriptionText={transcriptionText}
        consultant={consultant}
        onMicToggle={handleMicToggle}
        onClose={handleClose}
        onMoreOptions={handleMoreOptions}
        isMuted={isMuted}
      />

      {/* Modal de opções da câmera */}
      <CameraOptionsModal
        open={showCameraOptions}
        onOpenChange={setShowCameraOptions}
        onOptionSelect={handleCameraOptionSelect}
      />

      {/* Modal de criação de plano */}
      <PlanCreationModal
        show={showPlanCreation}
        consultant={consultant}
        onAccept={() => handleCreatePlan(true)}
        onDecline={() => handleCreatePlan(false)}
      />
    </div>
  );
}